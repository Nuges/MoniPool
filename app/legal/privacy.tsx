import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Privacy() {
    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Privacy Policy</Text>
                <Text style={styles.date}>Effective Date: February 20, 2026</Text>

                <View style={styles.section}>
                    <Text style={styles.heading}>1. Information We Collect</Text>
                    <Text style={styles.paragraph}>
                        To provide our services, we collect:
                    </Text>
                    <Text style={styles.bullet}>• **Identity Data**: Name, BVN/NIN, and Government ID for KYC compliance.</Text>
                    <Text style={styles.bullet}>• **Contact Data**: Phone number and email address.</Text>
                    <Text style={styles.bullet}>• **Financial Data**: Transaction history and bank account details for payouts.</Text>
                    <Text style={styles.bullet}>• **Device Data**: IP address and device ID for fraud prevention.</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.heading}>2. How We Use Your Data</Text>
                    <Text style={styles.paragraph}>
                        We use your data to:
                    </Text>
                    <Text style={styles.bullet}>• Verify your identity and calculate your Trust Score.</Text>
                    <Text style={styles.bullet}>• Process pool contributions and payouts.</Text>
                    <Text style={styles.bullet}>• Prevent fraud and ensure the safety of the community.</Text>
                    <Text style={styles.bullet}>• Comply with legal and regulatory obligations.</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.heading}>3. Data Security & Storage</Text>
                    <Text style={styles.paragraph}>
                        Your data is encrypted using AES-256 standards. We do not sell your personal data. We only share data with regulated partners (e.g., payment processors) necessary to deliver the service.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.heading}>4. Your Rights</Text>
                    <Text style={styles.paragraph}>
                        You have the right to access, correct, or request deletion of your data. You can manage your preferences in the Settings menu or contact our Data Protection Officer.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.heading}>5. Contact Us</Text>
                    <Text style={styles.paragraph}>
                        For privacy concerns, please contact our team at privacy@monipool.app.
                    </Text>
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
    content: {
        padding: 20,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 8,
    },
    date: {
        fontSize: 14,
        color: Colors.textDim,
        marginBottom: 24,
    },
    section: {
        marginBottom: 24,
    },
    heading: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.primary,
        marginBottom: 8,
    },
    paragraph: {
        fontSize: 16,
        color: Colors.text,
        lineHeight: 24,
        marginBottom: 12,
    },
    bullet: {
        fontSize: 15,
        color: Colors.textSecondary,
        lineHeight: 22,
        marginLeft: 10,
        marginBottom: 6,
    },
});
