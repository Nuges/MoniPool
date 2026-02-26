import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';
import { Spacing, BorderRadius } from '../../constants/Layout';
import { router, Stack } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useAuth } from '../context/AuthContext';
import ThemedAlert from '../../components/ThemedAlert';

export default function SecuritySettings() {
    const { changePin } = useAuth();
    const [biometricsEnabled, setBiometricsEnabled] = useState(true);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

    // PIN Change State
    const [isChangingPin, setIsChangingPin] = useState(false);
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');

    // Alert States
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [showPinSuccess, setShowPinSuccess] = useState(false);
    const [showPinError, setShowPinError] = useState(false);
    const [showPinMismatch, setShowPinMismatch] = useState(false);
    const [showPinInvalid, setShowPinInvalid] = useState(false);

    const checkBiometrics = () => {
        setBiometricsEnabled(!biometricsEnabled);
    };

    const toggleTwoFactor = () => {
        setTwoFactorEnabled(!twoFactorEnabled);
        if (!twoFactorEnabled) {
            Alert.alert('2FA Enabled', 'Two-factor authentication has been enabled for your account.');
        }
    };

    const handleChangePin = async () => {
        if (newPin.length !== 4 || confirmPin.length !== 4) {
            setShowPinInvalid(true);
            return;
        }
        if (newPin !== confirmPin) {
            setShowPinMismatch(true);
            return;
        }

        try {
            await changePin(newPin);
            setShowPinSuccess(true);
        } catch (error) {
            setShowPinError(true);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => isChangingPin ? setIsChangingPin(false) : router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isChangingPin ? 'Change PIN' : 'Security & PIN'}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {isChangingPin ? (
                    <View style={styles.pinChangeContainer}>
                        <Text style={styles.pinInstruction}>Enter your new 4-digit PIN.</Text>

                        <TextInput
                            style={styles.pinInput}
                            placeholder="New PIN"
                            placeholderTextColor={Colors.textMuted}
                            value={newPin}
                            onChangeText={setNewPin}
                            keyboardType="number-pad"
                            maxLength={4}
                            secureTextEntry
                        />
                        <TextInput
                            style={styles.pinInput}
                            placeholder="Confirm PIN"
                            placeholderTextColor={Colors.textMuted}
                            value={confirmPin}
                            onChangeText={setConfirmPin}
                            keyboardType="number-pad"
                            maxLength={4}
                            secureTextEntry
                        />

                        <Button
                            title="Update PIN"
                            onPress={handleChangePin}
                            disabled={!newPin || !confirmPin}
                            style={{ marginTop: Spacing.xl }}
                        />
                    </View>
                ) : (
                    <>
                        <Text style={styles.sectionTitle}>Login Security</Text>

                        <Card variant="solid" style={styles.card}>
                            <TouchableOpacity style={styles.row} onPress={() => setIsChangingPin(true)}>
                                <View style={styles.rowLeft}>
                                    <MaterialIcons name="lock-outline" size={24} color={Colors.primary} />
                                    <Text style={styles.rowLabel}>Change Transaction PIN</Text>
                                </View>
                                <MaterialIcons name="chevron-right" size={24} color={Colors.textMuted} />
                            </TouchableOpacity>

                            <View style={styles.divider} />

                            <View style={styles.row}>
                                <View style={styles.rowLeft}>
                                    <MaterialIcons name="fingerprint" size={24} color={Colors.secondary} />
                                    <View>
                                        <Text style={styles.rowLabel}>Biometric Login</Text>
                                        <Text style={styles.rowSubtext}>Use FaceID or Fingerprint</Text>
                                    </View>
                                </View>
                                <Switch
                                    value={biometricsEnabled}
                                    onValueChange={checkBiometrics}
                                    trackColor={{ false: Colors.border, true: Colors.primary }}
                                    thumbColor="#fff"
                                />
                            </View>
                        </Card>

                        <Text style={styles.sectionTitle}>Account Security</Text>

                        <Card variant="solid" style={styles.card}>
                            <View style={styles.row}>
                                <View style={styles.rowLeft}>
                                    <MaterialIcons name="security" size={24} color={Colors.warning} />
                                    <View>
                                        <Text style={styles.rowLabel}>Two-Factor Auth (2FA)</Text>
                                        <Text style={styles.rowSubtext}>Extra layer of security</Text>
                                    </View>
                                </View>
                                <Switch
                                    value={twoFactorEnabled}
                                    onValueChange={toggleTwoFactor}
                                    trackColor={{ false: Colors.border, true: Colors.primary }}
                                    thumbColor="#fff"
                                />
                            </View>

                            <View style={styles.divider} />

                            <TouchableOpacity style={styles.row} onPress={() => Alert.alert('Active Sessions', 'List of active sessions would appear here.')}>
                                <View style={styles.rowLeft}>
                                    <MaterialIcons name="devices" size={24} color={Colors.textMuted} />
                                    <Text style={styles.rowLabel}>Active Sessions</Text>
                                </View>
                                <MaterialIcons name="chevron-right" size={24} color={Colors.textMuted} />
                            </TouchableOpacity>
                        </Card>

                        <TouchableOpacity style={styles.deleteButton} onPress={() => setShowDeleteAlert(true)}>
                            <Text style={styles.deleteText}>Delete Account</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>

            <ThemedAlert
                visible={showPinSuccess}
                title="Success"
                message="Your PIN has been updated."
                onClose={() => {
                    setShowPinSuccess(false);
                    setIsChangingPin(false);
                    setNewPin('');
                    setConfirmPin('');
                }}
            />

            <ThemedAlert
                visible={showPinError}
                title="Error"
                message="Failed to update PIN."
                onClose={() => setShowPinError(false)}
            />

            <ThemedAlert
                visible={showPinMismatch}
                title="Mismatch"
                message="PINs do not match."
                onClose={() => setShowPinMismatch(false)}
            />

            <ThemedAlert
                visible={showPinInvalid}
                title="Invalid PIN"
                message="PIN must be 4 digits."
                onClose={() => setShowPinInvalid(false)}
            />

            <ThemedAlert
                visible={showDeleteAlert}
                title="Delete Account"
                message="Are you sure? This action cannot be undone."
                buttons={[
                    { text: 'Cancel', style: 'cancel', onPress: () => setShowDeleteAlert(false) },
                    {
                        text: 'Delete', style: 'destructive', onPress: () => {
                            setShowDeleteAlert(false);
                            // Implement delete logic
                            // For simulation, just close
                        }
                    }
                ]}
                onClose={() => setShowDeleteAlert(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.md,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        color: Colors.text,
        fontSize: 20,
        fontWeight: '700',
    },
    content: {
        padding: Spacing.lg,
    },
    sectionTitle: {
        color: Colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
        marginTop: Spacing.lg,
        marginBottom: Spacing.md,
        marginLeft: Spacing.sm,
    },
    card: {
        padding: 0,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.lg,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    rowLabel: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '500',
    },
    rowSubtext: {
        color: Colors.textMuted,
        fontSize: 12,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginLeft: Spacing.lg,
    },
    deleteButton: {
        alignItems: 'center',
        marginTop: Spacing['2xl'],
        padding: Spacing.lg,
    },
    deleteText: {
        color: Colors.error,
        fontSize: 15,
        fontWeight: '600',
    },
    pinChangeContainer: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.xl,
    },
    pinInstruction: {
        color: Colors.text,
        fontSize: 16,
        marginBottom: Spacing.xl,
    },
    pinInput: {
        backgroundColor: Colors.card,
        color: Colors.text,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        fontSize: 18,
        marginBottom: Spacing.lg,
        textAlign: 'center',
        letterSpacing: 4,
    },
});
