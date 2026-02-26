// MoniPool — OTP verification screen
import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { Spacing, BorderRadius } from '../../constants/Layout';
import Button from '../../components/Button';

const OTP_LENGTH = 6;

export default function OTP() {
    const params = useLocalSearchParams();
    const phone = params.phone as string;
    const email = params.email as string;

    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [timer, setTimer] = useState(59);
    const [loading, setLoading] = useState(false);
    const inputRefs = useRef<(TextInput | null)[]>([]);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimer(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleChange = (text: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);

        if (text && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (key: string, index: number) => {
        if (key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const isComplete = otp.every(d => d !== '');

    const handleVerify = () => {
        setLoading(true);
        // Simulate verification
        setTimeout(() => {
            setLoading(false);
            if (phone) {
                router.push({ pathname: '/(auth)/pin', params: { phone } });
            } else {
                router.push({ pathname: '/(auth)/pin', params: { email } });
            }
        }, 1500);
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <MaterialIcons name="lock-open" size={32} color={Colors.primary} />
                        </View>
                        <Text style={styles.title}>Verify your{'\n'}{email ? 'email address' : 'phone number'}</Text>
                        <Text style={styles.subtitle}>
                            Enter the 6-digit code sent to{'\n'}
                            <Text style={styles.phoneText}>{email || phone || '+234 812 345 ****'}</Text>
                        </Text>
                    </View>

                    {/* OTP Input */}
                    <View style={styles.otpContainer}>
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={ref => { inputRefs.current[index] = ref; }}
                                style={[
                                    styles.otpInput,
                                    digit ? styles.otpInputFilled : null,
                                ]}
                                value={digit}
                                onChangeText={text => handleChange(text, index)}
                                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                                keyboardType="number-pad"
                                maxLength={1}
                                selectTextOnFocus
                                autoFocus={index === 0}
                            />
                        ))}
                    </View>

                    {/* Resend */}
                    <View style={styles.resendContainer}>
                        {timer > 0 ? (
                            <Text style={styles.timerText}>
                                Resend code in <Text style={styles.timerBold}>0:{timer.toString().padStart(2, '0')}</Text>
                            </Text>
                        ) : (
                            <TouchableOpacity onPress={() => setTimer(59)}>
                                <Text style={styles.resendText}>Resend Code</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Spacer */}
                    <View style={{ flex: 1 }} />

                    {/* Button */}
                    <View style={styles.buttonContainer}>
                        <Button
                            title="Verify"
                            onPress={handleVerify}
                            disabled={!isComplete}
                            loading={loading}
                            size="lg"
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
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
        marginBottom: Spacing['3xl'],
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
        marginBottom: Spacing.md,
        lineHeight: 40,
    },
    subtitle: {
        color: Colors.textSecondary,
        fontSize: 16,
        lineHeight: 24,
    },
    phoneText: {
        color: Colors.primary,
        fontWeight: '700',
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginBottom: Spacing['2xl'],
    },
    otpInput: {
        width: 48,
        height: 56,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.card,
        borderWidth: 1.5,
        borderColor: Colors.border,
        color: Colors.text,
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
    },
    otpInputFilled: {
        borderColor: Colors.primary,
        backgroundColor: `${Colors.primary}10`,
    },
    resendContainer: {
        alignItems: 'center',
    },
    timerText: {
        color: Colors.textMuted,
        fontSize: 14,
    },
    timerBold: {
        color: Colors.text,
        fontWeight: '700',
    },
    resendText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    buttonContainer: {
        paddingBottom: Spacing['3xl'],
        marginTop: 'auto',
    },
});
