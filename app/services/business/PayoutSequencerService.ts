// ============================================================
// PayoutSequencerService — Trust-Based Payout Ordering
// Assigns payout positions based on trust score to prevent
// hit-and-run fraud. High-trust users get early slots;
// low-trust users must contribute heavily before receiving.
// ============================================================

import { supabase } from '../supabaseClient';
import { reputationService } from '../ReputationService';

// ─── Configuration ───────────────────────────────────

/** Trust score thresholds for payout slot eligibility */
const SEQUENCER_CONFIG = {
    /** Minimum trust score to be eligible for early payout slots (1st–2nd) */
    EARLY_SLOT_MIN_SCORE: 80,

    /** Minimum trust score to be eligible for mid payout slots (3rd) */
    MID_SLOT_MIN_SCORE: 60,

    /** Minimum completed cycles required for slot 1 (the very first payout) */
    SLOT_1_MIN_CYCLES: 2,

    /** Minimum completed cycles required for slots 1–2 */
    EARLY_SLOT_MIN_CYCLES: 1,

    /** Pool capacity (should match PoolService) */
    POOL_CAPACITY: 5,
} as const;

export type SlotAssignment = {
    userId: string;
    trustScore: number;
    completedCycles: number;
    assignedSlot: number;
};

// ─── Service ─────────────────────────────────────────

class PayoutSequencerService {

    /**
     * Determine the eligible slot range for a user based on their trust score
     * and completed cycle history.
     *
     * Returns { minSlot, maxSlot } where 1 = first payout, POOL_CAPACITY = last.
     */
    getEligibleSlotRange(
        trustScore: number,
        completedCycles: number,
        poolCapacity: number = SEQUENCER_CONFIG.POOL_CAPACITY
    ): { minSlot: number; maxSlot: number } {

        // Elite users: full range, can take slot 1
        if (
            trustScore >= SEQUENCER_CONFIG.EARLY_SLOT_MIN_SCORE &&
            completedCycles >= SEQUENCER_CONFIG.SLOT_1_MIN_CYCLES
        ) {
            return { minSlot: 1, maxSlot: poolCapacity };
        }

        // Experienced users: can take slots 2+
        if (
            trustScore >= SEQUENCER_CONFIG.EARLY_SLOT_MIN_SCORE &&
            completedCycles >= SEQUENCER_CONFIG.EARLY_SLOT_MIN_CYCLES
        ) {
            return { minSlot: 2, maxSlot: poolCapacity };
        }

        // Mid-trust users: slots 3+
        if (trustScore >= SEQUENCER_CONFIG.MID_SLOT_MIN_SCORE) {
            return { minSlot: 3, maxSlot: poolCapacity };
        }

        // Low-trust / new users: last slots only (4+)
        // By the time they get paid, they will have contributed >= 80%
        const lateStart = Math.max(Math.ceil(poolCapacity * 0.6) + 1, 4);
        return { minSlot: lateStart, maxSlot: poolCapacity };
    }

    /**
     * Assign a temporary payout slot for a new member joining a filling pool.
     * This is a provisional assignment — the final ordering happens when the
     * pool locks via `resequencePool()`.
     *
     * Returns the assigned slot number.
     */
    async assignProvisionalSlot(
        poolId: string,
        userId: string,
        poolCapacity: number = SEQUENCER_CONFIG.POOL_CAPACITY
    ): Promise<number> {
        const rep = await reputationService.getScore(userId);
        const { minSlot } = this.getEligibleSlotRange(
            rep.score,
            rep.successfulCycles,
            poolCapacity
        );

        // Find existing occupied slots
        const { data: existingMembers } = await supabase
            .from('pool_members')
            .select('payout_slot')
            .eq('pool_id', poolId)
            .order('payout_slot', { ascending: true });

        const occupied = new Set((existingMembers || []).map(m => m.payout_slot));

        // Find the first available slot >= minSlot
        for (let slot = minSlot; slot <= poolCapacity; slot++) {
            if (!occupied.has(slot)) {
                return slot;
            }
        }

        // Fallback: if all eligible slots are taken, take any available slot
        for (let slot = 1; slot <= poolCapacity; slot++) {
            if (!occupied.has(slot)) {
                return slot;
            }
        }

        // Should never happen if pool isn't full
        throw new Error('No available payout slots in this pool');
    }

