// MoniPool — Glassmorphism Card component
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/Colors';
import { BorderRadius, Shadows } from '../constants/Layout';

interface CardProps {
    children: React.ReactNode;
    variant?: 'glass' | 'solid' | 'gradient' | 'outlined';
    gradientColors?: readonly [string, string, ...string[]];
    style?: ViewStyle;
    padding?: number;
}

export default function Card({
    children,
    variant = 'glass',
    gradientColors,
    style,
    padding = 16,
}: CardProps) {
    if (variant === 'gradient') {
        return (
            <LinearGradient
                colors={gradientColors || [Colors.card, Colors.cardLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                    styles.base,
                    { padding },
                    Shadows.card,
                    style,
                ]}
            >
                {children}
            </LinearGradient>
        );
    }

    return (
        <View
            style={[
                styles.base,
                variant === 'glass' && styles.glass,
                variant === 'solid' && styles.solid,
                variant === 'outlined' && styles.outlined,
                { padding },
                Shadows.card,
                style,
            ]}
        >
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
    },
    glass: {
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    },
    solid: {
        backgroundColor: Colors.card,
    },
    outlined: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Colors.border,
    },
});
