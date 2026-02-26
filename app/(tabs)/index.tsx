// MoniPool — Dashboard (Home) screen
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { Spacing, BorderRadius, Shadows } from '../../constants/Layout';
import TrustBadge from '../../components/TrustBadge';
import { walletService } from '../services/WalletService';
import { reputationService } from '../services/ReputationService';
import { Wallet, Transaction } from '../models/schema';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import ActionModal from '../../components/ActionModal';

export default function Dashboard() {
    const { firstName, userId } = useAuth();
    const [wallet, setWallet] = useState<Wallet | undefined>();
    const [history, setHistory] = useState<Transaction[]>([]);
    const [trustScore, setTrustScore] = useState(0);
    const [trustLevel, setTrustLevel] = useState<'verified' | 'growing' | 'high_risk'>('growing');
    const [refreshing, setRefreshing] = useState(false);
    const [actionType, setActionType] = useState<'withdraw' | 'transfer' | null>(null);
    const [autoDebitActive, setAutoDebitActive] = useState(false);

    const loadData = async () => {
        if (!userId) return;
        try {
            const userWallet = await walletService.getWallet(userId);
            const userHistory = await walletService.getHistory(userId);
            const scoreData = await reputationService.getScore(userId);
            setWallet(userWallet ? { ...userWallet } : undefined);
            setHistory([...userHistory]);
            setTrustScore(scoreData.score);
            setTrustLevel(scoreData.score >= 80 ? 'verified' : scoreData.score >= 50 ? 'growing' : 'high_risk');
            setAutoDebitActive(false); // TODO: Fetch real setting later
        } catch (error) {
            console.error('[Dashboard] Failed to load data:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [userId])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleFund = async () => {
        if (!userId) return;
        try {
            await walletService.processTransaction(userId, 'deposit', 50000, `manual_fund_${Date.now()}`);
            await loadData();
        } catch (error) {
            console.error('Funding failed:', error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.avatarPlaceholder}>
                            <MaterialIcons name="person" size={24} color="white" />
                        </View>
                        <View style={styles.headerText}>
                            <Text style={styles.greeting}>Hello, {firstName || 'Member'} 👋</Text>
                            {trustScore > 0 && <TrustBadge score={trustScore} level={trustLevel} size="sm" showLabel />}
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.notifButton}
                        onPress={() => router.push('/notifications')}
                    >
                        <MaterialIcons name="notifications" size={22} color={Colors.text} />
                        <View style={styles.notifDot} />
                    </TouchableOpacity>
                </View>

                {/* Wallet Balance Card */}
                <LinearGradient
                    colors={[Colors.primary, '#1A3A6C']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.balanceCard, Shadows.glow]}
                >
                    <View style={styles.balanceHeader}>
                        <Text style={styles.balanceLabel}>Wallet Balance</Text>
                        <TouchableOpacity onPress={loadData}>
                            <MaterialIcons name="refresh" size={18} color="rgba(255,255,255,0.7)" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.balanceAmount}>
                        ₦{wallet?.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                    </Text>
                    <View style={styles.balanceBottom}>
                        <Text style={styles.balanceSubtext}>
                            Auto-debit: <Text style={[styles.activeText, !autoDebitActive && { color: Colors.textMuted }]}>
                                {autoDebitActive ? 'Active' : 'Inactive'}
                            </Text>
                        </Text>
                    </View>
                </LinearGradient>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    {[
                        { icon: 'add-circle', label: 'Fund', color: Colors.secondary, action: handleFund },
                        { icon: 'arrow-circle-up', label: 'Withdraw', color: Colors.primary, action: () => setActionType('withdraw') },
                        { icon: 'swap-horiz', label: 'Transfer', color: '#9B59B6', action: () => setActionType('transfer') },
                        { icon: 'schedule', label: 'History', color: '#F39C12', action: () => router.push('/(tabs)/wallet') },
                    ].map((action, i) => (
                        <TouchableOpacity key={i} style={styles.quickAction} activeOpacity={0.7} onPress={action.action}>
                            <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}20` }]}>
                                <MaterialIcons name={action.icon as any} size={24} color={action.color} />
                            </View>
                            <Text style={styles.quickActionLabel}>{action.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <ActionModal
                    visible={!!actionType}
                    type={actionType || 'withdraw'}
                    onClose={() => setActionType(null)}
                    onSuccess={loadData}
                />

                {/* Recent Activity */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Activity</Text>
                    </View>

                    <View style={styles.txList}>
                        {history.length > 0 ? history.slice(0, 5).map((tx, index) => (
                            <View
                                key={tx.id}
                                style={[
                                    styles.txItem,
                                    index < history.length - 1 && styles.txItemBorder,
                                ]}
                            >
                                <View style={styles.txIcon}>
                                    <MaterialIcons
                                        name={tx.type === 'deposit' ? 'arrow-downward' : 'arrow-upward'}
                                        size={18}
                                        color={Colors.text}
                                    />
                                </View>
                                <View style={styles.txInfo}>
                                    <Text style={styles.txDescription} numberOfLines={1}>
                                        {tx.type.toUpperCase()}
                                    </Text>
                                    <Text style={styles.txDate}>{new Date(tx.timestamp || Date.now()).toLocaleDateString()}</Text>
                                </View>
                                <Text
                                    style={[
                                        styles.txAmount,
                                        { color: (tx.type === 'deposit' || tx.type === 'payout') ? Colors.secondary : Colors.error },
                                    ]}
                                >
                                    {(tx.type === 'deposit' || tx.type === 'payout') ? '+' : '-'}₦{tx.amount.toLocaleString()}
                                </Text>
                            </View>
                        )) : (
                            <Text style={{ color: Colors.textMuted, textAlign: 'center', padding: 20 }}>No transactions yet</Text>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        paddingHorizontal: Spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.lg,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        gap: 4,
    },
    greeting: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: '700',
    },
    notifButton: {
        backgroundColor: Colors.card,
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    notifDot: {
        position: 'absolute',
        top: 10,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.error,
    },
    balanceCard: {
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        marginBottom: Spacing.xl,
    },
    balanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        fontWeight: '500',
    },
    balanceAmount: {
        color: '#FFFFFF',
        fontSize: 38,
        fontWeight: '800',
        letterSpacing: -1,
        marginBottom: Spacing.md,
    },
    balanceBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    balanceSubtext: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
    },
    activeText: {
        color: Colors.secondary,
        fontWeight: '700',
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing['2xl'],
    },
    quickAction: {
        alignItems: 'center',
        gap: 6,
    },
    quickActionIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickActionLabel: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: '500',
    },
    section: {
        marginBottom: Spacing['2xl'],
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: '700',
    },
    txList: {
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    txItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        gap: 12,
    },
    txItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    txIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.glassLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    txInfo: {
        flex: 1,
        gap: 2,
    },
    txDescription: {
        color: Colors.text,
        fontSize: 14,
        fontWeight: '500',
    },
    txDate: {
        color: Colors.textMuted,
        fontSize: 12,
    },
    txAmount: {
        fontSize: 14,
        fontWeight: '700',
    },
});
