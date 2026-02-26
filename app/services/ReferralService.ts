// ============================================================
// ReferralService — Referral tracking and link generation
// Handles: Referral code generation, tracking referred users, rewards
// Database Backed (Supabase)
// Last updated: Phase 2 Integration
// ============================================================

import { supabase } from './supabaseClient';
import { walletService } from './WalletService';

interface Referral {
    referrerId: string;
    referredUserId: string;
    referralCode: string;
    status: 'pending' | 'downloaded' | 'registered' | 'rewarded';
    createdAt: Date;
    completedAt?: Date;
}

interface ReferralStats {
    totalReferrals: number;
    pendingReferrals: number;
    completedReferrals: number;
    rewardEarned: number;
}

class ReferralService {
    // App download link (replace with actual store URL)
    private readonly APP_LINK = 'https://monipool.app/download';
    private readonly JOIN_REWARD = 500;
    private readonly CYCLE_REWARD = 500;

    /**
     * Generate or retrieve a referral code for a user.
     * Format: MONI-XXXXX (uppercase alphanumeric)
     */
    async getReferralCode(userId: string): Promise<string> {
        if (!this.isValidUUID(userId)) {
            console.error(`[ReferralService] Invalid UUID format for user: ${userId}`);
            throw new Error('Invalid user ID format');
        }

        // Check if user already has a code in profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('referral_code')
            .eq('id', userId)
            .single();

        if (profile && profile.referral_code) {
            return profile.referral_code;
        }

        // Generate new code and save
        const code = `MONI-${this.generateCode(5)}`;
        const { error } = await supabase
            .from('profiles')
            .update({ referral_code: code })
            .eq('id', userId);

        if (error) {
            console.error('[ReferralService] Failed to set referral code:', error);
            // Default fallback if DB fails
        }
        return code;
    }

    /**
     * Get the shareable link with referral code embedded.
     */
    async getShareLink(userId: string): Promise<string> {
        const code = await this.getReferralCode(userId);
        return `${this.APP_LINK}?ref=${code}`;
    }

    /**
     * Get the share message for social media / messaging.
     */
    async getShareMessage(userId: string, userName?: string): Promise<string> {
        const link = await this.getShareLink(userId);
        const code = await this.getReferralCode(userId);
        const name = userName || 'a friend';
        return `🤝 Join me on MoniPool — save together, grow together!\n\n` +
            `MoniPool lets you join trusted savings groups with friends.\n\n` +
            `Download now and get started: ${link}\n\n` +
            `Use my code: ${code}`;
    }

    /**
     * Record a referral when someone uses a code.
     */
    async recordReferral(referralCode: string, referredUserId: string): Promise<boolean> {
        // Find referrer by code
        const { data: referrer, error: referrerError } = await supabase
            .from('profiles')
            .select('id')
            .eq('referral_code', referralCode)
            .single();

        if (referrerError || !referrer) {
            console.warn(`[Referral] Invalid code: ${referralCode}`);
            return false;
        }

        const referrerId = referrer.id;

        // Prevent self-referral
        if (referrerId === referredUserId) {
            console.warn(`[Referral] Self-referral attempt by ${referrerId}`);
            return false;
        }

        // Insert into referrals table
        const { error: insertError } = await supabase
            .from('referrals')
            .insert({
                referrer_id: referrerId,
                referred_user_id: referredUserId,
                referral_code: referralCode,
                status: 'pending'
            });

        if (insertError) {
            // Handle unique constraint (already referred)
            if (insertError.code === '23505') {
                console.warn(`[Referral] User ${referredUserId} already referred.`);
            } else {
                console.error('[Referral] Failed to record referral:', insertError);
            }
            return false;
        }

        return true;
    }

    /**
     * Trigger Reward: User Joins First Pool
     * Reward: ₦500 Pool Credit
     */
    async processJoinReward(userId: string): Promise<boolean> {
        const { data: referral, error } = await supabase
            .from('referrals')
            .select('*')
            .eq('referred_user_id', userId)
            .single();

        if (error || !referral) return false;

        // Condition: Must be in 'pending' or 'downloaded' state
        if (referral.status !== 'pending' && referral.status !== 'downloaded') return false;

        try {
            // Issue Reward to Referrer
            await walletService.processTransaction(
                referral.referrer_id,
                'referral_reward',
                this.JOIN_REWARD,
                `ref_join_${userId}`,
                { isPoolCredit: true }
            );

            // Update Status
            await supabase
                .from('referrals')
                .update({ status: 'registered' })
                .eq('id', referral.id);

            return true;
        } catch (e) {
            console.error('[Referral] Failed to issue join reward', e);
            return false;
        }
    }

    /**
     * Trigger Reward: User Completes Cycle
     * Reward: ₦500 Pool Credit
     */
    async processCycleReward(userId: string): Promise<boolean> {
        const { data: referral, error } = await supabase
            .from('referrals')
            .select('*')
            .eq('referred_user_id', userId)
            .single();

        if (error || !referral) return false;

        if (referral.status === 'rewarded') return false; // Already fully rewarded

        try {
            // Issue Reward to Referrer
            await walletService.processTransaction(
                referral.referrer_id,
                'referral_reward',
                this.CYCLE_REWARD,
                `ref_cycle_${userId}`,
                { isPoolCredit: true }
            );

            // Update Status
            await supabase
                .from('referrals')
                .update({ status: 'rewarded', completed_at: new Date().toISOString() })
                .eq('id', referral.id);

            return true;
        } catch (e) {
            console.error('[Referral] Failed to issue cycle reward', e);
            return false;
        }
    }

    /**
     * Get referral stats for a user.
     */
    async getStats(userId: string): Promise<ReferralStats> {
        const { data: userReferrals, error } = await supabase
            .from('referrals')
            .select('status')
            .eq('referrer_id', userId);

        if (error || !userReferrals) {
            return { totalReferrals: 0, pendingReferrals: 0, completedReferrals: 0, rewardEarned: 0 };
        }

        let rewardEarned = 0;
        let completed = 0;

        for (const r of userReferrals) {
            if (r.status === 'registered') {
                rewardEarned += this.JOIN_REWARD;
            } else if (r.status === 'rewarded') {
                rewardEarned += (this.JOIN_REWARD + this.CYCLE_REWARD);
                completed++;
            }
        }

        return {
            totalReferrals: userReferrals.length,
            pendingReferrals: userReferrals.filter(r => r.status === 'pending').length,
            completedReferrals: completed,
            rewardEarned: rewardEarned,
        };
    }

    /**
     * Get all referrals by a user.
     */
    async getReferrals(userId: string): Promise<Referral[]> {
        const { data, error } = await supabase
            .from('referrals')
            .select('*')
            .eq('referrer_id', userId)
            .order('created_at', { ascending: false });

        if (error || !data) return [];

        return data.map(r => ({
            referrerId: r.referrer_id,
            referredUserId: r.referred_user_id,
            referralCode: r.referral_code,
            status: r.status as any,
            createdAt: new Date(r.created_at),
            completedAt: r.completed_at ? new Date(r.completed_at) : undefined
        }));
    }

    private generateCode(length: number): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 (avoid confusion)
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    private isValidUUID(id: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
    }
}

export const referralService = new ReferralService();
