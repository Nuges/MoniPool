import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { Spacing, BorderRadius } from '../../constants/Layout';
import { useAuth } from '../context/AuthContext';
import { poolService } from '../services/PoolService';
import { userService } from '../services/UserService';
import { walletService } from '../services/WalletService';
import { reputationService } from '../services/ReputationService';
import ResponsiveContainer from '../../components/ResponsiveContainer';

export default function AdminDashboard() {
    const { logout } = useAuth();
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalPools: 0,
        activePools: 0,
        frozenPools: 0,
        totalVolume: 0,
        totalRevenue: 0,
        totalPenalties: 0,
        protectionFund: 0,
        totalCharges: 0,
        transactionCount: 0,
        flaggedUsers: 0,
        pendingKyc: 0,
        defaulters: 0,
    });

    const loadStats = async () => {
        const pools = await poolService.getPools();
        const users = await userService.getAllUsers();
        const financial = await walletService.getFinancialSummary();
        const scores = await reputationService.getAllScores();

        const active = pools.filter(p => p.status === 'filling' || p.status === 'locked' || p.status === 'active');
        const frozen = pools.filter(p => p.status === 'frozen');
        const volume = pools.reduce((acc, p) => acc + (p.amount * (p.currentCycle || 1)), 0);
        const flagged = users.filter(u => u.isFlagged).length;
        const pendingKyc = users.filter(u => u.kycStatus === 'pending' || u.kycStatus === 'none').length;
        const defaulterCount = scores.filter(s => s.missedPayments > 0).length;
        const totalCharges = financial.totalFeeRevenue + financial.gatewayFees + financial.stampDuty + financial.vat + financial.totalProtectionFund;

        setStats({
            totalUsers: users.length,
            totalPools: pools.length,
            activePools: active.length,
            frozenPools: frozen.length,
            totalVolume: volume,
            totalRevenue: financial.totalFeeRevenue,
            totalPenalties: financial.totalPenalties,
            protectionFund: financial.totalProtectionFund,
            totalCharges,
            transactionCount: financial.transactionCount,
            flaggedUsers: flagged,
            pendingKyc,
            defaulters: defaulterCount,
        });
    };

    useFocusEffect(useCallback(() => { loadStats(); }, []));

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => { loadStats(); setRefreshing(false); }, 800);
    }, []);

    const handleLogout = async () => {
        await logout();
        router.replace('/(auth)/login');
    };

    const fmt = (n: number) => {
        if (n >= 1000000) return `₦${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `₦${(n / 1000).toFixed(0)}K`;
        return `₦${n.toLocaleString()}`;
    };

    return (
        <ResponsiveContainer maxWidth={900}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>🏦 MoniPool Admin</Text>
                    <Text style={styles.headerSubtitle}>System Overview</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <MaterialIcons name="logout" size={18} color={Colors.error} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >
                {/* ── System ── */}
                <Text style={styles.sectionTitle}>System</Text>
                <View style={styles.grid}>
                    <MiniStat label="Users" value={stats.totalUsers} icon="people" color={Colors.primary} />
                    <MiniStat label="Active" value={stats.activePools} icon="pie-chart" color={Colors.secondary} />
                    <MiniStat label="Frozen" value={stats.frozenPools} icon="ac-unit" color={Colors.error} />
                    <MiniStat label="Volume" value={fmt(stats.totalVolume)} icon="attach-money" color={Colors.success} />
                </View>

                {/* ── Financial ── */}
                <Text style={styles.sectionTitle}>💰 Financial</Text>
                <View style={styles.grid}>
                    <MiniStat label="Revenue" value={fmt(stats.totalRevenue)} icon="trending-up" color={Colors.success} />
                    <MiniStat label="Charges" value={fmt(stats.totalCharges)} icon="receipt-long" color={Colors.primary} />
                    <MiniStat label="Penalties" value={fmt(stats.totalPenalties)} icon="warning" color={Colors.error} />
                    <MiniStat label="Fund" value={fmt(stats.protectionFund)} icon="shield" color="#8B5CF6" />
                </View>

                {/* ── Risk ── */}
                <Text style={styles.sectionTitle}>🚨 Risk</Text>
                <View style={styles.grid}>
                    <MiniStat label="Defaulters" value={stats.defaulters} icon="report-problem" color={Colors.error} />
                    <MiniStat label="Flagged" value={stats.flaggedUsers} icon="flag" color={Colors.warning} />
                    <MiniStat label="KYC Pending" value={stats.pendingKyc} icon="verified-user" color="#06B6D4" />
                    <MiniStat label="TXs" value={stats.transactionCount} icon="swap-horiz" color={Colors.textSecondary} />
                </View>

                {/* ── Navigation ── */}
                <Text style={styles.sectionTitle}>Management</Text>
                <NavItem title="Financials & Revenue" icon="account-balance" color={Colors.success} onPress={() => router.push('/(admin)/financials')} />
                <NavItem title="Escrow Dashboard" icon="lock" color={Colors.warning} onPress={() => router.push('/(admin)/escrow')} />
                <NavItem title="Transaction Ledger" icon="receipt-long" color={Colors.primary} badge={stats.transactionCount} onPress={() => router.push('/(admin)/transactions')} />
                <NavItem title="Manage Pools (Public)" icon="view-list" color={Colors.secondary} badge={stats.totalPools} onPress={() => router.push('/(admin)/pools')} />
                <NavItem title="Manage Private Pools" icon="security" color="#8B5CF6" onPress={() => router.push('/(admin)/private-pools')} />
                <NavItem title="Manage Users" icon="people-outline" color={Colors.primary} badge={stats.totalUsers} onPress={() => router.push('/(admin)/users')} />
                <NavItem title="Defaulters & Flagged" icon="report-problem" color={Colors.error} badge={stats.defaulters + stats.flaggedUsers} onPress={() => router.push('/(admin)/defaulters')} />
                <NavItem title="Audit Trail" icon="history" color={Colors.textMuted} onPress={() => router.push('/(admin)/audit')} />

                <View style={{ height: 20 }} />
            </ScrollView>
        </ResponsiveContainer>
    );
}

// ── Compact stat component ──
function MiniStat({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
    return (
        <View style={styles.miniStat}>
            <View style={[styles.miniIcon, { backgroundColor: `${color}15` }]}>
                <MaterialIcons name={icon as any} size={16} color={color} />
            </View>
            <Text style={styles.miniValue}>{value}</Text>
            <Text style={styles.miniLabel}>{label}</Text>
        </View>
    );
}

// ── Nav item component ──
function NavItem({ title, icon, color, badge, onPress }: { title: string; icon: string; color: string; badge?: number; onPress: () => void }) {
    return (
        <TouchableOpacity style={styles.navItem} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.navIcon, { backgroundColor: `${color}15` }]}>
                <MaterialIcons name={icon as any} size={22} color={color} />
            </View>
            <Text style={styles.navText}>{title}</Text>
            {(badge != null && badge > 0) && (
                <View style={[styles.badge, { backgroundColor: color }]}>
                    <Text style={styles.badgeText}>{badge}</Text>
                </View>
            )}
            <MaterialIcons name="chevron-right" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
        fontSize: 10,
        color: Colors.success,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    logoutBtn: {
        padding: 6,
        backgroundColor: `${Colors.error}15`,
        borderRadius: 6,
    },
    content: {
        padding: Spacing.md,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 8,
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    // ── 4-col compact stat grid ──
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    miniStat: {
        width: '23%',
        backgroundColor: '#1a1a25',
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 10,
        alignItems: 'center',
    },
    miniIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    miniValue: {
        fontSize: 15,
        fontWeight: '800',
        color: Colors.text,
    },
    miniLabel: {
        fontSize: 9,
        color: Colors.textMuted,
        textTransform: 'uppercase',
        fontWeight: '600',
        marginTop: 1,
    },
    // ── Nav items ──
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a25',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: 10,
        marginBottom: 6,
    },
    navIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    badge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },
});
