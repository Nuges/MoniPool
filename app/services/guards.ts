// ============================================================
// Security Guards — Anti-exploit assertion functions
// Throws descriptive errors when integrity rules are violated.
// Wire these into PoolService and WalletService entry points.
// Last updated: Phase 2 Integration
// ============================================================

import { Pool, PoolMember, Tier } from '../models/schema';
import { reputationService } from './ReputationService';
import { walletService } from './WalletService';

// ── Guard: No double payout ──
export function assertNoDoublePayout(
    pool: Pool,
    userId: string,
    cycle: number
): void {
    const member = pool.members.find(m => (m.userId ?? m.id) === userId);
    if (member?.hasReceived) {
        throw new Error(
            `[GUARD] Double payout blocked: User ${userId} already received payout in pool ${pool.id}`
        );
    }
}

// ── Guard: Pool must be joinable (status === 'filling') ──
export function assertPoolJoinable(pool: Pool): void {
    if (pool.status !== 'filling') {
        throw new Error(
            `[GUARD] Pool ${pool.id} is not joinable. Status: '${pool.status}' (must be 'filling').`
        );
    }
}

// ── Guard: Sufficient funds before deduction ──
export async function assertSufficientFunds(userId: string, amount: number): Promise<void> {
    const wallet = await walletService.getWallet(userId);
    if (!wallet) {
        throw new Error(`[GUARD] No wallet found for user ${userId}.`);
    }
    if (wallet.balance < amount) {
        throw new Error(
            `[GUARD] Insufficient funds for ${userId}. Balance: ₦${wallet.balance.toLocaleString()}, Required: ₦${amount.toLocaleString()}.`
        );
    }
}

// ── Guard: Tier eligibility ──
export async function assertTierEligible(userId: string, tier: Tier): Promise<void> {
    const eligibility = await reputationService.getEligibilityMessage(userId, tier);
    if (!eligibility.eligible) {
        throw new Error(`[GUARD] ${eligibility.message}`);
    }
}

// ── Guard: No duplicate membership ──
export function assertNoDuplicateMembership(pool: Pool, userId: string): void {
    const exists = pool.members.some(m => (m.userId ?? m.id) === userId);
    if (exists) {
        throw new Error(
            `[GUARD] User ${userId} is already a member of pool ${pool.id}.`
        );
    }
}

// ── Guard: Valid transaction reference ──
export async function assertValidReference(reference: string): Promise<void> {
    if (!reference || reference.trim() === '') {
        throw new Error('[GUARD] Transaction reference cannot be empty.');
    }
    if (reference.length < 3) {
        throw new Error('[GUARD] Transaction reference is too short (min 3 characters).');
    }
    const processed = await walletService.isReferenceProcessed(reference);
    if (processed) {
        throw new Error(`[GUARD] Duplicate reference: '${reference}' has already been processed.`);
    }
}

// ── Guard: Pool not frozen ──
export function assertPoolNotFrozen(pool: Pool): void {
    if (pool.status === 'frozen') {
        throw new Error(
            `[GUARD] Pool ${pool.id} is frozen. All operations are blocked.`
        );
    }
}

// ── Guard: Pool is active (for payouts/deductions) ──
export function assertPoolActive(pool: Pool): void {
    if (pool.status !== 'active') {
        throw new Error(
            `[GUARD] Pool ${pool.id} is not active (status: '${pool.status}'). Cannot process payments.`
        );
    }
}
