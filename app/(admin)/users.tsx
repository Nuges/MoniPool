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
import { userService, UserProfile } from '../services/UserService';
import { adminService } from '../services/AdminService';

export default function AdminUsers() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadUsers = async () => {
        const data = await userService.getAllUsers();
        setUsers(data);
    };

    useFocusEffect(
        useCallback(() => {
            loadUsers();
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => {
            loadUsers();
            setRefreshing(false);
        }, 1000);
    }, []);

    const handleFlag = (user: UserProfile) => {
        if (user.isFlagged) {
            Alert.alert('Info', 'User is already flagged.');
            return;
        }

        Alert.alert(
            'Flag User',
            `Are you sure you want to flag ${user.firstName}? Their trust score will be reduced.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Flag User',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await adminService.flagUser(user.id, 'Admin manual flag', 'admin_master');
                        Alert.alert(result.success ? 'Success' : 'Error', result.message);
                        loadUsers();
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: UserProfile }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{item.firstName[0]}{item.lastName[0]}</Text>
                    </View>
                    <View>
                        <Text style={styles.userName}>{item.firstName} {item.lastName}</Text>
                        <Text style={styles.userId}>{item.email || item.phone}</Text>
                    </View>
                </View>
                <View style={[
                    styles.badge,
                    { backgroundColor: item.isFlagged ? Colors.error : (item.kycStatus === 'verified' ? Colors.success : Colors.warning) }
                ]}>
                    <Text style={styles.badgeText}>{item.isFlagged ? 'FLAGGED' : item.kycStatus}</Text>
                </View>
            </View>

            <View style={styles.statsRow}>
                <Text style={styles.statLabel}>Trust Score: <Text style={[styles.statValue, { color: item.trustScore < 50 ? Colors.error : Colors.success }]}>{item.trustScore}</Text></Text>
                <Text style={styles.statLabel}>Joined: <Text style={styles.statValue}>{new Date(item.joinedAt).toLocaleDateString()}</Text></Text>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: Colors.secondary }]}
                    onPress={() => {
                        Alert.alert('Coming Soon', 'Full profile view coming soon.');
                    }}
                >
                    <Text style={{ color: Colors.secondary, fontWeight: '700' }}>PROFILE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: Colors.error, opacity: item.isFlagged ? 0.5 : 1 }]}
                    onPress={() => handleFlag(item)}
                    disabled={item.isFlagged}
                >
                    <Text style={{ color: Colors.error, fontWeight: '700' }}>
                        {item.isFlagged ? 'FLAGGED' : 'FLAG USER'}
                    </Text>
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
                <Text style={styles.headerTitle}>Manage Users</Text>
            </View>

            <FlatList
                data={users}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
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
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${Colors.primary}30`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: Colors.primary,
        fontWeight: 'bold',
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    },
    userId: {
        fontSize: 12,
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
        paddingLeft: 52, // Align with text
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
