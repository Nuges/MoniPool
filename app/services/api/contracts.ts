// ============================================================
// API CONTRACTS — Backend Integration Interfaces
// NO network calls. NO fetch/axios. Interfaces only.
// These define the shapes for future backend swap-in.
// All in-memory services remain untouched.
// ============================================================

import {
    Tier,
    Cycle,
    PoolStatus,
    TxType,
    TxStatus,
    TrustLevel,
} from '../../models/schema';

// ── Shared Types ──────────────────────────────────────────

/** Standard API error shape returned by the backend. */
export interface ApiError {
    code: string;            // e.g. 'INSUFFICIENT_FUNDS', 'POOL_FULL'
    message: string;         // Human-readable message
    field?: string;          // Optional: which field caused the error
    retryable: boolean;      // Whether the client should retry
}

/** Standard envelope for all API responses. */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
    requestId: string;       // For tracing / support tickets
    timestamp: string;       // ISO 8601
}

// ── Pool Service Contracts ────────────────────────────────

export interface JoinPoolRequest {
    userId: string;
    tier: Tier;
    poolCycle: Cycle;
    contributionFrequency: Cycle;
    /** Client-generated idempotency key to prevent duplicate joins. */
    idempotencyKey: string;
}

export interface JoinPoolResponse {
    poolId: string;
    series: number;
    tier: Tier;
    contributionAmount: number;
    payoutAmount: number;
    currentMembers: number;
    capacity: number;
    status: PoolStatus;
    memberPosition: number;
}

export interface GetPoolsRequest {
    userId: string;
    /** Optional filter by status. */
    status?: PoolStatus;
}

export interface GetPoolsResponse {
    pools: Array<{
        id: string;
        name: string;
        tier: Tier;
        cycle: Cycle;
        status: PoolStatus;
        currentMembers: number;
        capacity: number;
        contributionAmount: number;
        payoutAmount: number;
        series: number;
        progress: number;
    }>;
}

export interface GetTierInfoRequest {
    tier: Tier;
}

export interface GetTierInfoResponse {
    tier: Tier;
    currentMembers: number;
    capacity: number;
    contributionBreakdown: {
        daily: number;
        weekly: number;
        monthly: number;
    };
}

// ── Wallet Service Contracts ──────────────────────────────

export interface ProcessTransactionRequest {
    userId: string;
    type: TxType;
    amount: number;
    /**
     * Unique reference for idempotency.
     * Duplicate references MUST be rejected by the backend.
     */
    reference: string;
    /** Optional description for ledger display. */
    description?: string;
}

export interface ProcessTransactionResponse {
    transactionId: string;
    type: TxType;
    amount: number;
    reference: string;
    status: TxStatus;
    newBalance: number;
    timestamp: string;
}

export interface GetWalletRequest {
    userId: string;
}

export interface GetWalletResponse {
    userId: string;
    balance: number;
    currency: string;
    lastUpdated: string;
}

export interface GetTransactionHistoryRequest {
    userId: string;
    /** Optional: number of transactions to return (default 50). */
    limit?: number;
    /** Optional: cursor-based pagination. */
    cursor?: string;
}

export interface GetTransactionHistoryResponse {
    transactions: Array<{
        id: string;
        type: TxType;
        amount: number;
        reference: string;
        status: TxStatus;
        timestamp: string;
        description?: string;
    }>;
    nextCursor?: string;
    hasMore: boolean;
}

// ── Reputation Service Contracts ──────────────────────────

export interface GetReputationRequest {
    userId: string;
}

export interface GetReputationResponse {
    userId: string;
    score: number;
    successfulCycles: number;
    missedPayments: number;
    tierEligibility: Tier[];
    trustLevel: TrustLevel;
}

export interface CheckEligibilityRequest {
    userId: string;
    tier: Tier;
}

export interface CheckEligibilityResponse {
    eligible: boolean;
    message: string;
    currentScore: number;
    requiredScore: number;
    eligibleTiers: Tier[];
}

// ── Referral Service Contracts ────────────────────────────

export interface GetReferralCodeRequest {
    userId: string;
}

export interface GetReferralCodeResponse {
    code: string;
    shareLink: string;
    shareMessage: string;
}

export interface RecordReferralRequest {
    referralCode: string;
    referredUserId: string;
}

export interface RecordReferralResponse {
    success: boolean;
    referrerId: string;
    status: 'pending' | 'downloaded' | 'registered' | 'rewarded';
}

export interface GetReferralStatsRequest {
    userId: string;
}

export interface GetReferralStatsResponse {
    totalReferrals: number;
    pendingReferrals: number;
    completedReferrals: number;
    rewardEarned: number;
}

// ── Idempotency Expectations (DOCUMENTATION) ─────────────
//
// POOL JOIN:
//   - idempotencyKey is REQUIRED on every join request
//   - Backend MUST reject duplicate idempotencyKeys with the same response
//   - Same user + same tier + same pool = already exists → return existing pool
//
// WALLET TRANSACTIONS:
//   - reference field is the idempotency key
//   - Backend MUST reject duplicate references with error code 'DUPLICATE_REFERENCE'
//   - Same reference CANNOT process twice, even across service restarts
//
// REFERRALS:
//   - Same referredUserId CANNOT be recorded twice
//   - Self-referral MUST be blocked (referrerId === referredUserId)
//
// GENERAL:
//   - All write endpoints should be idempotent
//   - All responses include requestId for traceability
//   - Timestamps are always ISO 8601 UTC
