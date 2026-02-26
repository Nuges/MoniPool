import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform, Pressable } from 'react-native';
import Colors from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
}

/**
 * Reusable Tooltip Component (Renamed to prevent name collision/cache issues)
 * Displays a small info bubble on tap (mobile) or hover (web - simulated via press).
 */
export default function InfoTooltip({ content, children }: TooltipProps) {
    const [visible, setVisible] = useState(false);

    return (
        <View style={styles.container}>
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setVisible(true)}
                style={styles.trigger}
            >
                {children}
            </TouchableOpacity>

            <Modal
                transparent={true}
                visible={visible}
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
                    <View style={styles.tooltipContainer}>
                        <View style={styles.bubble}>
                            <View style={styles.headerRow}>
                                <Ionicons name="information-circle" size={20} color={Colors.primary} />
                                <Text style={styles.title}>Info</Text>
                            </View>
                            <Text style={styles.content}>{content}</Text>
                            <Text style={styles.dismiss}>Tap anywhere to close</Text>
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {

    },
    trigger: {

    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    tooltipContainer: {
        width: '100%',
        maxWidth: 300,
        backgroundColor: 'transparent',
    },
    bubble: {
        backgroundColor: Colors.background,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.text,
    },
    content: {
        fontSize: 14,
        color: Colors.textDim,
        lineHeight: 20,
        marginBottom: 12,
    },
    dismiss: {
        fontSize: 12,
        color: Colors.primary,
        textAlign: 'center',
        opacity: 0.8,
    },
});
