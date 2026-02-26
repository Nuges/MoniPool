import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import { Spacing, BorderRadius } from '../constants/Layout';
import { MaterialIcons } from '@expo/vector-icons';

export interface ActionSheetOption {
    label: string;
    icon?: keyof typeof MaterialIcons.glyphMap;
    onPress: () => void;
    destructive?: boolean;
}

interface ActionSheetProps {
    visible: boolean;
    title?: string;
    options: ActionSheetOption[];
    onClose: () => void;
    cancelText?: string;
}

export default function ActionSheet({
    visible,
    title,
    options,
    onClose,
    cancelText = 'Cancel'
}: ActionSheetProps) {
    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />

                <SafeAreaView edges={['bottom']} style={styles.sheetContainer}>
                    <TouchableOpacity activeOpacity={1} style={styles.sheet}>
                        <View style={styles.handle} />

                        {title && (
                            <View style={styles.header}>
                                <Text style={styles.title}>{title}</Text>
                            </View>
                        )}

                        <View style={styles.optionsContainer}>
                            {options.map((option, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.option,
                                        index < options.length - 1 && styles.optionBorder
                                    ]}
                                    onPress={() => {
                                        onClose();
                                        option.onPress();
                                    }}
                                >
                                    {option.icon && (
                                        <MaterialIcons
                                            name={option.icon}
                                            size={22}
                                            color={option.destructive ? Colors.error : Colors.text}
                                            style={styles.icon}
                                        />
                                    )}
                                    <Text style={[
                                        styles.optionText,
                                        option.destructive && styles.destructiveText
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelText}>{cancelText}</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </SafeAreaView>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheetContainer: {
        backgroundColor: 'transparent',
    },
    sheet: {
        backgroundColor: Colors.card,
        borderTopLeftRadius: BorderRadius['2xl'],
        borderTopRightRadius: BorderRadius['2xl'],
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.xl,
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: Colors.border,
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: Spacing.xl,
    },
    header: {
        marginBottom: Spacing.lg,
        alignItems: 'center',
    },
    title: {
        color: Colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    optionsContainer: {
        backgroundColor: Colors.cardLight,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        marginBottom: Spacing.lg,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: Spacing.lg,
    },
    optionBorder: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    icon: {
        marginRight: Spacing.md,
    },
    optionText: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '500',
    },
    destructiveText: {
        color: Colors.error,
    },
    cancelButton: {
        backgroundColor: Colors.cardLight,
        borderRadius: BorderRadius.xl,
        paddingVertical: 16,
        alignItems: 'center',
    },
    cancelText: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
});
