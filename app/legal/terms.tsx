import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Terms() {
    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Terms of Service</Text>
                <Text style={styles.date}>Effective Date: February 20, 2026</Text>

                <View style={styles.section}>
                    <Text style={styles.heading}>1. Acceptance of Terms</Text>
                    <Text style={styles.paragraph}>
                        By creating an account and using MoniPool ("the Service"), you agree to comply with these Terms of Service. If you do not agree, you may not use the Service.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.heading}>2. Beta Program & Pilot Phase</Text>
                    <Text style={styles.paragraph}>
                        MoniPool is currently in a **Pilot Phase**. While the platform is fully functional, certain features may be subject to updates. User feedback is highly valued during this period to improve the experience.
                    </Text>
                    <Text style={styles.paragraph}>
                        By participating in the Pilot, you understand that the service is provided "as is" for testing and early access purposes.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.heading}>3. User Accounts & Security</Text>
                    <Text style={styles.paragraph}>
                        You are responsible for maintaining the confidentiality of your PIN and login credentials. Any activity under your account is your responsibility.
                    </Text>
                    <Text style={styles.paragraph}>
                        We use bank-grade encryption to protect your data. However, you must notify us immediately of any unauthorized use of your account.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.heading}>4. Pool Contributions & Payouts</Text>
                    <Text style={styles.paragraph}>
                        • **Commitment**: By joining a pool, you commit to making regular contributions as per the schedule.
                    </Text>
                    <Text style={styles.paragraph}>
                        • **Payouts**: Payouts are processed automatically to your registered bank account or wallet upon your turn.
                    </Text>
                    <Text style={styles.paragraph}>
                        • **Defaults**: Failure to contribute may result in penalties or suspension of your account to protect other pool members.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.heading}>5. Privacy</Text>
                    <Text style={styles.paragraph}>
                        Your privacy is paramount. We collect only necessary information for KYC and transaction processing compliant with NDPR regulations.
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
        paddingBottom: 40,
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
        fontSize: 15,
        color: Colors.textSecondary,
        lineHeight: 22,
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
