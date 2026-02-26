// MoniPool — Browse Pools screen
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { Spacing, BorderRadius } from '../../constants/Layout';
import { TIERS } from '../../constants/Tiers';
import { poolService } from '../services/PoolService';
import { Pool, Tier, PoolInvite } from '../models/schema';
import { trustGateService } from '../services/business/TrustGateService';
import JoinPoolModal from '../../components/JoinPoolModal';
import CreatePrivatePoolModal from '../../components/CreatePrivatePoolModal';
import ManagePrivatePoolModal from '../../components/ManagePrivatePoolModal';
import { useAuth } from '../context/AuthContext';

type TierStats = {
    members: { current: number, capacity: number };
    breakdown: any;
    isLocked: boolean;
    hasMembers: boolean;
    tierProgression: { eligible: boolean, message: string };
};

export default function BrowsePools() {
    const { userId } = useAuth();
    const [pools, setPools] = useState<Pool[]>([]);
    const [privatePools, setPrivatePools] = useState<Pool[]>([]);
    const [myInvites, setMyInvites] = useState<PoolInvite[]>([]);
    const [poolTab, setPoolTab] = useState<'public' | 'private'>('public');

    const [tierStats, setTierStats] = useState<Record<string, TierStats>>({});
    const [loading, setLoading] = useState(true);

    // Modals
    const [joinModalVisible, setJoinModalVisible] = useState(false);
    const [selectedTier, setSelectedTier] = useState<Tier>('100k');
    const [createPrivateVisible, setCreatePrivateVisible] = useState(false);
    const [managePrivateVisible, setManagePrivateVisible] = useState(false);
    const [selectedPrivatePool, setSelectedPrivatePool] = useState<Pool | null>(null);

    const loadPools = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const [p, priv, invites] = await Promise.all([
                poolService.getPools(),
                poolService.getPrivatePools(),
                poolService.getMyInvites(userId)
            ]);
            setPools(p ? [...p] : []);
            setPrivatePools(priv ? [...priv] : []);
            setMyInvites(invites ? [...invites] : []);

            const stats: Record<string, TierStats> = {};
            for (const config of TIERS) {
                const tier = config.id;
                const members = await poolService.getMemberCountForTier(tier);
                const breakdown = poolService.getContributionBreakdown(tier);
                const tierProgression = await poolService.checkTierEligibility(userId, tier);

                stats[tier] = {
                    members,
                    breakdown,
                    tierProgression,
                    isLocked: !tierProgression.eligible,
                    hasMembers: members.current > 0
                };
            }
            setTierStats(stats);
        } catch (error) {
            console.error('[Pools] Error loading pools:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadPools();
        }, [userId])
    );

    const handleJoin = async (tier: Tier) => {
        if (!userId) return;

        // 1. Trust score eligibility check
        const trustCheck = await trustGateService.checkEligibility(userId, tier);
        if (!trustCheck.eligible) {
            Alert.alert('Not Eligible', trustCheck.message, [{ text: 'OK' }]);
            return;
        }

        // 2. Tier Progression check
        const tierCheck = await poolService.checkTierEligibility(userId, tier);
        if (!tierCheck.eligible) {
            Alert.alert('Locked Tier', tierCheck.message, [{ text: 'OK' }]);
            return;
        }

        // 3. Open Modal
        setSelectedTier(tier);
        setJoinModalVisible(true);
    };

    const handleAcceptInvite = async (inviteId: string) => {
        if (!userId) return;
        setLoading(true);
        try {
            await poolService.acceptPoolInvite(inviteId, userId, 'monthly', 'Accepted Invite Goal');
            Alert.alert('Success', 'You have joined the private pool!');
            loadPools();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to accept invite');
        } finally {
            setLoading(false);
        }
    };

    // Format tier label for display
    const formatTierLabel = (tier: Tier) => {
        const config = TIERS.find(t => t.id === tier);
        if (config) {
            if (config.amount >= 1000000) {
                return `₦${(config.amount / 1000000).toLocaleString()}M`;
            }
            return `₦${(config.amount / 1000).toLocaleString()}k`;
        }
        return tier.toUpperCase();
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Pools</Text>

                {/* Segmented Control */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, poolTab === 'public' && styles.tabButtonActive]}
                        onPress={() => setPoolTab('public')}
                    >
                        <Text style={[styles.tabText, poolTab === 'public' && styles.tabTextActive]}>Public</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabButton, poolTab === 'private' && styles.tabButtonActive]}
                        onPress={() => setPoolTab('private')}
                    >
                        <Text style={[styles.tabText, poolTab === 'private' && styles.tabTextActive]}>Private</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {poolTab === 'public' && (
                    <>
                        <Text style={styles.sectionTitle}>
                            Available Tiers
                        </Text>
                        <View style={styles.tierGrid}>
                            {TIERS.map(config => {
                                const tier = config.id;
                                const stats = tierStats[tier];
                                if (!stats) return null;

                                const { members, breakdown, hasMembers, tierProgression, isLocked } = stats;

                                return (
                                    <TouchableOpacity
                                        key={tier}
                                        style={[
                                            styles.tierCard,
                                            hasMembers && styles.tierCardActive,
                                            isLocked && styles.tierCardLocked
                                        ]}
                                        onPress={() => handleJoin(tier)}
                                        disabled={false} // Allow press to show locked message via alert
                                    >
                                        {/* Tier amount & Label */}
                                        <Text style={[styles.tierAmount, isLocked && { color: Colors.textMuted }]}>
                                            {formatTierLabel(tier)}
                                        </Text>
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: isLocked ? Colors.textMuted : Colors.secondary, marginBottom: 8 }}>
                                            {config.label}
                                        </Text>

                                        {/* Contribution per week */}
                                        {!isLocked ? (
                                            <View style={{ marginBottom: 8 }}>
                                                <Text style={styles.tierContribution}>
                                                    ₦{breakdown.weekly.toLocaleString()}/wk
                                                </Text>
                                            </View>
                                        ) : (
                                            <View style={{ marginBottom: 8, alignItems: 'center' }}>
                                                <Text style={styles.tierContribution}>Locked 🔒</Text>
                                                <Text style={{ fontSize: 10, color: Colors.textMuted, textAlign: 'center', marginTop: 2, paddingHorizontal: 4 }}>
                                                    {tierProgression.message}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Member count with icon */}
                                        {!isLocked && (
                                            <>
                                                <View style={styles.tierMembersRow}>
                                                    <MaterialIcons
                                                        name={hasMembers ? 'group' : 'group-add'}
                                                        size={14}
                                                        color={hasMembers ? Colors.primary : Colors.textMuted}
                                                    />
                                                    <Text style={[
                                                        styles.tierMembersText,
                                                        hasMembers && { color: Colors.primary },
                                                    ]}>
                                                        {members.current}/{members.capacity}
                                                    </Text>
                                                </View>

                                                {/* Mini progress bar */}
                                                <View style={styles.tierProgressBar}>
                                                    <View style={[
                                                        styles.tierProgressFill,
                                                        { width: `${(members.current / members.capacity) * 100}%` },
                                                    ]} />
                                                </View>
                                            </>
                                        )}

                                        {/* Join button */}
                                        <View style={[styles.joinButton, isLocked && { backgroundColor: Colors.border }]}>
                                            <MaterialIcons
                                                name={isLocked ? "lock" : "add"}
                                                size={14}
                                                color={isLocked ? Colors.textMuted : Colors.primary}
                                            />
                                            <Text style={[styles.joinText, isLocked && { color: Colors.textMuted }]}>
                                                {isLocked ? "Locked" : "Join"}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </>
                )}

                {poolTab === 'private' && (
                    <>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
                            <Text style={styles.sectionTitle}>Private Hub</Text>
                            <TouchableOpacity onPress={() => setCreatePrivateVisible(true)} style={[styles.joinButton, { marginTop: 0 }]}>
                                <Text style={styles.joinText}>+ Create</Text>
                            </TouchableOpacity>
                        </View>

                        {/* PENDING INVITES */}
                        {myInvites.length > 0 && (
                            <View style={{ marginBottom: Spacing['2xl'] }}>
                                <Text style={{ color: Colors.textMuted, fontSize: 13, marginBottom: 8, fontWeight: '700' }}>PENDING INVITES</Text>
                                {myInvites.map(inv => (
                                    <View key={inv.id} style={[styles.poolCard, { borderColor: Colors.primary, marginBottom: 8 }]}>
                                        <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 16 }}>{inv.poolName || 'Private Pool'}</Text>
                                        <Text style={{ color: Colors.textSecondary, fontSize: 13, marginBottom: 16 }}>Invited by {inv.inviterName}</Text>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <TouchableOpacity
                                                style={[styles.btnPrimary, { flex: 1, padding: 12, borderRadius: 8 }]}
                                                onPress={() => handleAcceptInvite(inv.id)}
                                            >
                                                <Text style={{ color: Colors.background, fontWeight: '700', textAlign: 'center' }}>Accept</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                )}

                {/* Active Pools List */}
                <Text style={[styles.sectionTitle, { marginTop: poolTab === 'public' ? Spacing['2xl'] : Spacing.md }]}>
                    Your {poolTab === 'public' ? 'Active' : 'Private'} Pools
                </Text>

                {(() => {
                    const displayPools = poolTab === 'public' ? pools : privatePools;
                    const myPools = displayPools.filter(p => p.members.some(m => m.userId === userId || m.id === userId));

                    if (myPools.length === 0) {
                        return (
                            <View style={styles.emptyCard}>
                                <MaterialIcons name="group-add" size={32} color={Colors.textMuted} />
                                <Text style={styles.emptyText}>You haven't joined any {poolTab} pools yet.</Text>
                            </View>
                        );
                    }

                    return myPools.map(pool => {
                        // Find current user's member info
                        const myMember = pool.members.find(m => m.userId === userId || m.id === userId);

                        // Calculate countdown if member exists
                        let countdownDisplay = 'Pending';
                        let dateDisplay = 'TBD';

                        if (myMember && myMember.payoutDate) {
                            const pDate = new Date(myMember.payoutDate);
                            const now = new Date();
                            const diff = pDate.getTime() - now.getTime();
                            const dDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
                            countdownDisplay = dDays > 0 ? `${dDays} days left` : 'Due now';
                            dateDisplay = pDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                        }

                        return (
                            <TouchableOpacity
                                key={pool.id}
                                style={styles.poolCard}
                                activeOpacity={0.9}
                                onPress={() => router.push(`/pool/${pool.id}`)}
                            >
                                <View style={styles.poolHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <MaterialIcons name="groups" size={24} color={Colors.primary} />
                                            <View>
                                                <Text style={styles.poolTitle}>
                                                    {formatTierLabel(pool.tier || '100k')} Pool
                                                </Text>
                                                {myMember?.goalTitle && (
                                                    <Text style={{ color: Colors.secondary, fontSize: 13, fontWeight: '600' }}>
                                                        🎯 {myMember.goalTitle}
                                                    </Text>
                                                )}
                                                <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
                                                    {pool.cycle === 'monthly' ? 'Monthly Cycle' : 'Weekly Cycle'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        {/* Creator Invite Button */}
                                        {pool.isPrivate && pool.createdBy === userId && pool.status === 'filling' && (
                                            <TouchableOpacity
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedPrivatePool(pool);
                                                    setManagePrivateVisible(true);
                                                }}
                                                style={{ paddingHorizontal: 12, height: 30, borderRadius: 15, backgroundColor: `${Colors.primary}20`, alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '600' }}>+ Invite</Text>
                                            </TouchableOpacity>
                                        )}

                                        <TouchableOpacity
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                router.push(`/pool/${pool.id}/chat`);
                                            }}
                                            style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 18,
                                                backgroundColor: Colors.background,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <MaterialIcons name="chat-bubble-outline" size={18} color={Colors.text} />
                                        </TouchableOpacity>
                                        <View style={[
                                            styles.statusBadge,
                                            pool.status === 'locked' ? { backgroundColor: Colors.success } : {}
                                        ]}>
                                            <Text style={styles.statusText}>
                                                {pool.status === 'locked' ? 'ACTIVE' : `#${pool.series}`}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Payout Info Section - Prominent Display */}
                                <View style={{
                                    backgroundColor: Colors.background,
                                    padding: 12,
                                    borderRadius: 8,
                                    marginBottom: 12,
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: Colors.border
                                }}>
                                    <View>
                                        <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 2 }}>your payout date</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <MaterialIcons name="event" size={14} color={Colors.secondary} />
                                            <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 16 }}>{dateDisplay}</Text>
                                        </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 2 }}>countdown</Text>
                                        <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 16 }}>{countdownDisplay}</Text>
                                    </View>
                                </View>

                                {/* Contribution Info */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <View>
                                        <Text style={{ color: Colors.textMuted, fontSize: 12 }}>Your Contribution</Text>
                                        <Text style={{ color: Colors.text, fontWeight: '600' }}>
                                            ₦{(myMember && myMember.contributionFrequency && pool.tier ? poolService.calculateContributionAmount(pool.tier, pool.cycle, myMember.contributionFrequency) : pool.contributionAmount).toLocaleString()} <Text style={{ fontSize: 10 }}>/ {myMember?.contributionFrequency || pool.cycle}</Text>
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ color: Colors.textMuted, fontSize: 12 }}>Your Plan</Text>
                                        <Text style={{ color: Colors.text, fontWeight: '600' }}>
                                            {myMember?.contributionFrequency ? myMember.contributionFrequency.charAt(0).toUpperCase() + myMember.contributionFrequency.slice(1) : 'Standard'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.progressContainer}>
                                    <View style={styles.progressBar}>
                                        <View
                                            style={[
                                                styles.progressFill,
                                                { width: `${(pool.currentMembers / (pool.capacity ?? pool.totalMembers)) * 100}%` }
                                            ]}
                                        />
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <MaterialIcons name="person" size={14} color={Colors.textMuted} />
                                        <Text style={styles.progressText}>
                                            {pool.currentMembers}/{pool.capacity} members
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    });
                })()}
            </ScrollView>

            <JoinPoolModal
                visible={joinModalVisible}
                tier={selectedTier}
                onClose={() => setJoinModalVisible(false)}
                onSuccess={loadPools}
            />

            <CreatePrivatePoolModal
                visible={createPrivateVisible}
                onClose={() => setCreatePrivateVisible(false)}
                onSuccess={loadPools}
            />

            {selectedPrivatePool && (
                <ManagePrivatePoolModal
                    visible={managePrivateVisible}
                    poolId={selectedPrivatePool.id}
                    onClose={() => {
                        setManagePrivateVisible(false);
                        setSelectedPrivatePool(null);
                    }}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.md,
        paddingTop: Spacing.lg,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.full,
        padding: 4,
        marginTop: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
    },
    tabButtonActive: {
        backgroundColor: Colors.primary,
    },
    tabText: {
        color: Colors.textMuted,
        fontWeight: '600',
        fontSize: 14,
    },
    tabTextActive: {
        color: Colors.background,
    },
    btnPrimary: {  // Added for generic buttons
        backgroundColor: Colors.primary,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.text,
    },
    content: {
        padding: Spacing.xl,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.md,
    },
    poolCard: {
        backgroundColor: Colors.card,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    poolHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    poolTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    statusBadge: {
        backgroundColor: `${Colors.primary}20`,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    statusText: {
        color: Colors.primary,
        fontWeight: '700',
        fontSize: 12,
        textTransform: 'uppercase',
    },
    progressContainer: {
        gap: 8,
    },
    progressBar: {
        height: 8,
        backgroundColor: Colors.border,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.primary,
    },
    progressText: {
        color: Colors.textMuted,
        fontSize: 12,
    },
    emptyCard: {
        backgroundColor: Colors.card,
        padding: Spacing['2xl'],
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        gap: 8,
    },
    emptyText: {
        color: Colors.textMuted,
        fontStyle: 'italic',
        fontSize: 13,
    },
    tierGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    tierCard: {
        backgroundColor: Colors.card,
        width: '47%',
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        gap: 6,
    },
    tierCardActive: {
        borderColor: `${Colors.primary}50`,
    },
    tierCardLocked: {
        opacity: 0.6,
        backgroundColor: '#0f0f15',
    },
    tierAmount: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.text,
    },
    tierContribution: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: '500',
    },
    tierMembersRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    tierMembersText: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '600',
    },
    tierProgressBar: {
        width: '100%',
        height: 3,
        backgroundColor: Colors.border,
        borderRadius: 2,
        overflow: 'hidden',
    },
    tierProgressFill: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: 2,
    },
    joinButton: {
        marginTop: 4,
        backgroundColor: `${Colors.primary}15`,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    joinText: {
        color: Colors.primary,
        fontWeight: '700',
        fontSize: 12,
    },
});
