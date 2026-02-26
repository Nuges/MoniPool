// ============================================================
// SAFE ZONE — DO NOT MODIFY WITHOUT EXPLICIT REVIEW
// Service: PoolService
// Handles: Pool assignment, auto-creation, status management
// Database Backed (Supabase)
// Last updated: Phase 2 Integration
// ============================================================

import { supabase } from './supabaseClient';
import { Pool, Tier, Cycle, PoolStatus, PoolMember, PoolInvite } from '../models/schema';
import { TIERS, getTierConfig } from '../../constants/Tiers';
import { protectionFundService } from './business/ProtectionFundService';
import { feeService } from './business/FeeService';
import { payoutSequencerService } from './business/PayoutSequencerService';
import { escrowService } from './business/EscrowService';

export class PoolService {
    // Configuration Rules
    private readonly POOL_CAPACITY = 5; // Configurable max users

    private parseTierAmount(tier: Tier): number {
        const config = getTierConfig(tier);
        return config ? config.amount : 0;
    }

    private async createPool(tier: Tier, cycle: Cycle, series: number): Promise<Pool> {
        const tierAmount = this.parseTierAmount(tier);
        const monthlyContribution = tierAmount / this.POOL_CAPACITY;
        const contributionPerCycle = this.convertMonthlyToFrequency(monthlyContribution, cycle);

        const newPoolData = {
            name: `Pool ${tier.toUpperCase()} #${series}`,
            tier,
            cycle,
            amount: tierAmount,
            contribution_amount: contributionPerCycle,
            capacity: this.POOL_CAPACITY,
            current_members_count: 0,
            min_trust_score: 50,
            status: 'filling',
        };

        const { data, error } = await supabase
            .from('pools')
            .insert(newPoolData)
            .select()
            .single();

        if (error || !data) {
            console.error('[PoolService] Failed to create pool:', error);
            throw new Error('Failed to create pool');
        }
        return this.mapPool(data, []);
    }

    // MAIN ASSIGNMENT LOGIC
    async findOrJoinPool(
        tier: Tier,
        poolCycle: Cycle,
        userId: string,
        contributionFrequency: Cycle,
        goalTitle: string,
        goalDescription?: string
    ): Promise<Pool> {
        // 0. CHECK ELIGIBILITY FIRST
        const eligibility = await this.checkTierEligibility(userId, tier);
        if (!eligibility.eligible) {
            throw new Error(eligibility.message);
        }

        // 1. Find FILLING pool
        let targetPool: Pool | undefined = undefined;

        const { data: fillingPools, error: fetchError } = await supabase
            .from('pools')
            .select('*, members:pool_members(*)')
            .eq('tier', tier)
            .eq('cycle', poolCycle)
            .eq('status', 'filling')
            .order('created_at', { ascending: true })
            .limit(1);

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('[PoolService] Error finding pool:', fetchError);
        }

        if (fillingPools && fillingPools.length > 0) {
            const fp = fillingPools[0];
            if (fp.current_members_count < (fp.capacity ?? this.POOL_CAPACITY)) {
                targetPool = this.mapPool(fp, fp.members || []);
            }
        }

        // 2. If no available pool, CREATE next in series
        if (!targetPool) {
            const { count } = await supabase
                .from('pools')
                .select('*', { count: 'exact', head: true })
                .eq('tier', tier)
                .eq('cycle', poolCycle);

            const series = (count || 0) + 1;
            targetPool = await this.createPool(tier, poolCycle, series);
        }

        // Guard: Only filling pools accept new members
        if (targetPool.status !== 'filling') {
            throw new Error(`Cannot join pool ${targetPool.id}: status is '${targetPool.status}', must be 'filling'.`);
        }

        // 3. User already in?
        const isMember = targetPool.members.some(m => m.userId === userId);
        if (isMember) {
            return targetPool; // Idempotency
        }

