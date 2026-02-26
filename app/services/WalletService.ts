// ============================================================
// SAFE ZONE — DO NOT MODIFY WITHOUT EXPLICIT REVIEW
// Service: WalletService
// Handles: Internal ledger, balance management, atomic transactions
// Simulates a secure, append-only ledger via Supabase RPC.
// Last updated: Phase 2 Integration
// ============================================================

import { supabase } from './supabaseClient';
import { Wallet, Transaction, TxType, TxStatus } from '../models/schema';

class WalletService {

    private isValidUUID(id: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
    }

    async createWallet(userId: string): Promise<Wallet> {
        if (!this.isValidUUID(userId)) {
            console.error(`[WalletService] Invalid UUID format for user: ${userId}`);
            throw new Error('Invalid user ID format');
        }
        // 1. Check if wallet exists
        let { data, error } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', userId)
            .single();

        // 2. If it doesn't exist, insert it
        if (error && error.code === 'PGRST116') {
            const { data: newWallet, error: insertError } = await supabase
                .from('wallets')
                .insert({ user_id: userId, currency: 'NGN', balance: 0, locked_balance: 0, pool_credit: 0 })
                .select()
                .single();

            if (insertError) {
                console.warn('[WalletService] Failed to insert new wallet (might safely exist):', insertError);
                // Fallback to fetch again in case of race condition
                const { data: retryData, error: retryError } = await supabase
                    .from('wallets')
                    .select('*')
                    .eq('user_id', userId)
                    .single();

                if (retryError || !retryData) {
                    throw new Error('Failed to create or fetch wallet');
                }
                data = retryData;
            } else {
                data = newWallet;
            }
        } else if (error || !data) {
            console.error('[WalletService] Error fetching wallet during creation:', error);
            throw new Error('Failed to verify wallet');
        }

        return this.mapWallet(data);
    }

    async getWallet(userId: string): Promise<Wallet | undefined> {
        if (!this.isValidUUID(userId)) {
            console.error(`[WalletService] Invalid UUID format for user: ${userId}`);
            return undefined;
        }

        const { data, error } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error || !data) {
            return undefined;
        }

