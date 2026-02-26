import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import Colors from '../../constants/Colors';
import { Spacing, BorderRadius } from '../../constants/Layout';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Avatar from '../../components/Avatar';
import { poolService } from '../services/PoolService';
import { useAuth } from '../context/AuthContext';
import { Pool } from '../models/schema';

// Mock Support Chat
const SUPPORT_CHAT = {
    id: 'support',
    name: 'Admin Support',
    message: 'Your ticket #1234 has been resolved.',
    time: 'Yesterday',
    unread: 0,
    type: 'support'
};

export default function Chat() {
    const { userId } = useAuth(); // Get actual logged-in user
    const [chats, setChats] = useState<any[]>([]);

    useFocusEffect(
        useCallback(() => {
            loadChats();
        }, [userId])
    );

    const loadChats = async () => {
        try {
            // 1. Get all pools
            const allPools = await poolService.getPools();

            // 2. Filter for pools where current user is a member
            // Use actual userId
            const currentUserId = userId;
            if (!currentUserId) return;
            const myPools = allPools.filter(p => p.members?.some(m => m.userId === currentUserId));

            // 3. Map to chat item format
            const poolChats = myPools.map(pool => ({
                id: pool.id,
                name: `${(pool.tier || '100k').toUpperCase()} Pool #${pool.series}`, // e.g. "500K Pool #1"
                message: `Group active with ${pool.currentMembers || 0} members`, // Placeholder last message
                time: '12:00 PM', // Placeholder time
                unread: 0,
                type: 'group',
                poolId: pool.id
            }));

            setChats([SUPPORT_CHAT, ...poolChats]);
        } catch (error) {
            console.error('[Chat] Failed to load pools:', error);
            setChats([SUPPORT_CHAT]);
        }
    };

    const handleChatPress = (item: any) => {
        if (item.type === 'support') {
            router.push('/help');
            return;
        }
        router.push(`/pool/${item.poolId}/chat`);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Chats</Text>
                <TouchableOpacity style={styles.newChatBtn}>
                    <MaterialIcons name="edit" size={22} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={Colors.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search"
                    placeholderTextColor={Colors.textMuted}
                />
            </View>

            <FlatList
                contentContainerStyle={styles.list}
                data={chats}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.chatItem}
                        onPress={() => handleChatPress(item)}
                    >
                        <Avatar name={item.name} size={50} color={item.type === 'support' ? Colors.secondary : Colors.primary} />
                        <View style={styles.chatInfo}>
                            <View style={styles.chatHeader}>
                                <Text style={styles.chatName}>{item.name}</Text>
                                <Text style={styles.chatTime}>{item.time}</Text>
                            </View>
                            <View style={styles.chatFooter}>
                                <Text style={[styles.chatMessage, item.unread > 0 && styles.unreadMessage]} numberOfLines={1}>
                                    {item.message}
                                </Text>
                                {item.unread > 0 && (
                                    <View style={styles.unreadBadge}>
                                        <Text style={styles.unreadText}>{item.unread}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 50 }}>
                        <Text style={{ color: Colors.textMuted }}>No active chats</Text>
                    </View>
                }
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xl,
        marginBottom: Spacing.md,
    },
    headerTitle: {
        color: Colors.text,
        fontSize: 28,
        fontWeight: '800',
    },
    newChatBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${Colors.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        marginHorizontal: Spacing.lg,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.lg,
        height: 44,
        marginBottom: Spacing.lg,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        color: Colors.text,
        fontSize: 16,
    },
    list: {
        paddingVertical: Spacing.sm,
    },
    chatItem: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: 12,
        alignItems: 'center',
    },
    chatInfo: {
        flex: 1,
        gap: 4,
        borderBottomWidth: 1,
        borderBottomColor: Colors.glassBorder,
        paddingBottom: Spacing.md,
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chatName: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    chatTime: {
        color: Colors.textMuted,
        fontSize: 12,
    },
    chatFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chatMessage: {
        color: Colors.textSecondary,
        fontSize: 14,
        flex: 1,
    },
    unreadMessage: {
        color: Colors.text,
        fontWeight: '600',
    },
    unreadBadge: {
        backgroundColor: Colors.primary,
        height: 20,
        minWidth: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
