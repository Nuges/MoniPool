import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { Spacing, BorderRadius } from '../../constants/Layout';
import { poolService } from '../services/PoolService';
import { adminService } from '../services/AdminService';
import { Pool } from '../models/schema';

export default function AdminPrivatePools() {
    const [pools, setPools] = useState<Pool[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadPools = async () => {
        try {
            const p = await poolService.getPrivatePools();
            setPools(p || []);
        } catch (error) {
            console.error('Failed to load private pools:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadPools();
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => {
            loadPools();
            setRefreshing(false);
        }, 1000);
    }, []);

    const handleFreeze = (pool: Pool) => {
        if (pool.status === 'frozen') {
            Alert.alert(
                'Unfreeze Pool',
                `Are you sure you want to unfreeze ${pool.name}?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Unfreeze',
                        onPress: async () => {
                            const result = await adminService.unfreezePool(pool, 'Admin manual unfreeze', 'admin_master');
                            Alert.alert(result.success ? 'Success' : 'Error', result.message);
                            loadPools();
                        }
                    }
                ]
            );
        } else {
            Alert.alert(
                'Freeze Pool',
                `Are you sure you want to FREEZE ${pool.name}? This will stop all activities.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Freeze',
                        style: 'destructive',
                        onPress: async () => {
                            const result = await adminService.freezePool(pool, 'Admin manual freeze', 'admin_master');
                            Alert.alert(result.success ? 'Success' : 'Error', result.message);
                            loadPools();
                        }
                    }
                ]
            );
        }
    };

    const renderItem = ({ item }: { item: Pool }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <MaterialIcons name="security" size={14} color="#8B5CF6" />
                        <Text style={styles.poolName}>{item.name}</Text>
                    </View>
                    <Text style={styles.poolId}>Creator ID: {item.createdBy}</Text>
                </View>
                <View style={[
                    styles.badge,
                    { backgroundColor: item.status === 'frozen' ? Colors.error : (item.status === 'active' ? Colors.success : Colors.secondary) }
                ]}>
                    <Text style={styles.badgeText}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.statsRow}>
                <Text style={styles.statLabel}>Members: <Text style={styles.statValue}>{item.currentMembers}/{item.capacity}</Text></Text>
                <Text style={styles.statLabel}>Amount: <Text style={styles.statValue}>₦{(item.amount / 1000).toFixed(0)}k</Text></Text>
                <Text style={styles.statLabel}>Status: <Text style={styles.statValue}>{item.approvalStatus}</Text></Text>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: Colors.error }]}
                    onPress={() => handleFreeze(item)}
                >
                    <Text style={{ color: Colors.error, fontWeight: '700' }}>
                        {item.status === 'frozen' ? 'UNFREEZE' : 'FREEZE'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: Colors.border }]}
                    onPress={() => {
                        Alert.alert('Coming Soon', 'Detailed private pool view coming soon.');
                    }}
                >
                    <Text style={{ color: Colors.textMuted }}>DETAILS</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Private Pools</Text>
            </View>

            <FlatList
                data={pools}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                ListEmptyComponent={() => (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text style={{ color: Colors.textMuted }}>No private pools found.</Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f15',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        gap: 16,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
    },
    list: {
        padding: Spacing.xl,
        gap: Spacing.lg,
    },
    card: {
        backgroundColor: '#1a1a25',
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    poolName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    },
    poolId: {
        fontSize: 10,
        color: Colors.textMuted,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
        textTransform: 'uppercase',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.textMuted,
    },
    statValue: {
        color: Colors.text,
        fontWeight: '600',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 8,
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
