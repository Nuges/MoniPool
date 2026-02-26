// MoniPool — Admin Financials Screen
// Shows: Revenue, Charges, Profits, Fund Balances — Compact Layout
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { Spacing, BorderRadius } from '../../constants/Layout';
import { walletService } from '../services/WalletService';
import ResponsiveContainer from '../../components/ResponsiveContainer';

export default function AdminFinancials() {
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState({
        totalFeeRevenue: 0, totalProtectionFund: 0, totalPenalties: 0,
        totalPayouts: 0, totalContributions: 0, totalDeposits: 0,
        totalWithdrawals: 0, gatewayFees: 0, stampDuty: 0, vat: 0,
        transactionCount: 0,
    });

    const loadData = async () => setSummary(await walletService.getFinancialSummary());

    useFocusEffect(useCallback(() => { loadData(); }, []));

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => { loadData(); setRefreshing(false); }, 500);
    }, []);

    const fmt = (n: number) => {
        if (n >= 1000000) return `₦${(n / 1000000).toFixed(2)}M`;
        if (n >= 1000) return `₦${(n / 1000).toFixed(1)}K`;
        return `₦${n.toLocaleString()}`;
    };

    const platformProfit = summary.totalFeeRevenue;
    const totalCharges = summary.totalFeeRevenue + summary.gatewayFees + summary.stampDuty + summary.vat + summary.totalProtectionFund;

    return (
        <ResponsiveContainer maxWidth={800}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>💰 Financial Overview</Text>
                <Text style={styles.headerSubtitle}>Real-time revenue & charges</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >
                {/* Hero Cards — compact */}
                <View style={styles.heroRow}>
                    <HeroCard label="Revenue" value={fmt(platformProfit)} icon="trending-up" color={Colors.success} />
                    <HeroCard label="Charges" value={fmt(totalCharges)} icon="receipt-long" color={Colors.primary} />
                    <HeroCard label="Fund" value={fmt(summary.totalProtectionFund)} icon="shield" color="#8B5CF6" />
                </View>

                {/* Revenue Breakdown */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Revenue Breakdown</Text>
                    <Row label="Platform Fees" value={fmt(summary.totalFeeRevenue)} color={Colors.success} icon="monetization-on" />
                    <Row label="Gateway Fees" value={fmt(summary.gatewayFees)} color={Colors.secondary} icon="credit-card" />
                    <Row label="Stamp Duty" value={fmt(summary.stampDuty)} color={Colors.warning} icon="description" />
                    <Row label="VAT (7.5%)" value={fmt(summary.vat)} color="#FF6B6B" icon="percent" />
                    <Row label="Penalties" value={fmt(summary.totalPenalties)} color={Colors.error} icon="warning" last />
                </View>

                {/* Money Flow */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Money Flow</Text>
                    <Row label="Deposits" value={fmt(summary.totalDeposits)} color={Colors.success} icon="arrow-downward" />
                    <Row label="Contributions" value={fmt(summary.totalContributions)} color={Colors.primary} icon="group-add" />
                    <Row label="Payouts" value={fmt(summary.totalPayouts)} color={Colors.secondary} icon="arrow-upward" />
                    <Row label="Withdrawals" value={fmt(summary.totalWithdrawals)} color={Colors.error} icon="account-balance-wallet" last />
                </View>

                {/* Tx count */}
                <View style={styles.section}>
                    <Row label="Total Transactions" value={summary.transactionCount.toString()} icon="swap-horiz" last />
                </View>
            </ScrollView>
        </ResponsiveContainer>
    );
}

function HeroCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
    return (
        <View style={[styles.heroCard, { borderLeftColor: color }]}>
            <MaterialIcons name={icon as any} size={18} color={color} />
            <Text style={[styles.heroValue, { color }]}>{value}</Text>
            <Text style={styles.heroLabel}>{label}</Text>
        </View>
    );
}

function Row({ label, value, color = Colors.text, icon, last }: { label: string; value: string; color?: string; icon?: string; last?: boolean }) {
    return (
        <View style={[styles.row, last && styles.rowLast]}>
            <View style={styles.rowLeft}>
                {icon && <MaterialIcons name={icon as any} size={15} color={color} style={{ marginRight: 6 }} />}
                <Text style={styles.rowLabel}>{label}</Text>
            </View>
            <Text style={[styles.rowValue, { color }]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
    headerSubtitle: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
    content: { padding: Spacing.md },
    // ── Hero row ──
    heroRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    heroCard: {
        flex: 1,
        backgroundColor: '#1a1a25',
        borderRadius: BorderRadius.md,
        padding: 10,
        borderLeftWidth: 3,
        alignItems: 'center',
        gap: 2,
    },
    heroValue: { fontSize: 16, fontWeight: '800' },
    heroLabel: { fontSize: 9, color: Colors.textMuted, textTransform: 'uppercase', fontWeight: '600' },
    // ── Sections ──
    section: {
        backgroundColor: '#1a1a25',
        borderRadius: BorderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.text,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 7,
        borderBottomWidth: 1,
        borderBottomColor: `${Colors.border}50`,
    },
    rowLast: { borderBottomWidth: 0 },
    rowLeft: { flexDirection: 'row', alignItems: 'center' },
    rowLabel: { fontSize: 13, color: Colors.textSecondary },
    rowValue: { fontSize: 13, fontWeight: '700' },
});
