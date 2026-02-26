// MoniPool — Profile setup screen
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { BorderRadius, Spacing } from '../../constants/Layout';
import Button from '../../components/Button';
import { useAuth } from '../context/AuthContext';
import * as Crypto from 'expo-crypto';
import { supabase } from '../services/supabaseClient';

export default function ProfileSetup() {
    const params = useLocalSearchParams();
    const phone = (params.phone as string) || '';
    const email = (params.email as string) || '';
    const pin = (params.pin as string) || '0000';
    const { login } = useAuth();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [bvn, setBvn] = useState('');
    const [errorText, setErrorText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isValid = (firstName?.trim()?.length || 0) >= 2 && (lastName?.trim()?.length || 0) >= 2;

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <MaterialIcons name="person" size={32} color={Colors.primary} />
                        </View>
                        <Text style={styles.title}>Set up your{'\n'}profile</Text>
                        <Text style={styles.subtitle}>
                            Tell us a bit about yourself.{'\n'}This helps build trust within your groups.
                        </Text>
                    </View>

                    {/* Avatar placeholder */}
                    <TouchableOpacity style={styles.avatarContainer} activeOpacity={0.7}>
                        <View style={styles.avatar}>
                            <MaterialIcons name="add-a-photo" size={32} color={Colors.textMuted} />
                        </View>
                        <Text style={styles.avatarText}>Add Photo</Text>
                    </TouchableOpacity>

                    {/* Form */}
                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>First Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your first name"
                                placeholderTextColor={Colors.textMuted}
                                value={firstName}
                                onChangeText={setFirstName}
                                autoCapitalize="words"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Last Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your last name"
                                placeholderTextColor={Colors.textMuted}
                                value={lastName}
                                onChangeText={setLastName}
                                autoCapitalize="words"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={styles.labelRow}>
                                <Text style={styles.label}>BVN / NIN</Text>
                                <View style={styles.optionalBadge}>
                                    <Text style={styles.optionalText}>Optional</Text>
                                </View>
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your BVN or NIN"
                                placeholderTextColor={Colors.textMuted}
                                value={bvn}
                                onChangeText={setBvn}
                                keyboardType="number-pad"
                                maxLength={11}
                            />
                            <View style={styles.helperContainer}>
                                <MaterialIcons name="lock" size={12} color={Colors.textMuted} />
                                <Text style={styles.helperText}>
                                    Adding BVN/NIN boosts your trust score and unlocks higher pool limits
                                </Text>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{phone ? 'Phone Number' : 'Email Address'}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: Colors.background, color: Colors.textMuted }]}
                                value={phone || email}
                                editable={false}
                                placeholder={phone ? "Phone number" : "Email address"}
                                placeholderTextColor={Colors.textMuted}
                            />
                            <View style={styles.helperContainer}>
                                <MaterialIcons name="verified" size={12} color={Colors.success} />
                                <Text style={{ color: Colors.success, fontSize: 12 }}>Verified</Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>

                {/* Credit Bureau Warning */}
                <View style={styles.disclaimerContainer}>
                    <MaterialIcons name="gavel" size={16} color={Colors.warning} />
                    <Text style={styles.disclaimerText}>
                        By completing setup, you agree that missed pool contributions may be reported to National Credit Bureaus. This protects all MoniPool members.
                    </Text>
                </View>

                {/* Button */}
                <View style={styles.buttonContainer}>
                    <Button
                        title="Complete Setup"
                        onPress={async () => {
                            if (isSubmitting) return; // Prevent double taps

                            setIsSubmitting(true);
                            setErrorText('');

                            try {
                                // 1. Remove all auth calls from this screen.
                                // We assume the user is already authenticated via OTP/Magic Link 
                                // prior to reaching the Profile Setup screen. 
                                // We just need to save their profile data to the database.

                                const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

                                if (sessionError) {
                                    throw new Error("Could not verify active session.");
                                }

                                const activeUserId = sessionData?.session?.user?.id;

                                if (!activeUserId) {
                                    throw new Error("No authenticated user found. Please restart the app and log in again.");
                                }

                                const safeFirstName = firstName?.trim() ?? '';
                                const safeLastName = lastName?.trim() ?? '';

                                // 2. Write strictly to the `profiles` table using the authenticated user's ID
                                const { error: dbError } = await supabase.from('profiles').upsert({
                                    id: activeUserId,
                                    first_name: safeFirstName,
                                    last_name: safeLastName,
                                    phone: phone || null,
                                    email: email || `${activeUserId.replace(/-/g, '')}@monipool.mock.com`
                                }, { onConflict: 'id' });

                                if (dbError) {
                                    throw new Error(dbError.message);
                                }

                                // 3. Sync the local React Context state AND persist using the AuthContext `login` function
                                await login({
                                    userId: activeUserId,
                                    phone: phone,
                                    email: email,
                                    firstName: safeFirstName,
                                    lastName: safeLastName,
                                    pin: String(pin)
                                });

                                // 4. Navigate once on success. The RootLayout will automatically catch isAuthenticated
                                // and switch to /(tabs), but this guarantees a clean transition.
                                router.replace('/(tabs)');
                            } catch (err: any) {
                                console.error('[ProfileSetup] Submission Error:', err);

                                const msg = err?.message || '';
                                if (msg.toLowerCase().includes('rate limit')) {
                                    // Handle rate limit defensively - do NOT throw
                                    console.warn('[ProfileSetup] Rate limit hit on profile save, but allowing to proceed if profile was saved locally.');
                                    setErrorText('Too many attempts. Please wait a few moments before trying again.');
                                } else {
                                    setErrorText(msg || 'Setup failed. Please check your details and try again.');
                                }
                            } finally {
                                setIsSubmitting(false);
                            }
                        }}
                        disabled={!isValid || isSubmitting}
                        variant="secondary"
                        size="lg"
                    />
                    {!!errorText && (
                        <Text style={{ color: Colors.error, marginTop: 12, textAlign: 'center' }}>
                            {errorText}
                        </Text>
                    )}
                </View>
            </KeyboardAvoidingView>
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
        paddingBottom: Spacing.xl,
    },
    header: {
        paddingTop: Spacing['3xl'],
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
        marginBottom: Spacing.md,
        lineHeight: 40,
    },
    subtitle: {
        color: Colors.textSecondary,
        fontSize: 16,
        lineHeight: 24,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: Spacing['3xl'],
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.card,
        borderWidth: 2,
        borderColor: Colors.border,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    avatarText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    form: {
        gap: Spacing.xl,
    },
    inputGroup: {
        gap: Spacing.sm,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    label: {
        color: Colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    optionalBadge: {
        backgroundColor: `${Colors.primary}20`,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
    },
    optionalText: {
        color: Colors.primary,
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    input: {
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        color: Colors.text,
        fontSize: 16,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
    },
    helperContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        marginTop: 4,
    },
    helperText: {
        color: Colors.textMuted,
        fontSize: 12,
        lineHeight: 16,
        flex: 1,
    },
    buttonContainer: {
        paddingHorizontal: Spacing['2xl'],
        paddingBottom: Spacing['3xl'],
        paddingTop: Spacing.md,
        marginTop: 'auto',
    },
    disclaimerContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingHorizontal: Spacing['2xl'],
        paddingVertical: Spacing.md,
        backgroundColor: `${Colors.warning}10`,
        borderRadius: BorderRadius.md,
        marginHorizontal: Spacing['2xl'],
    },
    disclaimerText: {
        color: Colors.textSecondary,
        fontSize: 11,
        lineHeight: 16,
        flex: 1,
    },
});