        // 4. Join — Provisional slot = next available position
        // The FINAL trust-based resequencing happens when the pool LOCKS (5/5 members).
        // During filling, use simple sequential slots so payout dates look correct.
        const poolCapacity = targetPool.capacity ?? this.POOL_CAPACITY;
        const payoutSlot = targetPool.currentMembers + 1;
        const cycleDurationDays = this.getCycleDurationDays(targetPool.cycle);

        const referenceDate = targetPool.startDate || new Date();
        const payoutDate = new Date(referenceDate);
        payoutDate.setDate(payoutDate.getDate() + (payoutSlot * cycleDurationDays));

        const { error: memberError } = await supabase
            .from('pool_members')
            .insert({
                pool_id: targetPool.id,
                user_id: userId,
                payout_slot: payoutSlot,
                payout_date: payoutDate.toISOString(),
                goal_title: goalTitle,
                goal_description: goalDescription,
                contribution_frequency: contributionFrequency
            });

        if (memberError) {
            console.error('[PoolService] Failed to add member:', memberError);
            throw new Error('Could not join pool');
        }

        // Lock first contribution in escrow (proves liquidity)
        try {
            const firstContribution = targetPool.contributionAmount;
            if (firstContribution > 0) {
                await escrowService.lockFunds(userId, targetPool.id, firstContribution);
            }
        } catch (escrowError: any) {
            // If escrow lock fails, remove the member from the pool
            await supabase.from('pool_members')
                .delete()
                .eq('pool_id', targetPool.id)
                .eq('user_id', userId);
            throw new Error(escrowError.message || 'Failed to lock contribution. Please fund your wallet.');
        }

        targetPool.currentMembers++;

        const newMemberObj: PoolMember = {
            id: userId,
            name: userId, // Placeholder — mapped in UI or by joined query
            trustScore: 50,
            trustLevel: 'growing',
            payoutOrder: payoutSlot,
            hasPaid: false,
            hasReceived: false,
            userId,
            joinedAt: new Date(),
            contributionFrequency,
            nextDeductionDate: this.calculateNextDeduction(contributionFrequency),
            payoutSlot,
            payoutDate,
            goalTitle,
            goalDescription
        };

        targetPool.members.push(newMemberObj);

        let newStatus: PoolStatus = targetPool.status;
        let newStartDate = targetPool.startDate;

        // 5. Check Completion
        if (targetPool.currentMembers >= (targetPool.capacity ?? this.POOL_CAPACITY)) {
            newStatus = 'locked';
            newStartDate = new Date();
        }

        await supabase
            .from('pools')
            .update({
                current_members_count: targetPool.currentMembers,
                status: newStatus,
                start_date: newStartDate?.toISOString()
            })
            .eq('id', targetPool.id);


        targetPool.status = newStatus;
        targetPool.startDate = newStartDate;

        // CRITICAL: Resequence all members by trust score when pool locks
        if (newStatus === 'locked' && newStartDate) {
            const poolCapacityFinal = targetPool.capacity ?? this.POOL_CAPACITY;
            const assignments = await payoutSequencerService.resequencePool(targetPool.id, poolCapacityFinal);

            for (const a of assignments) {
                const d = new Date(newStartDate);
                d.setDate(d.getDate() + (a.assignedSlot * cycleDurationDays));
                await supabase
                    .from('pool_members')
                    .update({ payout_date: d.toISOString() })
                    .eq('pool_id', targetPool.id)
                    .eq('user_id', a.userId);
            }
        }

