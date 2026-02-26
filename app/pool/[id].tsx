// MoniPool — Pool Detail screen
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { Spacing, BorderRadius, Shadows } from '../../constants/Layout';
import Card from '../../components/Card';
import Avatar from '../../components/Avatar';
import TrustBadge from '../../components/TrustBadge';
import Button from '../../components/Button';
import {
    formatCurrency,
    formatCurrencyFull,
    getCycleLabel,
    getTrustColor,
} from '../utils/formatters';
import { poolService } from '../services/PoolService';
import { trustGateService } from '../services/business/TrustGateService';
import { protectionFundService } from '../services/business/ProtectionFundService';
import { feeService } from '../services/business/FeeService';
import { walletService } from '../services/WalletService';
import { Tier, Pool } from '../models/schema';
import { Alert } from 'react-native';
import JoinPoolModal from '../../components/JoinPoolModal';
import { useAuth } from '../context/AuthContext';

export default function PoolDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { userId } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'schedule'>('overview');
    const [joinModalVisible, setJoinModalVisible] = useState(false);

    const [pool, setPool] = useState<Pool | null>(null);
    const [loading, setLoading] = useState(true);

    const loadPool = async () => {
        if (!id) return;
        try {
            const data = await poolService.getPoolById(id as string);
            setPool(data || null);
        } catch (error) {
            console.error('[PoolDetail] Error loading pool:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadPool();
        }, [id])
    );

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </SafeAreaView>
        );
    }

    if (!pool) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={[styles.header, { justifyContent: 'center' }]}>
                    <Text style={styles.headerTitle}>Pool Not Found</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}>
                    <Text style={{ color: Colors.textMuted, textAlign: 'center', marginBottom: Spacing.lg }}>
                        This pool does not exist or has been removed.
                    </Text>
                    <Button title="Go Back" onPress={() => router.back()} />
                </View>
            </SafeAreaView>
        );
    }

    const handleJoin = async () => {
        if (!pool) return;
        const tier = pool.tier as Tier;
        const currentUserId = userId; // Do not use a fallback 'user1' string as it is not a valid uuid

        if (!currentUserId) {
            Alert.alert('Error', 'You must be logged in to join a pool.');
            return;
        }

        // 1. Trust score eligibility check
        const trustCheck = await trustGateService.checkEligibility(currentUserId, tier);
        if (!trustCheck.eligible) {
            Alert.alert('Not Eligible', trustCheck.message, [{ text: 'OK' }]);
            return;
        }

        // 2. Tier Progression check
        const tierCheck = await poolService.checkTierEligibility(currentUserId, tier);
        if (!tierCheck.eligible) {
            Alert.alert('Locked Tier', tierCheck.message, [{ text: 'OK' }]);
            return;
        }

        setJoinModalVisible(true);
    };

    const statusColor =
        pool.status === 'active'
            ? Colors.secondary
            : pool.status === 'open'
                ? Colors.primary
                : Colors.textMuted;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{pool.name}</Text>
                {/* Find my member to show goal */}
                {(() => {
                    const myMember = pool.members.find(m => m.userId === userId || m.id === userId);
                    if (myMember?.goalTitle) {
                        return (
                            <Text style={{ color: Colors.secondary, fontSize: 12, fontWeight: '700', marginTop: 2 }}>
                                🎯 {myMember.goalTitle}
                            </Text>
                        );
                    }
                    return null;
                })()}
                <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => router.push(`/pool/${id}/chat`)}
                >
                    <MaterialIcons name="chat-bubble-outline" size={20} color={Colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Hero Card */}
                <LinearGradient
                    colors={[Colors.primary, '#1A3A6C']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.heroCard, Shadows.glow]}
                >
                    <View style={styles.heroTop}>
                        <View>
                            <Text style={styles.heroLabel}>Pool Amount</Text>
                            <Text style={styles.heroAmount}>{formatCurrencyFull(pool.amount)}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                            <Text style={[styles.statusText, { color: statusColor }]}>
                                {pool.status.charAt(0).toUpperCase() + pool.status.slice(1)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.heroStats}>
                        <View style={styles.heroStat}>
                            <Text style={styles.heroStatLabel}>Cycle</Text>
                            <Text style={styles.heroStatValue}>{getCycleLabel(pool.cycle)}</Text>
                        </View>
                        <View style={styles.heroStatDivider} />
                        <View style={styles.heroStat}>
                            <Text style={styles.heroStatLabel}>Contribution</Text>
                            <Text style={styles.heroStatValue}>{formatCurrency(pool.contributionAmount)}</Text>
                        </View>
                        <View style={styles.heroStatDivider} />
                        <View style={styles.heroStat}>
                            <Text style={styles.heroStatLabel}>Members</Text>
                            <Text style={styles.heroStatValue}>{pool.currentMembers}/{pool.totalMembers}</Text>
                        </View>
                    </View>

                    {/* Progress */}
                    {pool.status === 'active' && (
                        <View style={styles.heroProgress}>
                            <View style={styles.heroProgressHeader}>
                                <Text style={styles.heroProgressLabel}>
                                    Cycle {pool.currentCycle}/{pool.totalCycles}
                                </Text>
                                <Text style={styles.heroProgressPercent}>{pool.progress}%</Text>
                            </View>
                            <View style={styles.heroProgressBar}>
                                <View style={[styles.heroProgressFill, { width: `${pool.progress}%` }]} />
                            </View>
                        </View>
                    )}
                </LinearGradient>

                {/* Tab switcher */}
                <View style={styles.tabs}>
                    {(['overview', 'members', 'schedule'] as const).map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === tab && styles.tabActive]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Content */}
                {activeTab === 'overview' && (
                    <View style={styles.content}>
                        {/* Next payout */}
                        {pool.status === 'active' && (
                            <Card variant="glass" style={styles.payoutCard}>
                                <View style={styles.payoutHeader}>
                                    <MaterialIcons name="track-changes" size={22} color={Colors.primary} />
                                    <Text style={styles.payoutTitle}>Next Payout</Text>
                                </View>
                                <Text style={styles.payoutName}>{pool.nextPayoutMember}</Text>
                                <Text style={styles.payoutDate}>
                                    Scheduled: {pool.nextPayoutDate}
                                </Text>
                                <Text style={styles.payoutAmount}>
                                    Amount: <Text style={{ color: Colors.secondary }}>{formatCurrencyFull(pool.amount)}</Text>
                                </Text>
                            </Card>
                        )}

                        {/* Pool rules */}
                        <Card variant="solid">
                            <Text style={styles.rulesTitle}>Pool Rules</Text>
                            {[
                                `Each member contributes ${formatCurrency(pool.contributionAmount)} per ${pool.cycle} cycle`,
                                `Minimum trust score of ${pool.minTrustScore} required`,
                                `${pool.totalMembers} members per pool`,
                                'Missed payment incurs penalty + trust score reduction',
                                'Early withdrawal: 3-5% fee applies',
                                'All payouts are transparent and visible to members',
                            ].map((rule, i) => (
                                <View key={i} style={styles.ruleItem}>
                                    <MaterialIcons name="check-circle" size={16} color={Colors.secondary} />
                                    <Text style={styles.ruleText}>{rule}</Text>
                                </View>
                            ))}
                        </Card>
                    </View>
                )}

                {activeTab === 'members' && (
                    <View style={styles.content}>
                        {pool.members.map((member, index) => (
                            <Card key={member.id} variant="glass" style={styles.memberCard}>
                                <View style={styles.memberRow}>
                                    <View style={styles.memberLeft}>
                                        <View style={styles.memberOrder}>
                                            <Text style={styles.memberOrderText}>#{index + 1}</Text>
                                        </View>
                                        <Avatar name={member.name} size={44} />
                                        <View>
                                            <Text style={styles.memberName}>{member.name}</Text>
                                            <TrustBadge score={member.trustScore} level={member.trustLevel} size="sm" />
                                        </View>
                                    </View>
                                    <View style={styles.memberRight}>
                                        {member.hasReceived ? (
                                            <View style={styles.receivedBadge}>
                                                <Text style={styles.receivedText}>💰 Received</Text>
                                            </View>
                                        ) : member.hasPaid ? (
                                            <View style={styles.paidBadge}>
                                                <Text style={styles.paidText}>✅ Paid</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.pendingBadge}>
                                                <Text style={styles.pendingText}>⏳ Pending</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </Card>
                        ))}
                    </View>
                )}

                {activeTab === 'schedule' && (
                    <View style={styles.content}>
                        <Text style={styles.scheduleTitle}>Payout Rotation</Text>
                        {pool.members.map((member, index) => (
                            <View key={member.id} style={styles.scheduleItem}>
                                <View style={styles.timelineDot}>
                                    <View
                                        style={[
                                            styles.timelineDotInner,
                                            {
                                                backgroundColor:
                                                    member.hasReceived
                                                        ? Colors.secondary
                                                        : index === pool.currentCycle
                                                            ? Colors.primary
                                                            : Colors.border,
                                            },
                                        ]}
                                    />
                                    {index < pool.members.length - 1 && (
                                        <View
                                            style={[
                                                styles.timelineLine,
                                                {
                                                    backgroundColor: member.hasReceived
                                                        ? Colors.secondary
                                                        : Colors.border,
                                                },
                                            ]}
                                        />
                                    )}
                                </View>
                                <Card
                                    variant={index === pool.currentCycle ? 'glass' : 'solid'}
                                    style={index === pool.currentCycle
                                        ? { ...styles.scheduleCard, borderColor: Colors.primary, borderWidth: 1 }
                                        : styles.scheduleCard
                                    }
                                >
                                    <View style={styles.scheduleHeader}>
                                        <Text style={styles.scheduleCycle}>Cycle {index + 1}</Text>
                                        {index === pool.currentCycle && (
                                            <View style={styles.currentBadge}>
                                                <Text style={styles.currentBadgeText}>Current</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.scheduleName}>{member.name}</Text>
                                    <Text style={styles.scheduleAmount}>
                                        Receives: {formatCurrencyFull(pool.amount)}
                                    </Text>
                                </Card>
                            </View>
                        ))}
                    </View>
                )}

                {/* Action button */}
                {pool.status === 'open' && (
                    <View style={styles.actionContainer}>
                        <Button title="Join This Pool" onPress={handleJoin} variant="secondary" size="lg" />
                    </View>
                )}

                <View style={{ height: 30 }} />
            </ScrollView>
            <JoinPoolModal
                tier={pool.tier as Tier}
                visible={joinModalVisible}
                onClose={() => setJoinModalVisible(false)}
                onSuccess={() => {
                    // Refresh data upon joining
                    loadPool();
                }}
            />
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: '700',
    },
    chatButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.card,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Hero
    heroCard: {
        marginHorizontal: Spacing.lg,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        marginBottom: Spacing.lg,
    },
    heroTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.lg,
    },
    heroLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
        marginBottom: 4,
    },
    heroAmount: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    heroStats: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    heroStat: {
        flex: 1,
        alignItems: 'center',
    },
    heroStatLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    heroStatValue: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    heroStatDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    heroProgress: {},
    heroProgressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    heroProgressLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
    },
    heroProgressPercent: {
        color: Colors.secondary,
        fontSize: 12,
        fontWeight: '700',
    },
    heroProgressBar: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    heroProgressFill: {
        height: '100%',
        backgroundColor: Colors.secondary,
        borderRadius: 2,
    },

    // Tabs
    tabs: {
        flexDirection: 'row',
        marginHorizontal: Spacing.lg,
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.md,
        padding: 4,
        marginBottom: Spacing.lg,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: BorderRadius.sm,
    },
    tabActive: {
        backgroundColor: Colors.primary,
    },
    tabText: {
        color: Colors.textMuted,
        fontSize: 13,
        fontWeight: '600',
    },
    tabTextActive: {
        color: '#FFFFFF',
    },

    // Content
    content: {
        paddingHorizontal: Spacing.lg,
    },

    // Payout card
    payoutCard: {
        marginBottom: Spacing.lg,
    },
    payoutHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: Spacing.sm,
    },

    payoutTitle: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    payoutName: {
        color: Colors.secondary,
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    payoutDate: {
        color: Colors.textSecondary,
        fontSize: 13,
        marginBottom: 2,
    },
    payoutAmount: {
        color: Colors.textSecondary,
        fontSize: 13,
    },

    // Rules
    rulesTitle: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: Spacing.md,
    },
    ruleItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 10,
    },
    ruleText: {
        color: Colors.textSecondary,
        fontSize: 13,
        flex: 1,
        lineHeight: 20,
    },

    // Members
    memberCard: {
        marginBottom: Spacing.sm,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    memberLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    memberOrder: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.glassLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    memberOrderText: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '700',
    },
    memberName: {
        color: Colors.text,
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    memberRight: {},
    receivedBadge: {
        backgroundColor: `${Colors.secondary}20`,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
    },
    receivedText: {
        color: Colors.secondary,
        fontSize: 11,
        fontWeight: '700',
    },
    paidBadge: {
        backgroundColor: `${Colors.primary}20`,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
    },
    paidText: {
        color: Colors.primary,
        fontSize: 11,
        fontWeight: '700',
    },
    pendingBadge: {
        backgroundColor: `${Colors.warning}20`,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
    },
    pendingText: {
        color: Colors.warning,
        fontSize: 11,
        fontWeight: '700',
    },

    // Schedule
    scheduleTitle: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: Spacing.lg,
    },
    scheduleItem: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 0,
    },
    timelineDot: {
        alignItems: 'center',
        width: 20,
    },
    timelineDotInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginTop: 16,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        marginTop: 4,
    },
    scheduleCard: {
        flex: 1,
        marginBottom: Spacing.sm,
    },
    scheduleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    scheduleCycle: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    currentBadge: {
        backgroundColor: `${Colors.primary}20`,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
    },
    currentBadgeText: {
        color: Colors.primary,
        fontSize: 10,
        fontWeight: '700',
    },
    scheduleName: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    scheduleAmount: {
        color: Colors.textSecondary,
        fontSize: 13,
    },

    // Action
    actionContainer: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
    },
});
