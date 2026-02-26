// MoniPool — Admin Escrow Dashboard
// Shows locked funds per pool, per user, and total escrowed balance
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
import { supabase } from '../services/supabaseClient';
import ResponsiveContainer from '../../components/ResponsiveContainer';

type EscrowEntry = {
    userId: string;
    poolId: string;
    poolName: string;
    tier: string;
    escrowAmount: number;
    totalLocked: number;
    memberStatus: string;
    userName?: string;
};

export default function AdminEscrow() {
    const [refreshing, setRefreshing] = useState(false);
    const [entries, setEntries] = useState<EscrowEntry[]>([]);
    const [totalLocked, setTotalLocked] = useState(0);
    const [poolCount, setPoolCount] = useState(0);
    const [userCount, setUserCount] = useState(0);

    const loadData = async () => {
        try {
            // Fetch all wallets with locked balances > 0
            const { data: wallets } = await supabase
                .from('wallets')
                .select('user_id, locked_balance')
                .gt('locked_balance', 0);

            // Fetch active pool members with pool info
            const { data: members } = await supabase
                .from('pool_members')
                .select('user_id, pool_id, status, pools(name, tier, contribution_amount)')
                .eq('status', 'active');

            // Fetch profiles for names
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, first_name, last_name');

            const profileMap = new Map<string, string>();
            (profiles || []).forEach((p: any) => {
                profileMap.set(p.id, `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown');
            });

            const walletMap = new Map<string, number>();
            let total = 0;
            (wallets || []).forEach((w: any) => {
                const locked = parseFloat(w.locked_balance || '0');
                walletMap.set(w.user_id, locked);
                total += locked;
            });

            const escrowEntries: EscrowEntry[] = (members || []).map((m: any) => ({
                userId: m.user_id,
                poolId: m.pool_id,
                poolName: m.pools?.name || 'Unknown Pool',
                tier: m.pools?.tier || '—',
                escrowAmount: parseFloat(m.pools?.contribution_amount || '0'),
                totalLocked: walletMap.get(m.user_id) || 0,
                memberStatus: m.status,
                userName: profileMap.get(m.user_id),
            }));

            const uniquePools = new Set(escrowEntries.map(e => e.poolId));
            const uniqueUsers = new Set(escrowEntries.filter(e => e.totalLocked > 0).map(e => e.userId));

            setEntries(escrowEntries);
            setTotalLocked(total);
            setPoolCount(uniquePools.size);
            setUserCount(uniqueUsers.size);
        } catch (err) {
            console.error('[AdminEscrow] Failed to load data:', err);
        }
    };

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

    return (
        <ResponsiveContainer maxWidth={800}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🔒 Escrow Dashboard</Text>
                <Text style={styles.headerSubtitle}>Locked funds across active pools</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >
                {/* Summary Cards */}
                <View style={styles.heroRow}>
                    <HeroCard label="Total Locked" value={fmt(totalLocked)} icon="lock" color={Colors.warning} />
                    <HeroCard label="Active Pools" value={poolCount.toString()} icon="group-work" color={Colors.primary} />
                    <HeroCard label="Users" value={userCount.toString()} icon="people" color={Colors.success} />
                </View>

                {/* Escrow Entries */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Locked Funds by Member</Text>
                    {entries.length === 0 ? (
                        <Text style={styles.emptyText}>No active escrow locks</Text>
                    ) : (
                        entries.filter(e => e.totalLocked > 0).map((entry, i) => (
                            <View key={`${entry.userId}-${entry.poolId}-${i}`} style={[styles.entryRow, i === entries.length - 1 && styles.entryRowLast]}>
                                <View style={styles.entryLeft}>
                                    <MaterialIcons name="lock-outline" size={14} color={Colors.warning} style={{ marginRight: 6 }} />
                                    <View>
                                        <Text style={styles.entryName}>{entry.userName || 'Unknown'}</Text>
                                        <Text style={styles.entryPool}>{entry.poolName} • {entry.tier.toUpperCase()}</Text>
                                    </View>
                                </View>
                                <View style={styles.entryRight}>
                                    <Text style={styles.entryAmount}>{fmt(entry.totalLocked)}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: entry.memberStatus === 'active' ? `${Colors.success}20` : `${Colors.warning}20` }]}>
                                        <Text style={[styles.statusText, { color: entry.memberStatus === 'active' ? Colors.success : Colors.warning }]}>
                                            {entry.memberStatus}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                {/* Protection Fund Status */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Escrow Rules</Text>
                    <Row label="Lock on Join" value="1st contribution" icon="lock" />
                    <Row label="Auto-Apply" value="To scheduled payments" icon="autorenew" />
                    <Row label="Release" value="On pool completion" icon="lock-open" last />
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

function Row({ label, value, icon, last }: { label: string; value: string; icon?: string; last?: boolean }) {
    return (
        <View style={[styles.row, last && styles.rowLast]}>
            <View style={styles.rowLeft}>
                {icon && <MaterialIcons name={icon as any} size={15} color={Colors.textSecondary} style={{ marginRight: 6 }} />}
                <Text style={styles.rowLabel}>{label}</Text>
            </View>
            <Text style={styles.rowValue}>{value}</Text>
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
    heroRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
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
    emptyText: {
        color: Colors.textMuted,
        fontSize: 13,
        textAlign: 'center',
        paddingVertical: Spacing.lg,
    },
    entryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: `${Colors.border}50`,
    },
    entryRowLast: { borderBottomWidth: 0 },
    entryLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    entryName: { fontSize: 13, fontWeight: '600', color: Colors.text },
    entryPool: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
    entryRight: { alignItems: 'flex-end' },
    entryAmount: { fontSize: 14, fontWeight: '800', color: Colors.warning },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
        marginTop: 2,
    },
    statusText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
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
    rowValue: { fontSize: 13, fontWeight: '700', color: Colors.text },
});
