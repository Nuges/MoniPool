// MoniPool — Admin Audit Log (Compact UI)
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
import { adminService } from '../services/AdminService';
import { auditService } from '../services/AuditService';
import ResponsiveContainer from '../../components/ResponsiveContainer';

interface UnifiedLog {
    id: string;
    timestamp: Date;
    source: 'admin' | 'system';
    action: string;
    target: string;
    performer: string;
    details?: string;
    color: string;
    icon: string;
}

const ACTION_STYLES: Record<string, { color: string; icon: string }> = {
    freeze: { color: '#3B82F6', icon: 'ac-unit' },
    unfreeze: { color: Colors.success, icon: 'whatshot' },
    dispute_resolved: { color: Colors.warning, icon: 'gavel' },
    payout_reversed: { color: Colors.error, icon: 'undo' },
    user_flagged: { color: Colors.error, icon: 'flag' },
    pool_join_attempt: { color: Colors.textMuted, icon: 'login' },
    pool_join_success: { color: Colors.success, icon: 'check-circle' },
    pool_join_failure: { color: Colors.error, icon: 'cancel' },
    transaction_fund: { color: Colors.primary, icon: 'account-balance' },
    transaction_withdraw: { color: '#FF6B6B', icon: 'arrow-upward' },
    transaction_transfer: { color: '#06B6D4', icon: 'swap-horiz' },
    trust_gate_check: { color: '#8B5CF6', icon: 'verified-user' },
    fee_calculated: { color: Colors.warning, icon: 'calculate' },
    protection_fund_contribution: { color: '#8B5CF6', icon: 'shield' },
};

export default function AdminAuditLog() {
    const [logs, setLogs] = useState<UnifiedLog[]>([]);
    const [filter, setFilter] = useState<'all' | 'admin' | 'system'>('all');
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        const adminLogs: UnifiedLog[] = (await adminService.getActionLog()).map(a => {
            const s = ACTION_STYLES[a.type] || { color: Colors.textMuted, icon: 'info' };
            return {
                id: a.id, timestamp: a.timestamp, source: 'admin' as const,
                action: a.type.replace(/_/g, ' ').toUpperCase(), target: a.targetId,
                performer: a.performedBy, details: a.reason, color: s.color, icon: s.icon,
            };
        });
        const systemLogs: UnifiedLog[] = (await auditService.getLogs()).map((log, idx) => {
            const s = ACTION_STYLES[log.action] || { color: Colors.textMuted, icon: 'info' };
            return {
                id: `sys_${idx}`, timestamp: new Date(log.timestamp), source: 'system' as const,
                action: log.action.replace(/_/g, ' ').toUpperCase(), target: log.userId,
                performer: 'System', details: log.details ? JSON.stringify(log.details).substring(0, 80) : undefined,
                color: s.color, icon: s.icon,
            };
        });
        setLogs([...adminLogs, ...systemLogs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
    };

    useFocusEffect(useCallback(() => { loadData(); }, []));

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => { loadData(); setRefreshing(false); }, 500);
    }, []);

    const filtered = filter === 'all' ? logs : logs.filter(l => l.source === filter);

    const fmtTime = (d: Date) => d.toLocaleString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    return (
        <ResponsiveContainer maxWidth={800}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>📝 Audit Trail</Text>
                <Text style={styles.headerSubtitle}>{filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}</Text>
            </View>

            <View style={styles.filterRow}>
                {(['all', 'admin', 'system'] as const).map(f => (
                    <TouchableOpacity key={f} style={[styles.chip, filter === f && styles.chipActive]} onPress={() => setFilter(f)}>
                        <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
                            {f === 'all' ? 'All' : f === 'admin' ? '🛡️ Admin' : '⚙️ System'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >
                {filtered.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="history" size={36} color={Colors.textMuted} />
                        <Text style={styles.emptyText}>No audit logs yet</Text>
                    </View>
                ) : (
                    filtered.map((log, idx) => (
                        <View key={log.id} style={styles.logEntry}>
                            <View style={[styles.dot, { backgroundColor: log.color }]} />
                            <View style={styles.logBody}>
                                <View style={styles.logTop}>
                                    <View style={styles.actionRow}>
                                        <MaterialIcons name={log.icon as any} size={13} color={log.color} />
                                        <Text style={[styles.actionText, { color: log.color }]}>{log.action}</Text>
                                    </View>
                                    <Text style={styles.logTime}>{fmtTime(log.timestamp)}</Text>
                                </View>
                                <Text style={styles.targetText}>
                                    {log.target}{log.performer !== 'System' ? ` • ${log.performer}` : ''}
                                </Text>
                                {log.details && <Text style={styles.detailsText} numberOfLines={1}>{log.details}</Text>}
                            </View>
                        </View>
                    ))
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
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
    headerSubtitle: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        gap: 6,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 14,
        backgroundColor: '#1a1a25',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
    chipTextActive: { color: '#fff' },
    content: { padding: Spacing.md },
    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyText: { color: Colors.textMuted, fontSize: 13 },
    logEntry: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 6,
        alignItems: 'flex-start',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 6,
    },
    logBody: {
        flex: 1,
        backgroundColor: '#1a1a25',
        borderRadius: BorderRadius.sm,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    logTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    actionText: { fontSize: 11, fontWeight: '700' },
    logTime: { fontSize: 9, color: Colors.textMuted },
    targetText: { fontSize: 10, color: Colors.textMuted, marginTop: 2, fontFamily: 'monospace' },
    detailsText: { fontSize: 10, color: Colors.textMuted, fontStyle: 'italic', marginTop: 2 },
});
