// ============================================================
// SAFE ZONE — DO NOT MODIFY WITHOUT EXPLICIT REVIEW
// Service: ReputationService
// Handles: Trust scoring, tier eligibility, access control
// Database Backed (Supabase)
// Last updated: Phase 2 Integration
// ============================================================

import { supabase } from './supabaseClient';
import { ReputationScore, Tier } from '../models/schema';

class ReputationService {

    async getScore(userId: string): Promise<ReputationScore> {
        // Fetch trust score from profiles
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('trust_score')
            .eq('id', userId)
            .single();

        let score = 50;
        if (!error && profile) {
            score = profile.trust_score || 50;
        }

        // Compute successful cycles & missed payments from pool_members
        let successfulCycles = 0;
        let missedPayments = 0;

        const { data: membersData } = await supabase
            .from('pool_members')
            .select('missed_payments, pools(status)')
            .eq('user_id', userId);

        if (membersData) {
            for (const m of membersData) {
                missedPayments += (m.missed_payments || 0);
                if (m.pools && (m.pools as any).status === 'completed') {
                    successfulCycles++;
                }
            }
        }

        return {
            userId,
            score,
            successfulCycles,
            missedPayments,
            tierEligibility: this.calculateEligibility(score),
        };
    }

    async updateScore(userId: string, newScore: number): Promise<void> {
        const clamped = Math.max(0, Math.min(100, newScore));
        const { error } = await supabase
            .from('profiles')
            .update({ trust_score: clamped })
            .eq('id', userId);

        if (error) {
            console.error(`[ReputationService] Failed to update score for ${userId}:`, error);
        }
    }

    /**
     * REFERRAL RISK: Penalize the inviter when their invitee defaults.
     * The penalty is proportional to the severity of the default.
     * - 1st missed payment: -3 points to inviter
     * - 2nd missed payment: -5 points to inviter
     * - Full default (left pool): -10 points to inviter
     */
    async penalizeReferrer(defaultingUserId: string, severity: 'missed' | 'repeated' | 'abandoned'): Promise<void> {
        // Find who referred this user
        const { data: referral } = await supabase
            .from('referrals')
            .select('referrer_id')
            .eq('referred_user_id', defaultingUserId)
            .eq('status', 'rewarded')
            .single();

        if (!referral) return; // No referrer found

        const penalties: Record<string, number> = {
            missed: 3,
            repeated: 5,
            abandoned: 10,
        };

        const penalty = penalties[severity] || 3;
        const referrerScore = await this.getScore(referral.referrer_id);
        const newScore = referrerScore.score - penalty;

        await this.updateScore(referral.referrer_id, newScore);
    }

    /**
     * Handle a user defaulting on a payment.
     * 1. Deduct trust score from the defaulter
     * 2. Penalize the referrer (if any)
     * 3. Increment missed_payments in pool_members
     */
    async handleDefault(userId: string, poolId: string, isAbandoned: boolean = false): Promise<void> {
        // 1. Penalize the defaulter
        const currentScore = await this.getScore(userId);
        const deduction = isAbandoned ? 15 : 5;
        await this.updateScore(userId, currentScore.score - deduction);

        // 2. Penalize the referrer
        const severity = isAbandoned ? 'abandoned' : (currentScore.missedPayments >= 2 ? 'repeated' : 'missed');
        await this.penalizeReferrer(userId, severity);

        // 3. Increment missed_payments counter
        await supabase
            .from('pool_members')
            .update({ missed_payments: currentScore.missedPayments + 1 })
            .eq('pool_id', poolId)
            .eq('user_id', userId);
    }

    async canJoinTier(userId: string, tier: Tier): Promise<boolean> {
        const rep = await this.getScore(userId);
        return rep.tierEligibility.includes(tier);
    }

    /** Get all reputation scores (for admin dashboard) */
    async getAllScores(): Promise<ReputationScore[]> {
        // Warning: This could be heavy in a large DB.
        // For MVP, we fetch all profiles with inner join on pool_members
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, trust_score, pool_members(missed_payments, pools(status))');

        if (error || !profiles) return [];

        return profiles.map(p => {
            let successfulCycles = 0;
            let missedPayments = 0;
            const members = p.pool_members || [];
            for (const m of members) {
                missedPayments += (m.missed_payments || 0);
                if (m.pools && (m.pools as any).status === 'completed') {
                    successfulCycles++;
                }
            }
            const score = p.trust_score || 50;

            return {
                userId: p.id,
                score,
                successfulCycles,
                missedPayments,
                tierEligibility: this.calculateEligibility(score),
            };
        });
    }

    private calculateEligibility(score: number): Tier[] {
        if (score >= 90) return ['50k', '100k', '300k', '500k', '1m', '2m'];
        if (score >= 80) return ['50k', '100k', '300k', '500k', '1m'];
        if (score >= 60) return ['50k', '100k', '300k', '500k'];
        return ['50k', '100k', '300k'];
    }

    // ── Wrapped addition (not modifying existing logic) ──

    private readonly TIER_LABELS: Record<Tier, string> = {
        '50k': '₦50,000',
        '100k': '₦100,000',
        '300k': '₦300,000',
        '500k': '₦500,000',
        '1m': '₦1,000,000',
        '2m': '₦2,000,000',
    };

    async getEligibilityMessage(userId: string, tier: Tier): Promise<{
        eligible: boolean;
        message: string;
        currentScore: number;
        requiredScore: number;
        eligibleTiers: Tier[];
    }> {
        const rep = await this.getScore(userId);
        const eligible = rep.tierEligibility.includes(tier);

        const requiredScore = tier === '2m' ? 90
            : tier === '1m' ? 80
                : tier === '500k' ? 60
                    : 0;

        if (eligible) {
            return {
                eligible: true,
                message: `You're eligible for the ${this.TIER_LABELS[tier]} tier.`,
                currentScore: rep.score,
                requiredScore,
                eligibleTiers: rep.tierEligibility,
            };
        }

        return {
            eligible: false,
            message: `Your trust score (${rep.score}) is below the required ${requiredScore} for the ${this.TIER_LABELS[tier]} tier. You can currently join: ${rep.tierEligibility.map(t => this.TIER_LABELS[t]).join(', ')}.`,
            currentScore: rep.score,
            requiredScore,
            eligibleTiers: rep.tierEligibility,
        };
    }
}

export const reputationService = new ReputationService();
