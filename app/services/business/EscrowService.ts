// ============================================================
// EscrowService — Fund Locking for Pool Security
// Locks a user's first contribution when they join a pool.
// Locked funds cannot be withdrawn and are automatically applied
// to scheduled payments. Released only on pool completion.
// ============================================================

import { supabase } from '../supabaseClient';

export interface EscrowLock {
    userId: string;
    poolId: string;
    amount: number;
    lockedAt: Date;
    status: 'locked' | 'applied' | 'released';
}

class EscrowService {

    /**
     * Lock funds in a user's wallet when they join a pool.
     * Moves money from `balance` → `locked_balance`.
     *
     * This ensures the user has proven liquidity before the pool starts.
     * The locked amount = first cycle's contribution.
     */
    async lockFunds(userId: string, poolId: string, amount: number): Promise<boolean> {
        if (amount <= 0) {
            throw new Error('Escrow amount must be positive');
        }

        // 1. Check user has sufficient available balance
        const { data: wallet, error: walletError } = await supabase
            .from('wallets')
            .select('id, balance, locked_balance')
            .eq('user_id', userId)
            .single();

        if (walletError || !wallet) {
            throw new Error('Wallet not found. Please fund your wallet first.');
        }

        const availableBalance = parseFloat(wallet.balance);
        if (availableBalance < amount) {
            throw new Error(
                `Insufficient funds. You need ₦${amount.toLocaleString()} to join this pool, ` +
                `but you only have ₦${availableBalance.toLocaleString()} available.`
            );
        }

        // 2. Atomically move funds from balance → locked_balance
        const newBalance = availableBalance - amount;
        const newLocked = parseFloat(wallet.locked_balance || '0') + amount;

        const { error: updateError } = await supabase
            .from('wallets')
            .update({
                balance: newBalance,
                locked_balance: newLocked,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

        if (updateError) {
            console.error('[EscrowService] Failed to lock funds:', updateError);
            throw new Error('Failed to lock contribution funds');
        }

        // 3. Record the escrow transaction in the ledger
        const walletId = wallet.id;
        await supabase.from('wallet_transactions').insert({
            wallet_id: walletId,
            reference: `escrow_lock_${poolId}_${userId}_${Date.now()}`,
            type: 'contribution',
            amount,
            direction: 'debit',
            status: 'success',
            metadata: {
                description: 'Pool entry escrow lock',
                pool_id: poolId,
                escrow_action: 'lock',
            },
        });

        return true;
    }

    /**
     * Apply escrowed funds to a scheduled contribution.
     * This is called when the first payment cycle comes due —
     * instead of deducting from balance again, we deduct from locked_balance.
     */
    async applyEscrow(userId: string, poolId: string, amount: number): Promise<boolean> {
        const { data: wallet, error } = await supabase
            .from('wallets')
            .select('id, locked_balance')
            .eq('user_id', userId)
            .single();

        if (error || !wallet) {
            console.error('[EscrowService] Wallet not found for escrow application');
            return false;
        }

        const currentLocked = parseFloat(wallet.locked_balance || '0');
        const applyAmount = Math.min(amount, currentLocked);

        if (applyAmount <= 0) return false;

        const { error: updateError } = await supabase
            .from('wallets')
            .update({
                locked_balance: currentLocked - applyAmount,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

        if (updateError) {
            console.error('[EscrowService] Failed to apply escrow:', updateError);
            return false;
        }

        return true;
    }

    /**
     * Release escrowed funds back to the user's available balance.
     * Called when a pool completes successfully or is cancelled.
     */
    async releaseFunds(userId: string, poolId: string, amount: number): Promise<boolean> {
        const { data: wallet, error } = await supabase
            .from('wallets')
            .select('id, balance, locked_balance')
            .eq('user_id', userId)
            .single();

        if (error || !wallet) {
            console.error('[EscrowService] Wallet not found for escrow release');
            return false;
        }

        const currentLocked = parseFloat(wallet.locked_balance || '0');
        const releaseAmount = Math.min(amount, currentLocked);

        if (releaseAmount <= 0) return false;

        const { error: updateError } = await supabase
            .from('wallets')
            .update({
                balance: parseFloat(wallet.balance) + releaseAmount,
                locked_balance: currentLocked - releaseAmount,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

        if (updateError) {
            console.error('[EscrowService] Failed to release escrow:', updateError);
            return false;
        }

        // Record release transaction
        await supabase.from('wallet_transactions').insert({
            wallet_id: wallet.id,
            reference: `escrow_release_${poolId}_${userId}_${Date.now()}`,
            type: 'deposit',
            amount: releaseAmount,
            direction: 'credit',
            status: 'success',
            metadata: {
                description: 'Pool escrow release',
                pool_id: poolId,
                escrow_action: 'release',
            },
        });

        return true;
    }

    /**
     * Get the total locked balance for a user across all active pools.
     */
    async getLockedBalance(userId: string): Promise<number> {
        const { data, error } = await supabase
            .from('wallets')
            .select('locked_balance')
            .eq('user_id', userId)
            .single();

        if (error || !data) return 0;
        return parseFloat(data.locked_balance || '0');
    }
}

export const escrowService = new EscrowService();
