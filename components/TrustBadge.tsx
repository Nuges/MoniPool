// MoniPool — Trust Badge component
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import { BorderRadius } from '../constants/Layout';

interface TrustBadgeProps {
    score: number;
    level: 'verified' | 'growing' | 'high_risk';
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    showScore?: boolean;
}

export default function TrustBadge({
    score,
    level,
    size = 'md',
    showLabel = false,
    showScore = true,
}: TrustBadgeProps) {
    const color =
        level === 'verified'
            ? Colors.trustVerified
            : level === 'growing'
                ? Colors.trustGrowing
                : Colors.trustHighRisk;

    const label =
        level === 'verified'
            ? 'Verified Saver'
            : level === 'growing'
                ? 'Growing Saver'
                : 'High Risk';

    const emoji =
        level === 'verified' ? '🟢' : level === 'growing' ? '🟡' : '🔴';

    const sizes = {
        sm: { badge: 24, font: 10, dot: 6 },
        md: { badge: 32, font: 12, dot: 8 },
        lg: { badge: 44, font: 16, dot: 10 },
    };

    const s = sizes[size];

    return (
        <View style={styles.container}>
            <View
                style={[
                    styles.badge,
                    {
                        width: s.badge,
                        height: s.badge,
                        borderRadius: s.badge / 2,
                        borderColor: color,
                    },
                ]}
            >
                <Text style={[styles.score, { fontSize: s.font, color }]}>
                    {showScore ? score : emoji}
                </Text>
            </View>
            {showLabel && (
                <View style={[styles.labelContainer, { backgroundColor: `${color}15` }]}>
                    <View style={[styles.dot, { width: s.dot, height: s.dot, backgroundColor: color, borderRadius: s.dot / 2 }]} />
                    <Text style={[styles.label, { color, fontSize: s.font }]}>{label}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    badge: {
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    score: {
        fontWeight: '700',
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        gap: 6,
    },
    dot: {},
    label: {
        fontWeight: '600',
    },
});
