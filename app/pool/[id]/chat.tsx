// MoniPool — Group Chat screen
import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../../../constants/Colors';
import { Spacing, BorderRadius } from '../../../constants/Layout';
import Avatar from '../../../components/Avatar';
import { poolService } from '../../services/PoolService';
import { ChatMessage, Pool } from '../../models/schema';
import { useAuth } from '../../context/AuthContext';

export default function GroupChat() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([{
        id: 'sys-msg-1',
        senderId: 'system',
        senderName: 'MoniPool',
        message: 'Group chat is disabled during the Phase-1 Beta.',
        type: 'system',
        timestamp: new Date().toISOString()
    }]);
    const flatListRef = useRef<FlatList>(null);

    const [pool, setPool] = useState<Pool | null>(null);

    useFocusEffect(
        React.useCallback(() => {
            const loadPool = async () => {
                const data = await poolService.getPoolById(id as string);
                setPool(data || null);
            };
            loadPool();
        }, [id])
    );

    const { firstName } = useAuth();
    const displayName = firstName || 'Member';

    const handleSend = () => {
        if (!message.trim()) return;

        const newMsg: ChatMessage = {
            id: `c${Date.now()}`,
            senderId: 'u1', // Keep ID consistent with mock for now
            senderName: displayName,
            message: message.trim(),
            timestamp: new Date().toLocaleString(),
            type: 'text',
        };

        setMessages([...messages, newMsg]);
        setMessage('');

        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const renderMessage = ({ item }: { item: ChatMessage }) => {
        const isMe = item.senderId === 'u1';
        const isSystem = item.type === 'system';
        const isCelebration = item.type === 'celebration';

        if (isSystem) {
            return (
                <View style={styles.systemMsg}>
                    <Text style={styles.systemMsgText}>{item.message}</Text>
                </View>
            );
        }

        if (isCelebration) {
            return (
                <View style={styles.celebrationMsg}>
                    <MaterialIcons name="celebration" size={22} color={Colors.warning} />
                    <Text style={styles.celebrationText}>{item.message}</Text>
                </View>
            );
        }

        return (
            <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                {!isMe && <Avatar name={item.senderName} size={32} />}
                <View style={[styles.msgBubble, isMe ? styles.msgBubbleMe : styles.msgBubbleOther]}>
                    {!isMe && <Text style={styles.msgSender}>{item.senderName}</Text>}
                    <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.message}</Text>
                    <Text style={styles.msgTime}>
                        {item.timestamp.split(' ')[1] || item.timestamp}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>{pool?.name || 'Loading...'}</Text>
                    <Text style={styles.headerSubtitle}>{pool?.currentMembers || 0} members</Text>
                </View>
                <TouchableOpacity style={styles.infoButton}>
                    <MaterialIcons name="info-outline" size={24} color={Colors.text} />
                </TouchableOpacity>
            </View>

            {/* Messages */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.chatArea}
                keyboardVerticalOffset={0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.messagesList}
                    showsVerticalScrollIndicator={false}
                />

                {/* Input */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        placeholderTextColor={Colors.textMuted}
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, message.trim() && styles.sendButtonActive]}
                        onPress={handleSend}
                        disabled={!message.trim()}
                    >
                        <MaterialIcons
                            name="send"
                            size={20}
                            color={message.trim() ? '#FFFFFF' : Colors.textMuted}
                        />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    headerSubtitle: {
        color: Colors.textMuted,
        fontSize: 12,
    },
    infoButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Chat
    chatArea: {
        flex: 1,
    },
    messagesList: {
        padding: Spacing.lg,
        gap: 12,
    },

    // System message
    systemMsg: {
        alignSelf: 'center',
        backgroundColor: Colors.card,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: BorderRadius.full,
    },
    systemMsgText: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '500',
    },

    // Celebration
    celebrationMsg: {
        alignSelf: 'center',
        backgroundColor: `${Colors.secondary}15`,
        borderWidth: 1,
        borderColor: `${Colors.secondary}30`,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        gap: 4,
    },

    celebrationText: {
        color: Colors.secondary,
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },

    // Messages
    msgRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'flex-end',
    },
    msgRowMe: {
        justifyContent: 'flex-end',
    },
    msgBubble: {
        maxWidth: '75%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: BorderRadius.lg,
    },
    msgBubbleMe: {
        backgroundColor: Colors.primary,
        borderBottomRightRadius: 4,
    },
    msgBubbleOther: {
        backgroundColor: Colors.card,
        borderBottomLeftRadius: 4,
    },
    msgSender: {
        color: Colors.primaryLight,
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 2,
    },
    msgText: {
        color: Colors.text,
        fontSize: 14,
        lineHeight: 20,
    },
    msgTextMe: {
        color: '#FFFFFF',
    },
    msgTime: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },

    // Input
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        backgroundColor: Colors.backgroundLight,
    },
    input: {
        flex: 1,
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.xl,
        paddingHorizontal: Spacing.lg,
        paddingVertical: 10,
        color: Colors.text,
        fontSize: 15,
        maxHeight: 100,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonActive: {
        backgroundColor: Colors.primary,
    },
});
