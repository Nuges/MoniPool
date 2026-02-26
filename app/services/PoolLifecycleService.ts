// ============================================================
// PoolLifecycleService — Separate from PoolService (SAFE ZONE)
// Manages pool state transitions: filling → locked → active → completed
// Does NOT modify PoolService core logic.
// Database Backed (Supabase)
// Last updated: Phase 2 Integration
// ============================================================

import { supabase } from './supabaseClient';
import { Pool, PoolStatus } from '../models/schema';

type TransitionResult = {
    success: boolean;
    previousStatus: PoolStatus;
    newStatus: PoolStatus;
    message: string;
};

// Valid state transitions
const VALID_TRANSITIONS: Record<PoolStatus, PoolStatus[]> = {
    open: ['filling'],
    filling: ['locked', 'timeout'],
    locked: ['active'],
    active: ['completed', 'frozen'],
    completed: [],
    timeout: [],
    frozen: ['active'], // Admin can unfreeze
};

class PoolLifecycleService {
    /**
     * Attempt to advance a pool to the next status.
     * Enforces valid state transitions — no skipping.
     */
    async advancePool(pool: Pool, targetStatus: PoolStatus): Promise<TransitionResult> {
        const currentStatus = pool.status;

        // Guard: no self-transitions
        if (currentStatus === targetStatus) {
            return {
                success: false,
                previousStatus: currentStatus,
                newStatus: currentStatus,
                message: `Pool is already in '${currentStatus}' status.`,
            };
        }

        // Guard: valid transition check
        const allowed = VALID_TRANSITIONS[currentStatus] || [];
        if (!allowed.includes(targetStatus)) {
            return {
                success: false,
                previousStatus: currentStatus,
                newStatus: currentStatus,
                message: `Invalid transition: '${currentStatus}' → '${targetStatus}'. Allowed: [${allowed.join(', ')}].`,
            };
        }

        // Apply transition
        const previousStatus = pool.status;

        const { error } = await supabase
            .from('pools')
            .update({ status: targetStatus })
            .eq('id', pool.id);

        if (error) {
            return {
                success: false,
                previousStatus: currentStatus,
                newStatus: currentStatus,
                message: `Database error during transition: ${error.message}`,
            };
        }

        pool.status = targetStatus;

        return {
            success: true,
            previousStatus,
            newStatus: targetStatus,
            message: `Pool transitioned from '${previousStatus}' to '${targetStatus}'.`,
        };
    }

    /**
     * Check if a pool is joinable (only 'filling' pools accept new members).
     */
    isJoinable(pool: Pool): boolean {
        return pool.status === 'filling';
    }

    /**
     * Check if a pool can be locked (all slots filled).
     */
    canLock(pool: Pool): boolean {
        return pool.status === 'filling' &&
            pool.currentMembers >= (pool.capacity ?? pool.totalMembers);
    }

    /**
     * Check if a pool can be activated.
     * Requires: locked status + start date reached + all members present.
     */
    canActivate(pool: Pool): boolean {
        if (pool.status !== 'locked') return false;
        if (!pool.startDate) return false;
        if (pool.currentMembers < (pool.capacity ?? pool.totalMembers)) return false;
        return true;
    }

    /**
     * Check if a pool is complete (all payout cycles finished).
     */
    canComplete(pool: Pool): boolean {
        return pool.status === 'active' &&
            pool.currentCycle >= pool.totalCycles;
    }

    /**
     * Get the current state and what transitions are available.
     */
    getPoolState(pool: Pool): {
        status: PoolStatus;
        canTransitionTo: PoolStatus[];
        isJoinable: boolean;
    } {
        return {
            status: pool.status,
            canTransitionTo: VALID_TRANSITIONS[pool.status] || [],
            isJoinable: this.isJoinable(pool),
        };
    }

    /**
     * Auto-advance pool through natural lifecycle based on current conditions.
     * Returns all transitions made.
     */
    async autoAdvance(pool: Pool): Promise<TransitionResult[]> {
        const results: TransitionResult[] = [];

        // filling → locked (if full)
        if (this.canLock(pool)) {
            results.push(await this.advancePool(pool, 'locked'));
        }

        // locked → active (if ready)
        if (this.canActivate(pool)) {
            results.push(await this.advancePool(pool, 'active'));
        }

        // active → completed (if all cycles done)
        if (this.canComplete(pool)) {
            results.push(await this.advancePool(pool, 'completed'));
        }

        return results;
    }
}

export const poolLifecycleService = new PoolLifecycleService();
