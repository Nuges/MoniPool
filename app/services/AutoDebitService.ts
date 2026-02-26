// ============================================================
// AutoDebitService — Scheduled deductions for pool contributions
// Processes deductions from pool members via WalletService.
// Never withdraws silently — all deductions are logged.
// Database Backed (Supabase)
// Last updated: Phase 2 Integration
// ============================================================

import { Pool, PoolMember, Cycle } from '../models/schema';
import { walletService } from './WalletService';
import { reputationService } from './ReputationService';
import { supabase } from './supabaseClient';

interface DeductionResult {
    userId: string;
    poolId: string;
    amount: number;
    success: boolean;
    reason?: string;
    penaltyApplied: boolean;
}

interface MissedPayment {
    userId: string;
    poolId: string;
    amount: number;
    dueDate: Date;
    recordedAt: Date;
}

class AutoDebitService {
    /**
     * Process scheduled deductions for all members of a pool.
     * Rules:
     *  - Never withdraw silently — all deductions logged
     *  - Fail safely on insufficient funds
     *  - On failure: log penalty (not hard deduction), reduce trust score
     *  - All money movement through WalletService.processTransaction()
     */
    async processDeductions(pool: Pool): Promise<DeductionResult[]> {
        const results: DeductionResult[] = [];

        if (pool.status !== 'active') {
            console.warn(`[AutoDebit] Pool ${pool.id} is not active (${pool.status}). Skipping deductions.`);
            return results;
        }

        for (const member of pool.members) {
            const userId = member.userId ?? member.id;
            const result = await this.deductMember(pool, member, userId);
            results.push(result);
        }

        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
            console.warn(`[AutoDebit] ${failed.length}/${results.length} deductions failed for pool ${pool.id}.`);
        }

        return results;
    }

    private async deductMember(pool: Pool, member: PoolMember, userId: string): Promise<DeductionResult> {
        const amount = pool.contributionAmount;
        const reference = `contrib_${pool.id}_${userId}_${Date.now()}`;

        try {
            await walletService.processTransaction(userId, 'contribution', amount, reference);

            // Mark as paid in DB (would usually be per-cycle record in a real app, keeping state simple here)
            // Just assume `has_paid` signifies current cycle paid for MVP.
            await supabase
                .from('pool_members')
                .update({ has_paid: true })
                .eq('id', member.id);

            member.hasPaid = true;

            return {
                userId,
                poolId: pool.id,
                amount,
                success: true,
                penaltyApplied: false,
            };
        } catch (error: any) {
            // Failed — increment missed payment on pool_members + apply penalty
            console.warn(`[AutoDebit] Failed to deduct from ${userId}: ${error.message}`);

            await supabase
                .rpc('increment_missed_payments', { p_member_id: member.id });

            // Reduce trust score by 5 points per missed payment
            const currentScore = await reputationService.getScore(userId);
            const newScore = Math.max(0, currentScore.score - 5);
            await reputationService.updateScore(userId, newScore);

            return {
                userId,
                poolId: pool.id,
                amount,
                success: false,
                reason: error.message,
                penaltyApplied: true,
            };
        }
    }
}

export const autoDebitService = new AutoDebitService();
