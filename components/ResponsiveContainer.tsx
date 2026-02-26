import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';

interface ResponsiveContainerProps {
    children: React.ReactNode;
    style?: ViewStyle;
    maxWidth?: number; // Default to 480 for phone-like feel, or higher for dashboards
    centered?: boolean; // Whether to vertically center content (good for login)
}

export default function ResponsiveContainer({
    children,
    style,
    maxWidth = 480,
    centered = false
}: ResponsiveContainerProps) {

    // On Web, we want a centered card-like experience
    if (Platform.OS === 'web') {
        return (
            <View style={[styles.webBackground, centered && styles.centeredContent]}>
                <View style={[
                    styles.webContainer,
                    { maxWidth },
                    style
                ]}>
                    {children}
                </View>
            </View>
        );
    }

    // On Mobile, just pass through (SafeArea handled by screens essentially, but let's standardize)
    // Actually, screens usually handle their own SafeArea, but if we wrap them, we might duplicate padding.
    // Let's assume this replaces the top-level View/SafeAreaView for layout purposes.
    return (
        <SafeAreaView style={[styles.mobileContainer, style]}>
            {children}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    webBackground: {
        flex: 1,
        backgroundColor: '#000', // Dark background for the "outside" area
        alignItems: 'center',
        justifyContent: 'center', // Center vertically by default on web?
        minHeight: '100%',
    },
    centeredContent: {
        justifyContent: 'center',
    },
    webContainer: {
        flex: 1,
        width: '100%',
        backgroundColor: Colors.background, // The actual app background
        // Add shadow for "floating phone" effect on desktop
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 20,
        },
        shadowOpacity: 0.5,
        shadowRadius: 24,
        elevation: 20,
        // On very large screens, maybe round corners?
        // borderRadius: 20, // Optional: might look like a phone
        minHeight: Platform.OS === 'web' ? undefined : undefined, // flex:1 handles sizing
        overflow: 'hidden', // Clip content
    },
    mobileContainer: {
        flex: 1,
        backgroundColor: Colors.background,
    },
});
