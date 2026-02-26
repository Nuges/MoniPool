// MoniPool — Avatar component
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';

interface AvatarProps {
    name: string;
    size?: number;
    color?: string;
}

export default function Avatar({ name, size = 40, color }: AvatarProps) {
    const initials = name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    // Generate a consistent color from the name
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    const bgColor = color || `hsl(${hue}, 60%, 45%)`;

    return (
        <View
            style={[
                styles.avatar,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: bgColor,
                },
            ]}
        >
            <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    avatar: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    initials: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
});
