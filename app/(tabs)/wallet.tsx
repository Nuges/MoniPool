// MoniPool — Wallet screen
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import InfoTooltip from '../../components/InfoTooltip';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { Spacing, BorderRadius, Shadows } from '../../constants/Layout';
import Card from '../../components/Card';
import ActionModal from '../../components/ActionModal';
import Button from '../../components/Button';
import { formatCurrencyFull, getTransactionIcon } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { walletService } from '../services/WalletService';
import { Wallet as WalletModel, Transaction } from '../models/schema';

export default function Wallet() {
    const { userId } = useAuth();
    const [wallet, setWallet] = useState<WalletModel | null>(null);
    const [history, setHistory] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [showFundModal, setShowFundModal] = useState(false);
    const [autoDebit, setAutoDebit] = useState(false); // Default to false
    const [actionType, setActionType] = useState<'withdraw' | 'transfer' | 'deposit' | null>(null);
    const [filter, setFilter] = useState<'all' | 'credit' | 'debit'>('all');

    const loadData = async () => {
        if (!userId) return;
        try {
            const w = await walletService.getWallet(userId);
            const txs = await walletService.getHistory(userId);
            setWallet(w || null);
            setHistory(txs || []);
        } catch (error) {
            console.error('[Wallet] Failed to load wallet data:', error);
        } finally {
            setLoading(false);
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

    // Calculate totals based on loaded history
    const totalIn = history.filter(tx => tx.amount >= 0).reduce((sum, tx) => sum + tx.amount, 0);
    const totalOut = history.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Wallet</Text>
                </View>

                {/* Balance Card */}
                <LinearGradient
                    colors={['#1A3A6C', Colors.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.balanceCard, Shadows.glow]}
                >
                    <InfoTooltip content="All balances are currently simulated. No real money is held or processed.">
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <Text style={styles.balanceLabel}>Available Balance</Text>
                            <MaterialIcons name="info-outline" size={14} color="rgba(255,255,255,0.7)" />
                        </View>
                    </InfoTooltip>
                    <Text style={styles.balanceAmount}>
                        {formatCurrencyFull(wallet?.balance || 0)}
                    </Text>

                    <View style={styles.balanceActions}>
                        <TouchableOpacity
                            style={styles.balanceButton}
                            onPress={() => setShowFundModal(true)}
                        >
                            <MaterialIcons name="add-circle" size={20} color="#fff" />
                            <Text style={styles.balanceButtonText}>Fund</Text>
                        </TouchableOpacity>
                        <View style={styles.balanceDivider} />
                        <TouchableOpacity
                            style={styles.balanceButton}
                            onPress={() => setActionType('withdraw')}
                        >
                            <MaterialIcons name="arrow-circle-up" size={20} color="#fff" />
                            <Text style={styles.balanceButtonText}>Withdraw</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                {/* Pool Credit Card */}
                <Card variant="glass" style={{ marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, backgroundColor: 'rgba(255, 215, 0, 0.05)', borderColor: 'rgba(255, 215, 0, 0.2)' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <InfoTooltip content="Pool Credit can ONLY be used to offset contribution amounts. It cannot be withdrawn to your bank.">
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <Text style={{ color: Colors.warning, fontSize: 13, fontWeight: '600' }}>Pool Credit (Non-withdrawable)</Text>
                                    <MaterialIcons name="info-outline" size={14} color={Colors.warning} />
                                </View>
                            </InfoTooltip>
                            <Text style={{ color: Colors.text, fontSize: 24, fontWeight: '800' }}>
                                {formatCurrencyFull(wallet?.poolCredit || 0)}
                            </Text>
                        </View>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 215, 0, 0.1)', alignItems: 'center', justifyContent: 'center' }}>
                            <MaterialIcons name="loyalty" size={20} color={Colors.warning} />
                        </View>
                    </View>
                </Card>

                {/* Auto-debit toggle */}
                <Card variant="glass" style={styles.autoDebitCard}>
                    <View style={styles.autoDebitRow}>
                        <View style={styles.autoDebitInfo}>
                            <MaterialIcons name="bolt" size={20} color={Colors.secondary} />
                            <View>
                                <Text style={styles.autoDebitTitle}>Auto-Debit</Text>
                                <Text style={styles.autoDebitSubtitle}>
                                    Automatically pay contributions
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.toggle, autoDebit && styles.toggleActive]}
                            onPress={() => {
                                const newValue = !autoDebit;
                                setAutoDebit(newValue);
                                // TODO: Persist toggle state to backend
                            }}
                        >
                            <View
                                style={[
                                    styles.toggleThumb,
                                    autoDebit && styles.toggleThumbActive,
                                ]}
                            />
                        </TouchableOpacity>
                    </View>
                </Card>

                {/* Quick Stats */}
                <View style={styles.statsRow}>
                    <Card variant="solid" style={styles.statCard}>
                        <View style={styles.statIconContainer}>
                            <MaterialIcons name="arrow-downward" size={22} color={Colors.secondary} />
                        </View>
                        <Text style={styles.statAmount}>{formatCurrencyFull(totalIn)}</Text>
                        <Text style={styles.statLabel}>Total In</Text>
                    </Card>
                    <Card variant="solid" style={styles.statCard}>
                        <View style={styles.statIconContainer}>
                            <MaterialIcons name="arrow-upward" size={22} color={Colors.error} />
                        </View>
                        <Text style={styles.statAmount}>{formatCurrencyFull(totalOut)}</Text>
                        <Text style={styles.statLabel}>Total Out</Text>
                    </Card>
                </View>

                {/* Transaction History */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Transaction History</Text>
                        <TouchableOpacity onPress={() => {
                            const next = filter === 'all' ? 'credit' : filter === 'credit' ? 'debit' : 'all';
                            setFilter(next);
                        }}>
                            <Text style={styles.filterText}>
                                <MaterialIcons name="filter-list" size={14} color={Colors.primary} /> {filter === 'all' ? 'Filter' : filter === 'credit' ? 'In' : 'Out'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Card variant="solid" padding={0}>
                        {history.length > 0 ? history
                            .filter(tx => {
                                if (filter === 'all') return true;
                                if (filter === 'credit') return tx.amount >= 0;
                                return tx.amount < 0;
                            })
                            .map((tx, index) => (
                                <View
                                    key={tx.id}
                                    style={[
                                        styles.txItem,
                                        index < history.length - 1 && styles.txItemBorder,
                                    ]}
                                >
                                    <View style={styles.txIcon}>
                                        <MaterialIcons
                                            name={getTransactionIcon(tx.type) as keyof typeof MaterialIcons.glyphMap}
                                            size={20}
                                            color={Colors.primary}
                                        />
                                    </View>
                                    <View style={styles.txInfo}>
                                        <Text style={styles.txDescription} numberOfLines={1}>
                                            {tx.description || tx.type.toUpperCase()}
                                        </Text>
                                        <Text style={styles.txDate}>{new Date(tx.timestamp || Date.now()).toLocaleDateString()}</Text>
                                    </View>
                                    <View style={styles.txRight}>
                                        <Text
                                            style={[
                                                styles.txAmount,
                                                { color: tx.amount >= 0 ? Colors.secondary : Colors.error },
                                            ]}
                                        >
                                            {formatCurrencyFull(tx.amount)}
                                        </Text>
                                        <View
                                            style={[
                                                styles.txStatusDot,
                                                {
                                                    backgroundColor:
                                                        tx.status === 'completed'
                                                            ? Colors.secondary
                                                            : tx.status === 'pending'
                                                                ? Colors.warning
                                                                : Colors.error,
                                                },
                                            ]}
                                        />
                                    </View>
                                </View>
                            )) : (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={{ color: Colors.textMuted }}>No transactions found.</Text>
                            </View>
                        )}
                    </Card>
                </View>

                <View style={{ height: 20 }} />
            </ScrollView>

            {/* Fund Modal */}
            <Modal
                visible={showFundModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowFundModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Fund Wallet</Text>
                        <Text style={styles.modalSubtitle}>Choose a funding method</Text>

                        <TouchableOpacity
                            style={styles.fundOption}
                            activeOpacity={0.7}
                            onPress={() => {
                                setShowFundModal(false);
                                setTimeout(() => setActionType('deposit'), 300);
                            }}
                        >
                            <View style={[styles.fundOptionIcon, { backgroundColor: `${Colors.primary}20` }]}>
                                <MaterialIcons name="account-balance" size={24} color={Colors.primary} />
                            </View>
                            <View style={styles.fundOptionInfo}>
                                <Text style={styles.fundOptionTitle}>Bank Transfer</Text>
                                <Text style={styles.fundOptionDesc}>
                                    Transfer from your bank account
                                </Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.fundOption}
                            activeOpacity={0.7}
                            onPress={() => {
                                setShowFundModal(false);
                                setTimeout(() => setActionType('deposit'), 300);
                            }}
                        >
                            <View style={[styles.fundOptionIcon, { backgroundColor: `${Colors.secondary}20` }]}>
                                <MaterialIcons name="credit-card" size={24} color={Colors.secondary} />
                            </View>
                            <View style={styles.fundOptionInfo}>
                                <Text style={styles.fundOptionTitle}>Debit Card</Text>
                                <Text style={styles.fundOptionDesc}>
                                    Pay with Visa, Mastercard, or Verve
                                </Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
                        </TouchableOpacity>

                        <Button
                            title="Cancel"
                            onPress={() => setShowFundModal(false)}
                            variant="ghost"
                            size="md"
                        />
                    </View>
                </View>
            </Modal>

            <ActionModal
                visible={!!actionType}
                type={actionType || 'withdraw'}
                onClose={() => setActionType(null)}
                onSuccess={loadData}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xl,
        marginBottom: Spacing.lg,
    },
    title: {
        color: Colors.text,
        fontSize: 28,
        fontWeight: '800',
    },

    // Balance card
    balanceCard: {
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    balanceAmount: {
        color: '#FFFFFF',
        fontSize: 36,
        fontWeight: '800',
        letterSpacing: -1,
        marginBottom: Spacing.xl,
    },
    balanceActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: BorderRadius.lg,
        padding: 4,
    },
    balanceButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
    },
    balanceButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    balanceDivider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },

    // Auto-debit
    autoDebitCard: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    autoDebitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    autoDebitInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    autoDebitTitle: {
        color: Colors.text,
        fontSize: 15,
        fontWeight: '600',
    },
    autoDebitSubtitle: {
        color: Colors.textMuted,
        fontSize: 12,
    },
    toggle: {
        width: 50,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.border,
        justifyContent: 'center',
        padding: 2,
    },
    toggleActive: {
        backgroundColor: Colors.secondary,
    },
    toggleThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
    },
    toggleThumbActive: {
        alignSelf: 'flex-end',
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.lg,
        gap: Spacing.md,
        marginBottom: Spacing['2xl'],
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.glassLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    statAmount: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    statLabel: {
        color: Colors.textMuted,
        fontSize: 12,
    },

    // Section
    section: {
        paddingHorizontal: Spacing.lg,
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
    filterText: {
        color: Colors.primary,
        fontSize: 13,
        fontWeight: '600',
    },

    // Transaction items
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
    txRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    txAmount: {
        fontSize: 14,
        fontWeight: '700',
    },
    txStatusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.backgroundLight,
        borderTopLeftRadius: BorderRadius['2xl'],
        borderTopRightRadius: BorderRadius['2xl'],
        paddingHorizontal: Spacing['2xl'],
        paddingBottom: Spacing['4xl'],
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: Colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginVertical: Spacing.lg,
    },
    modalTitle: {
        color: Colors.text,
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 4,
    },
    modalSubtitle: {
        color: Colors.textSecondary,
        fontSize: 14,
        marginBottom: Spacing.xl,
    },
    fundOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        gap: 12,
    },
    fundOptionIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fundOptionInfo: {
        flex: 1,
        gap: 2,
    },
    fundOptionTitle: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    fundOptionDesc: {
        color: Colors.textMuted,
        fontSize: 12,
    },
});
