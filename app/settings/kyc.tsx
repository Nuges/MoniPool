import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';
import { Spacing, BorderRadius } from '../../constants/Layout';
import { router, Stack } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Button from '../../components/Button';
import ThemedAlert from '../../components/ThemedAlert';
import { useAuth } from '../context/AuthContext';

export default function KYC() {
    const { kycStatus, updateProfile } = useAuth();
    const [idType, setIdType] = useState('NIN');
    const [idNumber, setIdNumber] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showErrorAlert, setShowErrorAlert] = useState(false);

    // If already verified, show static success state
    const isVerified = kycStatus === 'verified';
    const isPending = kycStatus === 'pending';

    const handleUpload = () => {
        if (!idNumber.trim() || idNumber.length < 5) {
            setShowErrorAlert(true);
            return;
        }

        setIsUploading(true);
        // Simulate upload progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += 0.1;
            setUploadProgress(progress);
            if (progress >= 1) {
                clearInterval(interval);
                setIsUploading(false);
                updateProfile({ kycStatus: 'pending' }); // Set to pending verification
                setShowSuccessAlert(true);
            }
        }, 300);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Identity Verification</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Status Card */}
                <View style={[styles.statusCard,
                isVerified ? styles.statusVerified : isPending ? styles.statusPending : styles.statusUnverified
                ]}>
                    <MaterialIcons
                        name={isVerified ? "verified" : isPending ? "hourglass-empty" : "info-outline"}
                        size={32}
                        color={isVerified ? Colors.success : isPending ? Colors.warning : Colors.textMuted}
                    />
                    <View style={styles.statusTextContainer}>
                        <Text style={styles.statusTitle}>
                            {isVerified ? 'Verified' : isPending ? 'Verification Pending' : 'Not Verified'}
                        </Text>
                        <Text style={styles.statusDescription}>
                            {isVerified
                                ? 'Your identity has been confirmed. You have full access.'
                                : isPending
                                    ? 'We are reviewing your documents. Check back soon.'
                                    : 'Complete verified to increase your Trust Score.'}
                        </Text>
                    </View>
                </View>

                {!isVerified && !isPending && (
                    <>
                        <Text style={styles.sectionTitle}>Select ID Type</Text>
                        <View style={styles.idTypeContainer}>
                            {['NIN', 'BVN', 'Passport', "Driver's License"].map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.idTypeButton, idType === type && styles.idTypeSelected]}
                                    onPress={() => setIdType(type)}
                                >
                                    <Text style={[styles.idTypeText, idType === type && styles.idTypeTextSelected]}>
                                        {type}
                                    </Text>
                                    {idType === type && <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.sectionTitle}>Enter ID Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={`Enter your ${idType} Number`}
                            placeholderTextColor={Colors.textMuted}
                            value={idNumber}
                            onChangeText={setIdNumber}
                            keyboardType="number-pad"
                        />

                        <Text style={styles.sectionTitle}>Upload Document</Text>
                        <TouchableOpacity style={styles.uploadBox} onPress={handleUpload} disabled={isUploading}>
                            {isUploading ? (
                                <View style={styles.uploadingContainer}>
                                    <Text style={styles.uploadingText}>Uploading... {Math.round(uploadProgress * 100)}%</Text>
                                    <View style={styles.progressBar}>
                                        <View style={[styles.progressFill, { width: `${uploadProgress * 100}%` }]} />
                                    </View>
                                </View>
                            ) : (
                                <>
                                    <Ionicons name="cloud-upload-outline" size={40} color={Colors.primary} />
                                    <Text style={styles.uploadTitle}>Tap to Upload {idType}</Text>
                                    <Text style={styles.uploadSubtitle}>Supports JPG, PNG (Max 5MB)</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <View style={styles.secureNote}>
                            <Ionicons name="lock-closed" size={14} color={Colors.textMuted} />
                            <Text style={styles.secureText}>Your data is encrypted and stored securely.</Text>
                        </View>

                        <Button
                            title="Submit Verification"
                            onPress={handleUpload}
                            disabled={isUploading || !idNumber}
                            style={{ marginTop: Spacing.xl }}
                        />
                    </>
                )}
            </ScrollView>

            <ThemedAlert
                visible={showSuccessAlert}
                title="Document Uploaded"
                message="Your ID is being verified. This usually takes 24 hours."
                onClose={() => {
                    setShowSuccessAlert(false);
                    router.back();
                }}
            />

            <ThemedAlert
                visible={showErrorAlert}
                title="Invalid Input"
                message="Please enter a valid ID number."
                onClose={() => setShowErrorAlert(false)}
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
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.xl,
        borderWidth: 1,
    },
    statusUnverified: {
        backgroundColor: Colors.card,
        borderColor: Colors.border,
    },
    statusPending: {
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        borderColor: Colors.warning,
    },
    statusVerified: {
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        borderColor: Colors.success,
    },
    statusTextContainer: {
        marginLeft: Spacing.md,
        flex: 1,
    },
    statusTitle: {
        color: Colors.text,
        fontWeight: '700',
        fontSize: 16,
        marginBottom: 4,
    },
    statusDescription: {
        color: Colors.textMuted,
        fontSize: 13,
        lineHeight: 18,
    },
    sectionTitle: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: Spacing.sm,
        marginTop: Spacing.md,
    },
    idTypeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    idTypeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: 6,
    },
    idTypeSelected: {
        borderColor: Colors.primary,
        backgroundColor: 'rgba(10, 132, 255, 0.1)',
    },
    idTypeText: {
        color: Colors.textMuted,
        fontSize: 14,
    },
    idTypeTextSelected: {
        color: Colors.primary,
        fontWeight: '600',
    },
    input: {
        backgroundColor: Colors.card,
        color: Colors.text,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        fontSize: 16,
        marginBottom: Spacing.lg,
    },
    uploadBox: {
        height: 160,
        borderWidth: 2,
        borderColor: Colors.border,
        borderStyle: 'dashed',
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    uploadingContainer: {
        width: '80%',
        alignItems: 'center',
    },
    uploadingText: {
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    progressBar: {
        width: '100%',
        height: 4,
        backgroundColor: Colors.border,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.primary,
    },
    uploadTitle: {
        color: Colors.text,
        fontWeight: '600',
        marginTop: Spacing.sm,
    },
    uploadSubtitle: {
        color: Colors.textMuted,
        fontSize: 12,
        marginTop: 4,
    },
    secureNote: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginVertical: Spacing.md,
    },
    secureText: {
        color: Colors.textMuted,
        fontSize: 12,
    },
});
