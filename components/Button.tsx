// MoniPool — Reusable Button component
import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/Colors';
import { BorderRadius, Shadows } from '../constants/Layout';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    disabled?: boolean;
    icon?: React.ReactNode;
    style?: ViewStyle;
    textStyle?: TextStyle;
    fullWidth?: boolean;
}

export default function Button({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon,
    style,
    textStyle,
    fullWidth = true,
}: ButtonProps) {
    const sizeStyles = {
        sm: { paddingVertical: 10, paddingHorizontal: 16, fontSize: 13 },
        md: { paddingVertical: 14, paddingHorizontal: 24, fontSize: 15 },
        lg: { paddingVertical: 18, paddingHorizontal: 32, fontSize: 17 },
    };

    const isGradient = variant === 'primary' || variant === 'secondary';

    const content = (
        <>
            {loading ? (
                <ActivityIndicator
                    color={variant === 'outline' || variant === 'ghost' ? Colors.primary : '#fff'}
                    size="small"
                />
            ) : (
                <>
                    {icon}
                    <Text
                        style={[
                            styles.text,
                            { fontSize: sizeStyles[size].fontSize },
                            variant === 'outline' && { color: Colors.primary },
                            variant === 'ghost' && { color: Colors.primary },
                            icon ? { marginLeft: 8 } : undefined,
                            textStyle,
                        ]}
                    >
                        {title}
                    </Text>
                </>
            )}
        </>
    );

    if (isGradient) {
        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={disabled || loading}
                activeOpacity={0.8}
                style={[fullWidth && styles.fullWidth, style]}
            >
                <LinearGradient
                    colors={
                        variant === 'primary'
                            ? [Colors.primary, Colors.primaryDark]
                            : [Colors.secondary, Colors.secondaryDark]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                        styles.base,
                        {
                            paddingVertical: sizeStyles[size].paddingVertical,
                            paddingHorizontal: sizeStyles[size].paddingHorizontal,
                        },
                        disabled && styles.disabled,
                        Shadows.button,
                    ]}
                >
                    {content}
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
            style={[
                styles.base,
                {
                    paddingVertical: sizeStyles[size].paddingVertical,
                    paddingHorizontal: sizeStyles[size].paddingHorizontal,
                },
                variant === 'outline' && styles.outline,
                variant === 'ghost' && styles.ghost,
                disabled && styles.disabled,
                fullWidth && styles.fullWidth,
                style,
            ]}
        >
            {content}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BorderRadius.lg,
        minHeight: 48,
    },
    text: {
        color: '#FFFFFF',
        fontWeight: '700',
        textAlign: 'center',
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: Colors.primary,
    },
    ghost: {
        backgroundColor: 'transparent',
    },
    disabled: {
        opacity: 0.5,
    },
    fullWidth: {
        width: '100%',
    },
});
