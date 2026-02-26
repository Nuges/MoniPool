// MoniPool — Login (Phone or Email)
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { Spacing, BorderRadius } from '../../constants/Layout';
import Button from '../../components/Button';
import ResponsiveContainer from '../../components/ResponsiveContainer';

type LoginMethod = 'phone' | 'email';

export default function Login() {
    const [method, setMethod] = useState<LoginMethod>('phone');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    const isPhoneValid = phone.replace(/\D/g, '').length >= 10;
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const isValid = method === 'phone' ? isPhoneValid : isEmailValid;

    const handleNext = () => {
        if (!isValid) return;

        if (method === 'phone') {
            router.push({ pathname: '/(auth)/otp', params: { phone } });
        } else {
            router.push({ pathname: '/(auth)/otp', params: { email } });
        }
    };

    return (
        <ResponsiveContainer centered>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <TouchableOpacity
                        activeOpacity={1}
                        onLongPress={() => {
                            Alert.alert(
                                'Admin Access',
                                'Enter Admin Portal?',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Enter', onPress: () => router.push('/(admin)/login') }
                                ]
                            );
                        }}
                        delayLongPress={800} // Reduced to 0.8s for easier access
                        style={styles.header}
                    >
                        <View style={styles.iconContainer}>
                            <MaterialIcons name={method === 'phone' ? "smartphone" : "mail-outline"} size={32} color={Colors.primary} />
                        </View>
                        <Text style={styles.title}>
                            {method === 'phone' ? 'Phone Number' : 'Email Address'}
                        </Text>
                        <Text style={styles.subtitle}>
                            We'll send you a verification code to confirm your identity.
                        </Text>
                    </TouchableOpacity>

                    {/* Toggle Switch */}
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[styles.toggleBtn, method === 'phone' && styles.toggleBtnActive]}
                            onPress={() => setMethod('phone')}
                        >
                            <Text style={[styles.toggleText, method === 'phone' && styles.toggleTextActive]}>Phone</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleBtn, method === 'email' && styles.toggleBtnActive]}
                            onPress={() => setMethod('email')}
                        >
                            <Text style={[styles.toggleText, method === 'email' && styles.toggleTextActive]}>Email</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Input Fields */}
                    {method === 'phone' ? (
                        <View style={styles.inputContainer}>
                            <View style={styles.flagContainer}>
                                <Text style={styles.flag}>🇳🇬</Text>
                                <Text style={styles.countryCode}>+234</Text>
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="812 345 6789"
                                placeholderTextColor={Colors.textMuted}
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                                maxLength={15}
                                autoFocus
                            />
                        </View>
                    ) : (
                        <View style={styles.inputContainer}>
                            <MaterialIcons name="email" size={24} color={Colors.textMuted} style={{ paddingLeft: Spacing.lg }} />
                            <TextInput
                                style={styles.input}
                                placeholder="name@example.com"
                                placeholderTextColor={Colors.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoFocus
                            />
                        </View>
                    )}

                    <Text style={styles.infoText}>
                        By continuing, you agree to our Terms of Service and Privacy Policy
                    </Text>

                    {/* Spacer */}
                    <View style={{ flex: 1 }} />

                    {/* Button */}
                    <View style={styles.buttonContainer}>
                        <Button
                            title="Send Code"
                            onPress={handleNext}
                            disabled={!isValid}
                            size="lg"
                        />

                        {Platform.OS === 'web' && (
                            <TouchableOpacity
                                onPress={() => router.push('/(admin)/login')}
                                style={{ marginTop: Spacing.xl, alignSelf: 'center' }}
                            >
                                <Text style={{ color: Colors.textMuted, fontSize: 12 }}>Admin Access</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ResponsiveContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing['2xl'],
    },
    header: {
        paddingTop: Spacing['4xl'],
        marginBottom: Spacing['2xl'],
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: BorderRadius.full,
        backgroundColor: `${Colors.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    title: {
        color: Colors.text,
        fontSize: 32,
        fontWeight: '800',
        marginBottom: Spacing.xs,
        lineHeight: 40,
    },
    subtitle: {
        color: Colors.textSecondary,
        fontSize: 16,
        lineHeight: 24,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg,
        padding: 4,
        marginBottom: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: BorderRadius.md,
    },
    toggleBtnActive: {
        backgroundColor: Colors.primary,
    },
    toggleText: {
        color: Colors.textMuted,
        fontWeight: '600',
        fontSize: 14,
    },
    toggleTextActive: {
        color: '#fff',
        fontWeight: '700',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        overflow: 'hidden',
        marginBottom: Spacing.lg,
    },
    flagContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        borderRightWidth: 1,
        borderRightColor: Colors.border,
        gap: 6,
    },
    flag: {
        fontSize: 24,
    },
    countryCode: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    input: {
        flex: 1,
        color: Colors.text,
        fontSize: 18,
        fontWeight: '600',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        letterSpacing: 0.5,
    },
    infoText: {
        color: Colors.textMuted,
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
    buttonContainer: {
        paddingBottom: Spacing['3xl'],
        marginTop: 'auto',
    },
});