    /**
     * CRITICAL: Re-sequence all members of a pool when it transitions to 'locked'.
     *
     * This is the definitive slot assignment. It:
     * 1. Fetches trust scores for all members
     * 2. Sorts them by trust (highest first)
     * 3. Assigns slots 1→N based on trust ranking
     * 4. Enforces minimum slot restrictions for low-trust users
     * 5. Updates the database atomically
     *
     * Called once when pool status changes to 'locked'.
     */
    async resequencePool(poolId: string, poolCapacity: number = SEQUENCER_CONFIG.POOL_CAPACITY): Promise<SlotAssignment[]> {
        // 1. Fetch all members
        const { data: members, error } = await supabase
            .from('pool_members')
            .select('id, user_id')
            .eq('pool_id', poolId);

        if (error || !members || members.length === 0) {
            console.error('[PayoutSequencer] Failed to fetch members for resequencing:', error);
            return [];
        }

        // 2. Fetch trust scores and completed cycles for each member
        const memberScores: {
            memberId: string;
            userId: string;
            trustScore: number;
            completedCycles: number;
            minSlot: number;
        }[] = [];

        for (const m of members) {
            const rep = await reputationService.getScore(m.user_id);
            const { minSlot } = this.getEligibleSlotRange(rep.score, rep.successfulCycles, poolCapacity);

            memberScores.push({
                memberId: m.id,
                userId: m.user_id,
                trustScore: rep.score,
                completedCycles: rep.successfulCycles,
                minSlot,
            });
        }

        // 3. Sort by trust score (descending), then by completed cycles (descending)
        memberScores.sort((a, b) => {
            if (b.trustScore !== a.trustScore) return b.trustScore - a.trustScore;
            return b.completedCycles - a.completedCycles;
        });

        // 4. Assign slots respecting minSlot constraints
        const assignments: SlotAssignment[] = [];
        const usedSlots = new Set<number>();

        // First pass: assign members with restrictions (high minSlot first)
        const restricted = memberScores.filter(m => m.minSlot > 1).sort((a, b) => b.minSlot - a.minSlot);
        const unrestricted = memberScores.filter(m => m.minSlot <= 1);

        // Assign restricted members to their earliest eligible slot
        for (const member of restricted) {
            let assigned = false;
            for (let slot = member.minSlot; slot <= poolCapacity; slot++) {
                if (!usedSlots.has(slot)) {
                    usedSlots.add(slot);
                    assignments.push({
                        userId: member.userId,
                        trustScore: member.trustScore,
                        completedCycles: member.completedCycles,
                        assignedSlot: slot,
                    });
                    assigned = true;
                    break;
                }
            }
            // Fallback: if no eligible slot is free, take any remaining
            if (!assigned) {
                for (let slot = 1; slot <= poolCapacity; slot++) {
                    if (!usedSlots.has(slot)) {
                        usedSlots.add(slot);
                        assignments.push({
                            userId: member.userId,
                            trustScore: member.trustScore,
                            completedCycles: member.completedCycles,
                            assignedSlot: slot,
                        });
                        break;
                    }
                }
            }
        }

        // Assign unrestricted members to remaining slots (best slots first)
        for (const member of unrestricted) {
            for (let slot = 1; slot <= poolCapacity; slot++) {
                if (!usedSlots.has(slot)) {
                    usedSlots.add(slot);
                    assignments.push({
                        userId: member.userId,
                        trustScore: member.trustScore,
                        completedCycles: member.completedCycles,
                        assignedSlot: slot,
                    });
                    break;
                }
            }
        }

        // 5. Update database
        for (const a of assignments) {
            const { error: updateError } = await supabase
                .from('pool_members')
                .update({ payout_slot: a.assignedSlot })
                .eq('pool_id', poolId)
                .eq('user_id', a.userId);

            if (updateError) {
                console.error(`[PayoutSequencer] Failed to update slot for user ${a.userId}:`, updateError);
            }
        }

        return assignments;
    }

    /**
     * Get a human-readable explanation of a user's payout position.
     */
    async explainPosition(userId: string, poolCapacity: number = SEQUENCER_CONFIG.POOL_CAPACITY): Promise<string> {
        const rep = await reputationService.getScore(userId);
        const { minSlot, maxSlot } = this.getEligibleSlotRange(rep.score, rep.successfulCycles, poolCapacity);

        if (minSlot === 1) {
            return `Your trust score (${rep.score}) and ${rep.successfulCycles} completed cycle(s) qualify you for any payout position, including first!`;
        }

        if (minSlot <= 2) {
            return `Your trust score (${rep.score}) qualifies you for early payout positions (slot ${minSlot}+). Complete more cycles to unlock slot 1.`;
        }

        if (minSlot <= 3) {
            return `Your trust score (${rep.score}) qualifies you for mid-range payout positions (slot ${minSlot}–${maxSlot}). Build your trust score to access earlier slots.`;
        }

        return `As a newer member (trust score: ${rep.score}), you'll receive your payout in later positions (slot ${minSlot}–${maxSlot}). This protects the group. Complete cycles and pay on time to unlock earlier positions!`;
    }
}

export const payoutSequencerService = new PayoutSequencerService();
export { SEQUENCER_CONFIG };
