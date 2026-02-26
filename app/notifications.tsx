// MoniPool — Notifications screen
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import { Spacing, BorderRadius } from '../constants/Layout';
import Card from '../components/Card';
import { Notification } from './models/schema';

export default function Notifications() {
    const [notifs, setNotifs] = useState<Notification[]>([]);

    const markAllRead = () => {
        setNotifs(notifs.map(n => ({ ...n, read: true })));
    };

    const getNotifColor = (type: Notification['type']) => {
        switch (type) {
            case 'reminder': return Colors.warning;
            case 'payout': return Colors.secondary;
            case 'default': return Colors.error;
            case 'group': return Colors.primary;
            case 'system': return '#9B59B6';
        }
    };

    const renderNotification = ({ item }: { item: Notification }) => {
        const color = getNotifColor(item.type);

        return (
            <TouchableOpacity activeOpacity={0.8}>
                <View style={[styles.notifItem, !item.read && styles.notifUnread]}>
                    <View style={[styles.notifIcon, { backgroundColor: `${color}15` }]}>
                        <MaterialIcons name={item.icon as keyof typeof MaterialIcons.glyphMap} size={22} color={color} />
                    </View>
                    <View style={styles.notifContent}>
                        <View style={styles.notifHeader}>
                            <Text style={styles.notifTitle}>{item.title}</Text>
                            {!item.read && <View style={[styles.unreadDot, { backgroundColor: color }]} />}
                        </View>
                        <Text style={styles.notifMessage} numberOfLines={2}>
                            {item.message}
                        </Text>
                        <Text style={styles.notifDate}>{item.date}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const unreadCount = notifs.filter(n => !n.read).length;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                {unreadCount > 0 ? (
                    <TouchableOpacity onPress={markAllRead}>
                        <Text style={styles.markAll}>Mark all read</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 80 }} />
                )}
            </View>

            {/* Unread count */}
            {unreadCount > 0 && (
                <View style={styles.unreadBanner}>
                    <Text style={styles.unreadText}>
                        {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
                    </Text>
                </View>
            )}

            {/* Notification list */}
            <FlatList
                data={notifs}
                renderItem={renderNotification}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <MaterialIcons name="notifications-none" size={48} color={Colors.textMuted} />
                        <Text style={styles.emptyTitle}>No notifications</Text>
                        <Text style={styles.emptySubtitle}>You're all caught up!</Text>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: '700',
    },
    markAll: {
        color: Colors.primary,
        fontSize: 13,
        fontWeight: '600',
    },

    // Unread banner
    unreadBanner: {
        backgroundColor: `${Colors.primary}10`,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    unreadText: {
        color: Colors.primary,
        fontSize: 13,
        fontWeight: '600',
    },

    // List
    list: {
        padding: Spacing.lg,
    },
    separator: {
        height: 1,
        backgroundColor: Colors.border,
    },

    // Notification item
    notifItem: {
        flexDirection: 'row',
        paddingVertical: Spacing.lg,
        gap: 12,
    },
    notifUnread: {
        backgroundColor: `${Colors.primary}05`,
    },
    notifIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },

    notifContent: {
        flex: 1,
        gap: 4,
    },
    notifHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    notifTitle: {
        color: Colors.text,
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 8,
    },
    notifMessage: {
        color: Colors.textSecondary,
        fontSize: 13,
        lineHeight: 19,
    },
    notifDate: {
        color: Colors.textMuted,
        fontSize: 11,
        marginTop: 2,
    },

    // Empty state
    empty: {
        alignItems: 'center',
        paddingVertical: Spacing['5xl'],
    },

    emptyTitle: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    emptySubtitle: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
});