        return this.mapWallet(data);
    }

    async getHistory(userId: string): Promise<Transaction[]> {
        if (!this.isValidUUID(userId)) {
            console.error(`[WalletService] Invalid UUID format for getHistory: ${userId}`);
            return [];
        }

        // First get the wallet ID to query transactions
        const { data: walletData } = await supabase.from('wallets').select('id').eq('user_id', userId).single();
        if (!walletData) return [];

        const { data, error } = await supabase
            .from('wallet_transactions')
            .select('*')
            .eq('wallet_id', walletData.id)
            .order('created_at', { ascending: false });

        if (error || !data) return [];

        return data.map(tx => this.mapTransaction(tx, userId));
    }

    // ATOMIC TRANSACTION LOGIC via Supabase RPC
    async processTransaction(
        userId: string,
        type: TxType,
        amount: number,
        reference: string,
        meta?: {
            isPoolCredit?: boolean,
            poolCreditUsed?: number,
            fee?: number,
            fund?: number,
            gatewayFee?: number,
            stampDuty?: number,
            vat?: number,
            description?: string
        }
    ): Promise<boolean> {
        if (!this.isValidUUID(userId)) {
            console.error(`[WalletService] Invalid UUID format for processTransaction: ${userId}`);
            throw new Error('Invalid user ID format');
        }

        // Validation Rules
        if (amount <= 0) {
            throw new Error('Invalid amount');
        }

        if (!reference || reference.trim() === '') {
            throw new Error('Transaction reference is required');
        }

        // Let DB handle idempotency error (duplicate key on reference)

        try {
            const description = meta?.description || `${type} transaction`;
            const poolCreditUsed = meta?.poolCreditUsed || 0;
            const isPoolCredit = meta?.isPoolCredit || false;

            const { data, error } = await supabase.rpc('process_wallet_transaction', {
                p_user_id: userId,
                p_type: type,
                p_amount: amount,
                p_reference: reference,
                p_description: description,
                p_pool_credit_used: poolCreditUsed,
                p_is_pool_credit: isPoolCredit
            });

            if (error) {
                // Ensure wallet exists lazily if it threw a 'Wallet not found' exception
                if (error.message.includes('Wallet not found')) {
                    console.warn(`[WalletService] Wallet not found for ${userId}. Creating lazily...`);
                    await this.createWallet(userId);

                    // Retry transaction once
                    const retryResult = await supabase.rpc('process_wallet_transaction', {
                        p_user_id: userId,
                        p_type: type,
                        p_amount: amount,
                        p_reference: reference,
                        p_description: description,
                        p_pool_credit_used: poolCreditUsed,
                        p_is_pool_credit: isPoolCredit
                    });

                    if (retryResult.error) {
                        throw retryResult.error;
                    }
                    return true;
                }

                // Return gracefully for duplicate idempotency
                if (error.code === '23505' || error.message.includes('duplicate key value') || error.message.includes('unique constraint')) {
                    return true;
                }
                console.error('[WalletService] Transaction failed:', error);
                throw new Error(error.message);
            }
            return true;
        } catch (err: any) {
            throw new Error(err.message || 'Transaction processing failed');
        }
    }

    async isReferenceProcessed(reference: string): Promise<boolean> {
        const { data } = await supabase
            .from('wallet_transactions')
            .select('id')
            .eq('reference', reference)
            .single();
        return !!data;
    }

    // ── Admin Methods ──

    async getAllTransactions(): Promise<Transaction[]> {
        const { data, error } = await supabase
            .from('wallet_transactions')
            .select('*, wallets(user_id)')
            .order('created_at', { ascending: false });

        if (error || !data) return [];
        return data.map(tx => this.mapTransaction(tx, tx.wallets?.user_id));
    }

    async getAllWallets(): Promise<Wallet[]> {
        const { data, error } = await supabase.from('wallets').select('*');
        if (error || !data) return [];
        return data.map(this.mapWallet);
    }

    async getFinancialSummary() {
        // For MVP, aggregate in-memory instead of complex SQL aggregation
        const txs = await this.getAllTransactions();

        let totalFeeRevenue = 0;
        let totalProtectionFund = 0;
        let totalPenalties = 0;
        let totalPayouts = 0;
        let totalContributions = 0;
        let totalDeposits = 0;
        let totalWithdrawals = 0;
        let gatewayFees = 0;
        let stampDuty = 0;
        let vat = 0;

        for (const tx of txs) {
            if (tx.status !== 'success') continue;
            switch (tx.type) {
                case 'fee': totalFeeRevenue += tx.amount; break;
                case 'fund': totalProtectionFund += tx.amount; break;
                case 'penalty': totalPenalties += tx.amount; break;
                case 'payout': totalPayouts += tx.amount; break;
                case 'contribution': totalContributions += tx.amount; break;
                case 'deposit': totalDeposits += tx.amount; break;
                case 'withdrawal': totalWithdrawals += tx.amount; break;
            }
            if (tx.metadata) {
                if (tx.metadata.gatewayFee) gatewayFees += tx.metadata.gatewayFee;
                if (tx.metadata.stampDuty) stampDuty += tx.metadata.stampDuty;
                if (tx.metadata.vat) vat += tx.metadata.vat;
            }
        }

        return {
            totalFeeRevenue,
            totalProtectionFund,
            totalPenalties,
            totalPayouts,
            totalContributions,
            totalDeposits,
            totalWithdrawals,
            gatewayFees,
            stampDuty,
            vat,
            transactionCount: txs.length,
        };
    }

    // Providers to map from DB
    private mapWallet(row: any): Wallet {
        return {
            userId: row.user_id,
            balance: parseFloat(row.balance),
            lockedBalance: parseFloat(row.locked_balance || '0'),
            poolCredit: parseFloat(row.pool_credit || '0'),
            currency: row.currency,
            lastUpdated: new Date(row.updated_at)
        };
    }

    private mapTransaction(row: any, fallbackUserId?: string): Transaction {
        return {
            id: row.id,
            userId: row.wallets?.user_id || fallbackUserId || 'unknown',
            type: row.type as TxType,
            amount: parseFloat(row.amount),
            reference: row.reference,
            status: row.status as TxStatus,
            timestamp: new Date(row.created_at),
            metadata: typeof row.metadata === 'object' ? row.metadata : undefined,
            description: row.metadata?.description
        };
    }
}

export const walletService = new WalletService();
