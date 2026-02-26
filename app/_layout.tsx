// MoniPool — Root layout with expo-router
import '../global.css';
import React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Colors from '../constants/Colors';
import { AuthProvider, useAuth } from './context/AuthContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
// Metro bundle refresh trigger
SplashScreen.preventAutoHideAsync();

function RootNavigator() {
    const { isAuthenticated, isLoading } = useAuth();

    const segments = useSegments();
    const router = useRouter();

    React.useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inAdminGroup = segments[0] === '(admin)';

        if (isAuthenticated && !inAuthGroup && !inAdminGroup) {
            // Redirect to home if authenticated and not already there (or in auth/admin group)
            // If user is Admin, they might want to stay in Admin, but this logic is tricky.
            // For now: if user is authenticated and hitting root, go to tabs.
            const inTabsGroup = segments[0] === '(tabs)';
            if (inAuthGroup) {
                router.replace('/(tabs)');
            }
        } else if (!isAuthenticated && !inAuthGroup && !inAdminGroup) {
            // Redirect to login if not authenticated and not in auth OR admin group
            // Allow access to (admin) for login
            router.replace('/(auth)/login');
        }
    }, [isAuthenticated, segments, isLoading]);

    React.useEffect(() => {
        if (!isLoading) {
            SplashScreen.hideAsync();
        }
    }, [isLoading]);

    // Show loading screen while checking stored session
    if (isLoading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <>
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: Colors.background },
                    animation: 'slide_from_right',
                }}
            >
                {/* Always mount (admin) so it can be accessed when unauthenticated (login) or authenticated */}
                <Stack.Screen name="(admin)" options={{ headerShown: false }} />

                {isAuthenticated ? (
                    // Main app — shown when authenticated
                    <>
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen
                            name="notifications"
                            options={{
                                presentation: 'modal',
                                animation: 'slide_from_bottom',
                            }}
                        />
                        <Stack.Screen name="pool/[id]" options={{ headerShown: false }} />
                        <Stack.Screen
                            name="pool/[id]/chat"
                            options={{
                                presentation: 'modal',
                                animation: 'slide_from_bottom',
                            }}
                        />
                    </>
                ) : (
                    // Auth flow — shown when NOT authenticated
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                )}
            </Stack>
        </>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <View style={styles.container}>
                <StatusBar style="light" />
                <RootNavigator />
            </View>
        </AuthProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
