// MoniPool — PIN verification & setup screen
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { Spacing, BorderRadius } from '../../constants/Layout';
import { useAuth } from '../../app/context/AuthContext';

const PIN_LENGTH = 4;

export default function PinSetup() {
    const params = useLocalSearchParams();
    const phone = params.phone as string;
    const email = params.email as string;
    const { isRegistered, phone: storedPhone, email: storedEmail, verifyPin, loginWithPin, firstName, establishAuthSession } = useAuth();

    // MODE: "login" if user exists on device (has a stored PIN). Else "setup" (new user).
    const [mode, setMode] = useState<'login' | 'setup'>('setup');

    useEffect(() => {
        // If the user is registered (PIN hash exists in storage), they are a returning user.
        // We don't need to match phone/email exactly — they may have logged out and 
        // re-entered slightly differently, or used a different method (phone vs email).
        if (isRegistered) {
            setMode('login');
        } else {
            setMode('setup');
        }
    }, [isRegistered]);

    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);
    const [error, setError] = useState('');

    // In Login mode, we only have one PIN entry phase.
    // In Setup mode, we have Create -> Confirm.
    const currentPin = (mode === 'setup' && isConfirming) ? confirmPin : pin;

    const handlePress = async (num: string) => {
        if (currentPin.length >= PIN_LENGTH) return;

        const newPin = currentPin + num;

        if (mode === 'login') {
            setPin(newPin);
            if (newPin.length === PIN_LENGTH) {
                // Verify immediately
                const isValid = await verifyPin(newPin);
                if (isValid) {
                    try {
                        // Re-establish session in Supabase before finalizing frontend login
                        const identifier = storedPhone ? { phone: storedPhone } : { email: storedEmail || undefined };
                        await establishAuthSession({
                            ...identifier,
                            pin: newPin
                        });

                        await loginWithPin();
                        // Smooth transition
                        router.replace('/(tabs)');
                    } catch (err: any) {
                        setError(err.message || 'Failed to initialize session. Please try again.');
                        setPin('');
                    }
                } else {
                    setError('Incorrect PIN');
                    setTimeout(() => {
                        setPin('');
                        setError('');
                    }, 1000);
                }
            }
        } else {
            // Setup Mode
            if (isConfirming) {
                setConfirmPin(newPin);
                if (newPin.length === PIN_LENGTH) {
                    if (newPin === pin) {
                        try {
                            // Determine user identifier
                            const identifier = phone ? { phone } : { email };

                            // Establish the Supabase Auth session instantly
                            await establishAuthSession({
                                ...identifier,
                                pin: newPin
                            });

                            // PIN confirmed & Auth active, navigate to profile
                            if (phone) {
                                router.push({ pathname: '/(auth)/profile', params: { phone, pin } });
                            } else {
                                router.push({ pathname: '/(auth)/profile', params: { email, pin } });
                            }
                        } catch (err: any) {
                            setError(err.message || 'Failed to initialize session. Please try again.');
                            setConfirmPin('');
                            setIsConfirming(false);
                            setPin('');
                        }
                    } else {
                        setError('PINs don\'t match. Try again.');
                        setTimeout(() => {
                            setConfirmPin('');
                            setError('');
                        }, 1500);
                    }
                }
            } else {
                setPin(newPin);
                if (newPin.length === PIN_LENGTH) {
                    setTimeout(() => {
                        setIsConfirming(true);
                    }, 300);
                }
            }
        }
    };

    const handleDelete = () => {
        if (mode === 'setup' && isConfirming) {
            setConfirmPin(prev => prev.slice(0, -1));
        } else {
            setPin(prev => prev.slice(0, -1));
        }
        setError('');
    };

    const numPad = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['', '0', 'backspace'],
    ];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <MaterialIcons name={mode === 'login' ? "lock-open" : "lock"} size={32} color={Colors.primary} />
                    </View>
                    <Text style={styles.title}>
                        {mode === 'login'
                            ? `Welcome back,\n${firstName || 'User'}`
                            : (isConfirming ? 'Confirm your\nPIN' : 'Create a\nsecure PIN')}
                    </Text>
                    <Text style={styles.subtitle}>
                        {mode === 'login'
                            ? 'Enter your 4-digit PIN to access your account'
                            : (isConfirming
                                ? 'Re-enter your 4-digit PIN to confirm'
                                : 'Set a 4-digit PIN to secure your account')}
                    </Text>
                </View>

                {/* PIN dots */}
                <View style={styles.dotsContainer}>
                    {Array(PIN_LENGTH)
                        .fill(0)
                        .map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.dot,
                                    i < currentPin.length && styles.dotFilled,
                                    error && styles.dotError,
                                ]}
                            />
                        ))}
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {/* Spacer */}
                <View style={{ flex: 1 }} />

                {/* Numpad */}
                <View style={styles.numpad}>
                    {numPad.map((row, rowIndex) => (
                        <View key={rowIndex} style={styles.numpadRow}>
                            {row.map((num, numIndex) => (
                                <TouchableOpacity
                                    key={numIndex}
                                    style={[
                                        styles.numpadKey,
                                        num === '' && styles.numpadKeyEmpty,
                                    ]}
                                    onPress={() => {
                                        if (num === 'backspace') handleDelete();
                                        else if (num !== '') handlePress(num);
                                    }}
                                    activeOpacity={0.6}
                                    disabled={num === ''}
                                >
                                    {num === 'backspace' ? (
                                        <MaterialIcons name="backspace" size={24} color={Colors.text} />
                                    ) : (
                                        <Text style={styles.numpadText}>{num}</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing['2xl'],
    },
    header: {
        paddingTop: Spacing['4xl'],
        marginBottom: Spacing['3xl'],
        alignItems: 'center',
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
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: Spacing.md,
        lineHeight: 36,
    },
    subtitle: {
        color: Colors.textSecondary,
        fontSize: 15,
        textAlign: 'center',
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginBottom: Spacing.lg,
    },
    dot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: Colors.border,
        backgroundColor: 'transparent',
    },
    dotFilled: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    dotError: {
        borderColor: Colors.error,
        backgroundColor: Colors.error,
    },
    errorText: {
        color: Colors.error,
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '600',
    },
    numpad: {
        paddingBottom: Spacing['3xl'],
        gap: 12,
        marginTop: 20,
    },
    numpadRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
    },
    numpadKey: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Colors.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    numpadKeyEmpty: {
        backgroundColor: 'transparent',
    },
    numpadText: {
        color: Colors.text,
        fontSize: 26,
        fontWeight: '600',
    },
});
