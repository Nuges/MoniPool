// ============================================================
// MoniPool — Unified Schema (Single Source of Truth)
// All type definitions live here. Do NOT define types elsewhere.
// Last updated: 2026-02-17
// ============================================================

// ─── Enums / Type Aliases ────────────────────────────

// Tiers: 50k, 100k, 300k, 500k, 1m, 2m
export type Tier = '50k' | '100k' | '300k' | '500k' | '1m' | '2m';
export type Cycle = 'daily' | 'weekly' | 'monthly';
export type PoolStatus = 'open' | 'filling' | 'locked' | 'active' | 'completed' | 'timeout' | 'frozen';
export type TxType = 'deposit' | 'withdrawal' | 'contribution' | 'payout' | 'penalty' | 'fee' | 'fund' | 'transfer' | 'referral_reward';
export type TxStatus = 'pending' | 'success' | 'completed' | 'failed';
export type TrustLevel = 'verified' | 'growing' | 'high_risk';
export type KycLevel = 'basic' | 'bvn' | 'full';
export type NotificationType = 'reminder' | 'payout' | 'default' | 'group' | 'system';
export type ChatMessageType = 'text' | 'celebration' | 'system';

// ─── User ────────────────────────────────────────────

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    /** Computed display name (firstName + lastName) */
    name: string;
    email?: string;
    phone: string;
    bvn?: string;
    nin?: string;
    avatar?: string;
    avatarUrl?: string;
    reputationScore: number;
    trustScore: number;
    trustLevel: TrustLevel;
    walletBalance: number;
    poolCredit: number; // New field
    kycLevel: KycLevel;
    isKycVerified: boolean;
    joinedDate: string;
    createdAt?: Date;
}

// ─── Pool ────────────────────────────────────────────

export interface Pool {
    id: string;
    name: string;
    tier?: Tier;
    cycle: Cycle;
    series?: number;
    capacity?: number;
    amount: number;
    contributionAmount: number;
    payoutAmount?: number;
    totalMembers: number;
    currentMembers: number;
    minTrustScore: number;
    members: PoolMember[];
    currentCycle: number;
    totalCycles: number;
    nextPayoutDate: string;
    nextPayoutMember: string;
    status: PoolStatus;
    progress: number;
    startDate?: Date;
    createdAt: string | Date;

    isPrivate?: boolean;
    createdBy?: string;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
}

// ─── Private Pool Models ─────────────────────────────

export interface PoolInvite {
    id: string;
    poolId: string;
    inviterId: string;
    inviteeId: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Date;
    // Optional joined fields for UI
    poolName?: string;
    inviterName?: string;
    tier?: Tier;
}

export interface PrivatePoolRequest {
    id: string;
    creatorId: string;
    tier: Tier;
    requestedAt: Date;
    status: 'pending' | 'approved' | 'rejected';
    // Optional joined fields
    creatorName?: string;
    trustScore?: number;
    kycLevel?: KycLevel;
}

// ─── Pool Member ─────────────────────────────────────

export interface PoolMember {
    // UI fields
    id: string;
    name: string;
    avatar?: string;
    trustScore: number;
    trustLevel: TrustLevel;
    payoutOrder: number;
    hasPaid: boolean;
    hasReceived: boolean;

    // Goal fields
    goalTitle: string;
    goalDescription?: string;

    // Service fields
    userId?: string;
    joinedAt?: Date;
    contributionFrequency?: Cycle;
    nextDeductionDate?: Date;
    payoutSlot?: number;
    payoutDate?: Date;
}

// ─── Wallet ──────────────────────────────────────────

export interface Wallet {
    userId: string;
    balance: number;
    lockedBalance: number; // Escrowed funds for active pools
    poolCredit: number; // Separately tracked credit
    currency: 'NGN';
    lastUpdated: Date;
}

// ─── Transaction ─────────────────────────────────────

export interface Transaction {
    id: string;
    userId?: string;
    type: TxType;
    amount: number;
    description?: string;
    reference?: string;
    date?: string;
    status: TxStatus;
    timestamp?: Date;
    poolName?: string;
    metadata?: Record<string, any>; // e.g., { balanceType: 'pool_credit' }
}

// ─── Reputation ──────────────────────────────────────

export interface ReputationScore {
    userId: string;
    score: number; // 0-100
    successfulCycles: number;
    missedPayments: number;
    tierEligibility: Tier[];
}

// ─── Notification ────────────────────────────────────

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    date: string;
    read: boolean;
    icon: string;
}

// ─── Chat Message ────────────────────────────────────

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    message: string;
    timestamp: string;
    type: ChatMessageType;
}