        return targetPool;
    }

    /**
     * TIERED PROGRESSION LOGIC
     */
    async checkTierEligibility(userId: string, tier: Tier): Promise<{ eligible: boolean; message: string; nextUnlock?: string }> {
        const config = getTierConfig(tier);
        if (!config) return { eligible: false, message: 'Invalid Tier' };

        // 1. If it's open by default or has no prerequisite, it's OPEN
        if (config.isOpenByDefault || !config.requiredTierId) {
            return { eligible: true, message: 'Unlocked' };
        }

        const requiredTier = config.requiredTierId;

        // 2. Check if user COMPLETED the required tier
        const { data, error } = await supabase
            .from('pool_members')
            .select('pool_id, pools!inner(tier, status)')
            .eq('user_id', userId)
            .eq('pools.tier', requiredTier)
            .eq('pools.status', 'completed')
            .limit(1);

        const hasCompletedRequired = data && data.length > 0;

        if (hasCompletedRequired) {
            return { eligible: true, message: 'Unlocked' };
        }

        return {
            eligible: false,
            message: `Complete ${getTierConfig(requiredTier)?.label || requiredTier} (${requiredTier}) cycle to unlock.`
        };
    }

    private calculateNextDeduction(frequency: Cycle): Date {
        const date = new Date();
        if (frequency === 'daily') date.setDate(date.getDate() + 1);
        if (frequency === 'weekly') date.setDate(date.getDate() + 7);
        if (frequency === 'monthly') date.setMonth(date.getMonth() + 1);
        return date;
    }

    async getPools(): Promise<Pool[]> {
        const { data, error } = await supabase
            .from('pools')
            .select('*, members:pool_members(*)')
            .eq('is_private', false);

        if (error || !data) return [];
        return data.map(p => this.mapPool(p, p.members || []));
    }

    // --- PRIVATE POOLS LOGIC ---

    async requestPrivatePool(tier: Tier, cycle: Cycle, userId: string): Promise<Pool> {
        const { data: user } = await supabase.from('profiles').select('kyc_level').eq('id', userId).single();
        if (!user || user.kyc_level === 'basic') {
            throw new Error('You must complete full KYC to create a Private Pool.');
        }

        /* BYPASS FOR TESTING:
        const { data: completedPools } = await supabase
            .from('pool_members')
            .select('pool_id, pools!inner(status)')
            .eq('user_id', userId)
            .eq('pools.status', 'completed')
            .limit(1);

        if (!completedPools || completedPools.length === 0) {
            throw new Error('You must successfully complete at least 1 pool before creating a Private Pool.');
        }
        */

        const { data: existingPrivate } = await supabase
            .from('pools')
            .select('id')
            .eq('created_by', userId)
            .in('status', ['filling', 'locked', 'active'])
            .limit(1);

        if (existingPrivate && existingPrivate.length > 0) {
            throw new Error('You already have an active private pool.');
        }

        const tierAmount = this.parseTierAmount(tier);
        const monthlyContribution = tierAmount / this.POOL_CAPACITY;
        const contributionPerCycle = this.convertMonthlyToFrequency(monthlyContribution, cycle);

        const newPoolData = {
            name: `Private ${tier.toUpperCase()}`,
            tier,
            cycle,
            amount: tierAmount,
            contribution_amount: contributionPerCycle,
            capacity: this.POOL_CAPACITY,
            current_members_count: 0,
            min_trust_score: 50,
            status: 'filling',
            is_private: true,
            created_by: userId,
            approval_status: 'approved' // Auto-approved
        };

        const { data, error } = await supabase
            .from('pools')
            .insert(newPoolData)
            .select()
            .single();

        if (error || !data) {
            console.error('[PoolService] Failed to create private pool:', error);
            throw new Error('Failed to create private pool');
        }

        return await this.joinSpecificPool(data.id, userId, cycle, 'My Private Goal');
    }

    async joinSpecificPool(
        poolId: string,
        userId: string,
        contributionFrequency: Cycle,
        goalTitle: string,
        goalDescription?: string
    ): Promise<Pool> {
        const { data: targetPoolData, error: fetchError } = await supabase
            .from('pools')
            .select('*, members:pool_members(*)')
            .eq('id', poolId)
            .single();

        if (fetchError || !targetPoolData) throw new Error('Pool not found');
        let targetPool = this.mapPool(targetPoolData, targetPoolData.members || []);

        if (targetPool.status !== 'filling') {
            throw new Error(`Cannot join pool: status is '${targetPool.status}'.`);
        }

        const isMember = targetPool.members.some(m => m.userId === userId);
        if (isMember) return targetPool;

        if (targetPool.currentMembers >= (targetPool.capacity ?? this.POOL_CAPACITY)) {
            throw new Error('Pool is already full.');
        }

        // Provisional slot = next position (trust-based resequencing happens at lock)
        const poolCapacity = targetPool.capacity ?? this.POOL_CAPACITY;
        const payoutSlot = targetPool.currentMembers + 1;
        const cycleDurationDays = this.getCycleDurationDays(targetPool.cycle);

        const referenceDate = targetPool.startDate || new Date();
        const payoutDate = new Date(referenceDate);
        payoutDate.setDate(payoutDate.getDate() + (payoutSlot * cycleDurationDays));

        const { error: memberError } = await supabase
            .from('pool_members')
            .insert({
                pool_id: targetPool.id,
                user_id: userId,
                payout_slot: payoutSlot,
                payout_date: payoutDate.toISOString(),
                goal_title: goalTitle,
                goal_description: goalDescription,
                contribution_frequency: contributionFrequency
            });

        if (memberError) {
            console.error('[PoolService] Failed to add member:', memberError);
            throw new Error('Could not join pool');
        }

        // Lock first contribution in escrow (proves liquidity)
        try {
            const firstContribution = targetPool.contributionAmount;
            if (firstContribution > 0) {
                await escrowService.lockFunds(userId, targetPool.id, firstContribution);
            }
        } catch (escrowError: any) {
            await supabase.from('pool_members')
                .delete()
                .eq('pool_id', targetPool.id)
                .eq('user_id', userId);
            throw new Error(escrowError.message || 'Failed to lock contribution. Please fund your wallet.');
        }

        targetPool.currentMembers++;
        let newStatus: PoolStatus = targetPool.status;
        let newStartDate = targetPool.startDate;
        if (targetPool.currentMembers >= (targetPool.capacity ?? this.POOL_CAPACITY)) {
            newStatus = 'locked';
            newStartDate = new Date();
        }

        await supabase
            .from('pools')
            .update({
                current_members_count: targetPool.currentMembers,
                status: newStatus,
                start_date: newStartDate?.toISOString()
            })
            .eq('id', targetPool.id);

        if (newStatus === 'locked' && newStartDate) {
            const poolCapacityFinal = targetPool.capacity ?? this.POOL_CAPACITY;
            const assignments = await payoutSequencerService.resequencePool(targetPool.id, poolCapacityFinal);

            for (const a of assignments) {
                const d = new Date(newStartDate);
                d.setDate(d.getDate() + (a.assignedSlot * cycleDurationDays));
                await supabase
                    .from('pool_members')
                    .update({ payout_date: d.toISOString() })
                    .eq('pool_id', targetPool.id)
                    .eq('user_id', a.userId);
            }
        }

        targetPool.status = newStatus;
        targetPool.startDate = newStartDate;
        return targetPool;
    }

    async inviteUserToPool(poolId: string, inviterId: string, targetEmailOrPhone: string): Promise<boolean> {
        const { data: targetUser } = await supabase
            .from('profiles')
            .select('id, kyc_level')
            .or(`email.eq.${targetEmailOrPhone},phone.eq.${targetEmailOrPhone}`)
            .single();

        if (!targetUser) throw new Error('User not found. Please check their email or phone number.');
        if (targetUser.kyc_level === 'basic') throw new Error('Invitee must complete KYC before they can be invited to a private pool.');

        const { error } = await supabase.from('pool_invites').insert({
            pool_id: poolId,
            inviter_id: inviterId,
            invitee_id: targetUser.id,
            status: 'pending'
        });

        if (error) {
            if (error.code === '23505') throw new Error('User has already been invited.');
            throw new Error('Failed to send invite.');
        }
        return true;
    }

    async getMyInvites(userId: string): Promise<PoolInvite[]> {
        const { data, error } = await supabase
            .from('pool_invites')
            .select(`
                *,
                pools(name, tier),
                profiles!pool_invites_inviter_id_fkey(first_name, last_name)
            `)
            .eq('invitee_id', userId)
            .eq('status', 'pending');

        if (error || !data) return [];
        return data.map(d => ({
            id: d.id,
            poolId: d.pool_id,
            inviterId: d.inviter_id,
            inviteeId: d.invitee_id,
            status: d.status,
            createdAt: new Date(d.created_at),
            poolName: d.pools?.name,
            tier: d.pools?.tier,
            inviterName: `${d.profiles?.first_name || ''} ${d.profiles?.last_name || ''}`.trim() || 'A User'
        }));
    }

    async acceptPoolInvite(inviteId: string, userId: string, frequency: Cycle, goal: string): Promise<Pool> {
        const { data: invite } = await supabase.from('pool_invites').select('*').eq('id', inviteId).single();
        if (!invite || invite.invitee_id !== userId || invite.status !== 'pending') {
            throw new Error('Invalid or expired invite.');
        }

        const pool = await this.joinSpecificPool(invite.pool_id, userId, frequency, goal);
        await supabase.from('pool_invites').update({ status: 'accepted' }).eq('id', inviteId);
        return pool;
    }

    async getPrivatePools(): Promise<Pool[]> {
        const { data, error } = await supabase
            .from('pools')
            .select('*, members:pool_members(*)')
            .eq('is_private', true);

        if (error || !data) return [];
        return data.map(p => this.mapPool(p, p.members || []));
    }

    async getPoolById(poolId: string): Promise<Pool | undefined> {
        const { data, error } = await supabase
            .from('pools')
            .select('*, members:pool_members(*)')
            .eq('id', poolId)
            .single();

        if (error || !data) return undefined;
        return this.mapPool(data, data.members || []);
    }

    async getMemberCountForTier(tier: Tier): Promise<{ current: number; capacity: number }> {
        const { data } = await supabase
            .from('pools')
            .select('current_members_count, capacity')
            .eq('tier', tier)
            .eq('status', 'filling')
            .limit(1)
            .single();

        if (data) {
            return { current: data.current_members_count, capacity: data.capacity ?? this.POOL_CAPACITY };
        }
        return { current: 0, capacity: this.POOL_CAPACITY };
    }

    getContributionBreakdown(tier: Tier): { daily: number; weekly: number; monthly: number } {
        const tierAmount = this.parseTierAmount(tier);
        const monthlyShare = tierAmount / this.POOL_CAPACITY;

        return {
            daily: Math.ceil(monthlyShare / 30),
            weekly: Math.ceil(monthlyShare / 4), // Should equal config.weeklyContribution
            monthly: monthlyShare,
        };
    }

    private getCycleDurationDays(cycle: Cycle): number {
        switch (cycle) {
            case 'daily': return 1;
            case 'weekly': return 7;
            case 'monthly': return 30;
            default: return 7;
        }
    }

    private convertMonthlyToFrequency(monthlyAmount: number, frequency: Cycle): number {
        switch (frequency) {
            case 'daily': return Math.ceil(monthlyAmount / 30);
            case 'weekly': return Math.ceil(monthlyAmount / 4);
            case 'monthly': return monthlyAmount;
            default: return monthlyAmount;
        }
    }

    calculateContributionAmount(tier: Tier, _poolCycle: Cycle, userFrequency: Cycle): number {
        const tierAmount = this.parseTierAmount(tier);
        const monthlyShare = tierAmount / this.POOL_CAPACITY;
        return this.convertMonthlyToFrequency(monthlyShare, userFrequency);
    }

    async calculateTotalRecurringDeduction(tier: Tier, userFrequency: 'daily' | 'weekly' | 'monthly', userId: string): Promise<{
        total: number;
        contribution: number;
        fee: number;
        fund: number;
        gatewayFee: number;
        stampDuty: number;
        vat: number;
    }> {
        const tierAmount = this.parseTierAmount(tier);
        const monthlyContribution = tierAmount / this.POOL_CAPACITY;

        let contribution = monthlyContribution;
        if (userFrequency === 'daily') contribution = Math.ceil(monthlyContribution / 30);
        if (userFrequency === 'weekly') contribution = Math.ceil(monthlyContribution / 4);

        const fee = await feeService.calculateRecurringFee(monthlyContribution, userFrequency, userId);
        const fund = protectionFundService.calculateRecurringFund(monthlyContribution, userFrequency);
        const gatewayFee = feeService.calculateGatewayFee(contribution);

        const subTotal = contribution + fee + fund + gatewayFee;
        const stampDuty = feeService.calculateStampDuty(subTotal);
        const vat = feeService.calculateVAT(fee + gatewayFee);

        const total = contribution + fee + fund + gatewayFee + stampDuty + vat;

        return {
            total,
            contribution,
            fee,
            fund,
            gatewayFee,
            stampDuty,
            vat
        };
    }

    async getPreviewInfo(tier: Tier, poolCycle: Cycle): Promise<{ slot: number; date: Date }> {
        const { data: targetPool } = await supabase
            .from('pools')
            .select('current_members_count, cycle, start_date')
            .eq('tier', tier)
            .eq('cycle', poolCycle)
            .eq('status', 'filling')
            .limit(1)
            .single();

        if (!targetPool) {
            const slot = 1;
            const duration = this.getCycleDurationDays(poolCycle);
            const date = new Date();
            date.setDate(date.getDate() + (slot * duration));
            return { slot, date };
        }

        const slot = targetPool.current_members_count + 1;
        const duration = this.getCycleDurationDays(targetPool.cycle);
        const referenceDate = targetPool.start_date ? new Date(targetPool.start_date) : new Date();
        const date = new Date(referenceDate);
        date.setDate(date.getDate() + (slot * duration));

        return { slot, date };
    }

    // DB Mapping
    private mapPool(row: any, membersRow: any[]): Pool {
        return {
            id: row.id,
            name: row.name,
            tier: row.tier as Tier,
            cycle: row.cycle as Cycle,
            series: row.series || 1, // Optional: add to DB if needed
            capacity: row.capacity,
            amount: parseFloat(row.amount),
            contributionAmount: parseFloat(row.contribution_amount),
            payoutAmount: parseFloat(row.amount),
            totalMembers: row.capacity,
            currentMembers: row.current_members_count,
            minTrustScore: row.min_trust_score,
            members: membersRow.map(m => this.mapMember(m)),
            currentCycle: row.current_cycle || 0,
            totalCycles: row.capacity,
            nextPayoutDate: '', // Can be computed
            nextPayoutMember: '', // Can be computed
            status: row.status as PoolStatus,
            progress: row.capacity ? (row.current_members_count / row.capacity) * 100 : 0,
            startDate: row.start_date ? new Date(row.start_date) : undefined,
            createdAt: new Date(row.created_at),
            isPrivate: row.is_private,
            createdBy: row.created_by,
            approvalStatus: row.approval_status
        };
    }

    private mapMember(row: any): PoolMember {
        return {
            id: row.user_id, // Map for UI expectation of user.id
            name: 'User', // Requires lookup or join if needed
            trustScore: 50,
            trustLevel: 'growing',
            payoutOrder: row.payout_slot,
            hasPaid: row.contributions_made > 0,
            hasReceived: row.has_received_payout,
            userId: row.user_id,
            joinedAt: new Date(row.joined_at),
            contributionFrequency: row.contribution_frequency,
            nextDeductionDate: new Date(),
            payoutSlot: row.payout_slot,
            payoutDate: row.payout_date ? new Date(row.payout_date) : undefined,
            goalTitle: row.goal_title,
            goalDescription: row.goal_description
        };
    }
}

export const poolService = new PoolService();
