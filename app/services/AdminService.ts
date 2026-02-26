// ============================================================
// AdminService — System-level admin logic (no UI)
// Handles: Pool freezing, dispute resolution, payout reversal, actor flagging
// All actions are logged with timestamps.
// Database Backed (Supabase)
// Last updated: Phase 2 Integration
// ============================================================

import { Pool, PoolStatus } from '../models/schema';
import { walletService } from './WalletService';
import { reputationService } from './ReputationService';
import { poolLifecycleService } from './PoolLifecycleService';
import { supabase } from './supabaseClient';

interface AdminAction {
    id: string;
    type: 'freeze' | 'unfreeze' | 'dispute_resolved' | 'payout_reversed' | 'user_flagged';
    targetId: string; // Pool ID or User ID
    reason: string;
    performedBy: string; // Admin ID
    timestamp: Date;
    metadata?: Record<string, any>;
}

class AdminService {
    /**
     * Freeze a pool — blocks all operations (contributions, payouts, joins).
     */
    async freezePool(pool: Pool, reason: string, adminId: string = 'system'): Promise<{
        success: boolean;
        message: string;
    }> {
        const result = await poolLifecycleService.advancePool(pool, 'frozen');

        if (result.success) {
            await this.logAction({
                type: 'freeze',
                targetId: pool.id,
                reason,
                performedBy: adminId,
            });
            return { success: true, message: `Pool ${pool.id} frozen. Reason: ${reason}` };
        }

        return { success: false, message: result.message };
    }

    /**
     * Unfreeze a pool — returns it to 'active' status.
     */
    async unfreezePool(pool: Pool, reason: string, adminId: string = 'system'): Promise<{
        success: boolean;
        message: string;
    }> {
        if (pool.status !== 'frozen') {
            return { success: false, message: `Pool ${pool.id} is not frozen (status: ${pool.status}).` };
        }

        const result = await poolLifecycleService.advancePool(pool, 'active');

        if (result.success) {
            await this.logAction({
                type: 'unfreeze',
                targetId: pool.id,
                reason,
                performedBy: adminId,
            });
            return { success: true, message: `Pool ${pool.id} unfrozen. Reason: ${reason}` };
        }

        return { success: false, message: result.message };
    }

    /**
     * Resolve a dispute — logs resolution and optionally adjusts balances.
     */
    async resolveDispute(
        poolId: string,
        resolution: string,
        adjustments?: { userId: string; amount: number; type: 'credit' | 'debit' }[],
        adminId: string = 'system'
    ): Promise<{ success: boolean; message: string }> {
        await this.logAction({
            type: 'dispute_resolved',
            targetId: poolId,
            reason: resolution,
            performedBy: adminId,
            metadata: { adjustments },
        });

        if (adjustments) {
            for (const adj of adjustments) {
                const txType = adj.type === 'credit' ? 'deposit' : 'withdrawal';
                const ref = `dispute_${poolId}_${adj.userId}_${Date.now()}`;

                try {
                    await walletService.processTransaction(adj.userId, txType, adj.amount, ref);
                } catch (err: any) {
                    console.error(`[Admin] Dispute adjustment failed for ${adj.userId}:`, err.message);
                }
            }
        }

        return { success: true, message: `Dispute resolved for pool ${poolId}: ${resolution}` };
    }

    /**
     * Reverse a failed payout — creates a reversal transaction via WalletService.
     */
    async reverseFailedPayout(
        userId: string,
        amount: number,
        originalRef: string,
        reason: string,
        adminId: string = 'system'
    ): Promise<{ success: boolean; message: string }> {
        const reversalRef = `reversal_${originalRef}_${Date.now()}`;

        try {
            await walletService.processTransaction(userId, 'withdrawal', amount, reversalRef);

            await this.logAction({
                type: 'payout_reversed',
                targetId: userId,
                reason,
                performedBy: adminId,
                metadata: { originalRef, reversalRef, amount },
            });

            return { success: true, message: `Reversed ₦${amount.toLocaleString()} for ${userId}. Ref: ${reversalRef}` };
        } catch (error: any) {
            return { success: false, message: `Reversal failed: ${error.message}` };
        }
    }

    /**
     * Flag a user — marks them for review and reduces trust score.
     */
    async flagUser(userId: string, reason: string, adminId: string = 'system'): Promise<{
        success: boolean;
        message: string;
    }> {
        await supabase
            .from('profiles')
            .update({ is_flagged: true })
            .eq('id', userId);

        // Reduce trust score by 15 points for flagged users
        const currentScore = await reputationService.getScore(userId);
        const newScore = Math.max(0, currentScore.score - 15);
        await reputationService.updateScore(userId, newScore);

        await this.logAction({
            type: 'user_flagged',
            targetId: userId,
            reason,
            performedBy: adminId,
            metadata: { previousScore: currentScore.score, newScore },
        });

        return {
            success: true,
            message: `User ${userId} flagged. Trust score: ${currentScore.score} → ${newScore}. Reason: ${reason}`,
        };
    }

    /**
     * Check if a user is flagged.
     */
    async isUserFlagged(userId: string): Promise<boolean> {
        const { data } = await supabase
            .from('profiles')
            .select('is_flagged')
            .eq('id', userId)
            .single();

        return data?.is_flagged ?? false;
    }

    /**
     * Get all admin actions for audit trail.
     */
    async getActionLog(): Promise<AdminAction[]> {
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('action', 'admin_action')
            .order('created_at', { ascending: false });

        if (error || !data) return [];

        return data.map(log => {
            const meta = log.details as any;
            return {
                id: log.id,
                type: meta?.type,
                targetId: meta?.targetId,
                reason: meta?.reason,
                performedBy: log.user_id,
                timestamp: new Date(log.created_at),
                metadata: meta?.metadata
            };
        });
    }

    // ── Internal ──

    private async logAction(params: Omit<AdminAction, 'id' | 'timestamp'>) {
        await supabase.from('audit_logs').insert({
            user_id: params.performedBy,
            action: 'admin_action',
            details: {
                type: params.type,
                targetId: params.targetId,
                reason: params.reason,
                metadata: params.metadata
            }
        });
    }
}

export const adminService = new AdminService();
