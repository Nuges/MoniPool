// MoniPool — Admin Defaulter Tracking (Compact UI)
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { Spacing, BorderRadius } from '../../constants/Layout';
import { reputationService } from '../services/ReputationService';
import { userService } from '../services/UserService';
import { adminService } from '../services/AdminService';
import ResponsiveContainer from '../../components/ResponsiveContainer';

interface DefaulterInfo {
    userId: string;
    name: string;
    trustScore: number;
    missedPayments: number;
    isFlagged: boolean;
}

export default function AdminDefaulters() {
    const [defaulters, setDefaulters] = useState<DefaulterInfo[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        const allScores = await reputationService.getAllScores();
        const users = await userService.getAllUsers();

        const list: DefaulterInfo[] = await Promise.all(allScores
            .filter(s => s.missedPayments > 0)
            .map(async s => {
                const user = users.find(u => u.id === s.userId);
                return {
                    userId: s.userId,
                    name: user ? `${user.firstName} ${user.lastName}` : s.userId,
                    trustScore: s.score,
                    missedPayments: s.missedPayments,
                    isFlagged: await adminService.isUserFlagged(s.userId),
                };
            }));
        list.sort((a, b) => b.missedPayments - a.missedPayments);

        const flaggedOnly = users
            .filter(u => u.isFlagged && !list.find(d => d.userId === u.id))
            .map(u => ({
                userId: u.id,
                name: `${u.firstName} ${u.lastName}`,
                trustScore: u.trustScore,
                missedPayments: 0,
                isFlagged: true,
            }));

        setDefaulters([...list, ...flaggedOnly]);
    };

    useFocusEffect(useCallback(() => { loadData(); }, []));

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => { loadData(); setRefreshing(false); }, 500);
    }, []);

    const handleFlag = (userId: string, name: string) => {
        Alert.alert('Flag User', `Flag ${name} for review?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Flag', style: 'destructive',
                onPress: () => {
                    adminService.flagUser(userId, 'Flagged from defaulters panel', 'admin_master');
                    loadData();
                },
            },
        ]);
    };

    const getRiskLevel = (score: number, missed: number) => {
        if (missed >= 3 || score < 30) return { label: 'CRITICAL', color: Colors.error };
        if (missed >= 2 || score < 50) return { label: 'HIGH', color: Colors.warning };
        return { label: 'MEDIUM', color: '#F59E0B' };
    };

    return (
        <ResponsiveContainer maxWidth={800}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🚨 Defaulters & Flagged</Text>
                <Text style={styles.headerSubtitle}>{defaulters.length} user{defaulters.length !== 1 ? 's' : ''}</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >
                {defaulters.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="check-circle" size={36} color={Colors.success} />
                        <Text style={styles.emptyText}>No defaulters or flagged users 🎉</Text>
                    </View>
                ) : (
                    defaulters.map(d => {
                        const risk = getRiskLevel(d.trustScore, d.missedPayments);
                        return (
                            <View key={d.userId} style={styles.card}>
                                <View style={styles.cardRow}>
                                    <View style={[styles.avatar, { backgroundColor: `${risk.color}20` }]}>
                                        <MaterialIcons name="person" size={18} color={risk.color} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.name}>{d.name}</Text>
                                        <Text style={styles.userId}>{d.userId}</Text>
                                    </View>
                                    <View style={[styles.riskBadge, { backgroundColor: `${risk.color}20` }]}>
                                        <Text style={[styles.riskText, { color: risk.color }]}>{risk.label}</Text>
                                    </View>
                                </View>

                                <View style={styles.statsRow}>
                                    <Text style={styles.statItem}>
                                        Score: <Text style={{ fontWeight: '700', color: d.trustScore < 50 ? Colors.error : Colors.text }}>{d.trustScore}</Text>
                                    </Text>
                                    <Text style={styles.statItem}>
                                        Missed: <Text style={{ fontWeight: '700', color: d.missedPayments > 0 ? Colors.error : Colors.success }}>{d.missedPayments}</Text>
                                    </Text>
                                    <Text style={styles.statItem}>
                                        {d.isFlagged ? '🚩 Flagged' : '✅ Active'}
                                    </Text>
                                </View>

                                {!d.isFlagged && (
                                    <TouchableOpacity style={styles.flagBtn} onPress={() => handleFlag(d.userId, d.name)}>
                                        <MaterialIcons name="flag" size={14} color={Colors.error} />
                                        <Text style={styles.flagBtnText}>Flag</Text>
                                    </TouchableOpacity>
                                )}
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
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
    headerSubtitle: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
    content: { padding: Spacing.md },
    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyText: { color: Colors.textMuted, fontSize: 13 },
    card: {
        backgroundColor: '#1a1a25',
        borderRadius: BorderRadius.md,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    name: { fontSize: 13, fontWeight: '700', color: Colors.text },
    userId: { fontSize: 9, color: Colors.textMuted, fontFamily: 'monospace' },
    riskBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    riskText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 6,
    },
    statItem: { fontSize: 11, color: Colors.textMuted },
    flagBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 6,
        borderRadius: BorderRadius.sm,
        backgroundColor: `${Colors.error}10`,
        borderWidth: 1,
        borderColor: `${Colors.error}25`,
    },
    flagBtnText: { color: Colors.error, fontSize: 11, fontWeight: '600' },
});
