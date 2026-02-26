import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { Spacing, BorderRadius } from '../../constants/Layout';
import Button from '../../components/Button';
import { useAuth } from '../context/AuthContext';
import ResponsiveContainer from '../../components/ResponsiveContainer';

export default function AdminLogin() {
    const { login, logout } = useAuth();
    const [email, setEmail] = useState('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !pin) {
            Alert.alert('Error', 'Please enter email and PIN');
            return;
        }

        setLoading(true);
        try {
            // Hardcoded Admin Logic (Simulated Backend)
            // In production, this would hit an API endpoint verify-admin
            if (email.toLowerCase() === 'admin@monipool.com' && pin === '9999') {
                // Ensure we clear any existing session first
                await logout();

                await login({
                    userId: 'admin_master',
                    email: 'admin@monipool.com',
                    firstName: 'Admin',
                    lastName: 'User',
                    pin: '9999',
                    role: 'admin' // CRITICAL: Sets role to admin
                });

                router.replace('/(admin)/dashboard');
            } else {
                Alert.alert('Access Denied', 'Invalid Access Credentials');
                setPin('');
            }
        } catch (err) {
            Alert.alert('Error', 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ResponsiveContainer centered>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <MaterialIcons name="security" size={40} color={Colors.error} />
                        </View>
                        <Text style={styles.title}>Admin Access</Text>
                        <Text style={styles.subtitle}>Authorized Personnel Only</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Admin Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="admin@monipool.com"
                                placeholderTextColor={Colors.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Security PIN</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="••••"
                                placeholderTextColor={Colors.textMuted}
                                value={pin}
                                onChangeText={setPin}
                                secureTextEntry
                                keyboardType="number-pad"
                                maxLength={4}
                            />
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <Button
                            title="Authenticate"
                            onPress={handleLogin}
                            loading={loading}
                            variant="primary" // Maybe use a different color?
                        />
                        <Button
                            title="Cancel"
                            onPress={() => router.replace('/(auth)/login')}
                            variant="outline"
                            style={{ marginTop: 12 }}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </ResponsiveContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f15', // Darker background for Admin
    },
    content: {
        flex: 1,
        padding: Spacing['2xl'],
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing['4xl'],
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: `${Colors.error}20`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: Spacing.xs,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.error, // Warning color
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    form: {
        gap: Spacing.xl,
        marginBottom: Spacing['4xl'],
    },
    inputGroup: {
        gap: Spacing.sm,
    },
    label: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    input: {
        backgroundColor: '#1a1a25',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        color: Colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        marginTop: 'auto',
    },
});
