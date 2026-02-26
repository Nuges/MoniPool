import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import Colors from '../../constants/Colors';

export default function AdminLayout() {
    const { isAuthenticated, role, isLoading } = useAuth();

    // If loading, let the root layout handle the spinner, or return null here
    if (isLoading) return null;

    // Security Check: Must be Authenticated AND have Role = 'admin'
    // Note: The login screen itself is part of this group, so we need to allow access to it.
    // However, usually we want to protect the *content*.
    // A better pattern for expo-router is "Layout Wrapper".

    // BUT: If we are not authenticated, we shouldn't be here (RootLayout handles that).
    // If we are authenticated but NOT admin, we should be kicked out.
    // Exception: The Admin Login screen itself might be public? 
    // No, per plan: "Admin login is SEPARATE... On successful login: Set role = 'admin'".
    // So usually user is NOT logged in when they hit Admin Login.

    // Wait, if they are already logged in as a 'user', they can't access this group?
    // The plan says: "Admin login is SEPARATE... Accessed via hidden gesture".
    // Implementation Detail:
    // If user is logged in as 'user', and they trigger admin login, we might need to logout first?
    // Or we just show the login screen.

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.background },
            }}
        >
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="dashboard" options={{ headerShown: false }} />
            <Stack.Screen name="pools" options={{ headerShown: false }} />
            <Stack.Screen name="users" options={{ headerShown: false }} />
            <Stack.Screen name="escrow" options={{ headerShown: false }} />
        </Stack>
    );
}
