// MoniPool — Admin Transaction Ledger
// Shows ALL transactions across ALL users
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { Spacing, BorderRadius } from '../../constants/Layout';
import { walletService } from '../services/WalletService';
import { Transaction, TxType } from '../models/schema';
import ResponsiveContainer from '../../components/ResponsiveContainer';

const TX_COLORS: Record<TxType, string> = {
    deposit: Colors.success,
    withdrawal: '#FF6B6B',
    contribution: Colors.primary,
    payout: Colors.secondary,
    penalty: Colors.error,
    fee: Colors.warning,
    fund: '#8B5CF6',
    transfer: '#06B6D4',
    referral_reward: '#F59E0B',
};

const TX_ICONS: Record<TxType, string> = {
    deposit: 'arrow-downward',
    withdrawal: 'arrow-upward',
    contribution: 'group-add',
    payout: 'paid',
    penalty: 'warning',
    fee: 'monetization-on',
    fund: 'shield',
    transfer: 'swap-horiz',
    referral_reward: 'card-giftcard',
};

type FilterType = 'all' | TxType;

export default function AdminTransactions() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filter, setFilter] = useState<FilterType>('all');
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        const all = await walletService.getAllTransactions();
        setTransactions(all);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => { loadData(); setRefreshing(false); }, 500);
    }, []);

    const filtered = filter === 'all' ? transactions : transactions.filter(tx => tx.type === filter);

    const filters: { key: FilterType; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'contribution', label: 'Contributions' },
        { key: 'payout', label: 'Payouts' },
        { key: 'fee', label: 'Fees' },
        { key: 'penalty', label: 'Penalties' },
        { key: 'deposit', label: 'Deposits' },
        { key: 'withdrawal', label: 'Withdrawals' },
        { key: 'fund', label: 'Fund' },
    ];

    const formatTime = (date?: Date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString('en-NG', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <ResponsiveContainer maxWidth={900}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>📋 Transaction Ledger</Text>
                <Text style={styles.headerSubtitle}>{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</Text>
            </View>

            {/* Filter Chips — horizontal scrollable, compact */}
            <View style={styles.filterWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
                    {filters.map(f => (
                        <TouchableOpacity
                            key={f.key}
                            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                            onPress={() => setFilter(f.key)}
                        >
                            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >
                {filtered.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="receipt-long" size={40} color={Colors.textMuted} />
                        <Text style={styles.emptyText}>No transactions found</Text>
                    </View>
                ) : (
                    filtered.map((tx, idx) => {
                        const color = TX_COLORS[tx.type] || Colors.textMuted;
                        const icon = TX_ICONS[tx.type] || 'swap-horiz';
                        const isDebit = ['withdrawal', 'contribution', 'penalty', 'fee', 'fund'].includes(tx.type);

                        return (
                            <View key={tx.id || idx} style={styles.txRow}>
                                <View style={[styles.txIcon, { backgroundColor: `${color}15` }]}>
                                    <MaterialIcons name={icon as any} size={18} color={color} />
                                </View>
                                <View style={styles.txDetails}>
                                    <Text style={styles.txType}>{tx.type.replace('_', ' ').toUpperCase()}</Text>
                                    <Text style={styles.txMeta}>
                                        {tx.userId?.substring(0, 12) || 'System'} • {formatTime(tx.timestamp)}
                                    </Text>
                                </View>
                                <Text style={[styles.txAmount, { color }]}>
                                    {isDebit ? '-' : '+'}₦{tx.amount.toLocaleString()}
                                </Text>
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </ResponsiveContainer>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
    },
    headerSubtitle: {
        fontSize: 11,
        color: Colors.textMuted,
        marginTop: 2,
    },
    filterWrapper: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    filterBar: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        gap: 6,
        alignItems: 'center',
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 16,
        backgroundColor: '#1a1a25',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    filterChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    filterText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.textMuted,
    },
    filterTextActive: {
        color: '#fff',
    },
    content: {
        padding: Spacing.md,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 8,
    },
    emptyText: {
        color: Colors.textMuted,
        fontSize: 13,
    },
    txRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a25',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: BorderRadius.md,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: 10,
    },
    txIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    txDetails: {
        flex: 1,
    },
    txType: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.text,
        letterSpacing: 0.3,
    },
    txMeta: {
        fontSize: 10,
        color: Colors.textMuted,
        marginTop: 1,
    },
    txAmount: {
        fontSize: 13,
        fontWeight: '800',
    },
});
