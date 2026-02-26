import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import Colors from '../constants/Colors';
import { Spacing, BorderRadius, Shadows } from '../constants/Layout';

export interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface ThemedAlertProps {
    visible: boolean;
    title: string;
    message?: string;
    buttons?: AlertButton[];
    onClose: () => void;
}

export default function ThemedAlert({ visible, title, message, buttons = [], onClose }: ThemedAlertProps) {
    if (!visible) return null;

    // Default "OK" button if none provided
    const actions = buttons.length > 0 ? buttons : [{ text: 'OK', onPress: onClose, style: 'default' } as AlertButton];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={[styles.container, Shadows.card]}>
                    <Text style={styles.title}>{title}</Text>
                    {message && <Text style={styles.message}>{message}</Text>}

                    <View style={styles.buttonContainer}>
                        {actions.map((btn, index) => (
                            <TouchableOpacity
                                key={index}
                                activeOpacity={0.7}
                                style={[
                                    styles.button,
                                    index > 0 && styles.buttonBorder,
                                    // Make buttons stacked if more than 2, or row if 2 or less
                                    actions.length > 2 && { width: '100%', borderLeftWidth: 0, borderTopWidth: index > 0 ? 1 : 0 }
                                ]}
                                onPress={() => {
                                    if (btn.onPress) btn.onPress();
                                    else onClose();
                                }}
                            >
                                <Text style={[
                                    styles.buttonText,
                                    btn.style === 'cancel' && styles.textCancel,
                                    btn.style === 'destructive' && styles.textDestructive
                                ]}>
                                    {btn.text}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    container: {
        width: 300,
        backgroundColor: Colors.cardLight,
        borderRadius: BorderRadius['2xl'],
        paddingTop: Spacing.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        alignItems: 'center',
    },
    title: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: Spacing.sm,
        textAlign: 'center',
        paddingHorizontal: Spacing.lg,
    },
    message: {
        color: Colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        lineHeight: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        width: '100%',
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '40%',
    },
    buttonBorder: {
        borderLeftWidth: 1,
        borderLeftColor: Colors.border,
    },
    buttonText: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    textCancel: {
        fontWeight: '400',
        color: Colors.text,
    },
    textDestructive: {
        color: Colors.error,
        fontWeight: '600',
    },
});
