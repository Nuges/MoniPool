import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Help() {
    const handleEmailSupport = () => {
        Linking.openURL('mailto:support@monipool.app?subject=Help Request');
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>How can we help?</Text>

                <View style={styles.section}>
                    <Text style={styles.heading}>Frequently Asked Questions</Text>

                    <View style={styles.faqItem}>
                        <Text style={styles.question}>Is my money safe?</Text>
                        <Text style={styles.answer}>
                            Yes. MoniPool uses bank-grade encryption and works with regulated payment processors. Contributions are held in a secure escrow system until payout.
                        </Text>
                    </View>

                    <View style={styles.faqItem}>
                        <Text style={styles.question}>How does the Trust Score work?</Text>
                        <Text style={styles.answer}>
                            Your Trust Score increases with every on-time payment and completed profile verification (KYC). Higher scores unlock larger pools and lower fees.
                        </Text>
                    </View>

                    <View style={styles.faqItem}>
                        <Text style={styles.question}>What happens if someone defaults?</Text>
                        <Text style={styles.answer}>
                            We have a Protection Fund (1% of contributions) that covers missed payments, ensuring you still get paid. Defaulters are banned and reported to credit bureaus.
                        </Text>
                    </View>

                    <View style={styles.faqItem}>
                        <Text style={styles.question}>Can I leave a pool early?</Text>
                        <Text style={styles.answer}>
                            You can only leave a pool before it starts. Once active, you are committed until the cycle ends to ensure fairness for all members.
                        </Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.heading}>Contact Us</Text>
                    <TouchableOpacity style={styles.contactBtn} onPress={handleEmailSupport}>
                        <Ionicons name="mail-outline" size={24} color="#fff" />
                        <Text style={styles.contactBtnText}>Email Support</Text>
                    </TouchableOpacity>
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
        marginBottom: 24,
    },
    section: {
        marginBottom: 32,
    },
    heading: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.primary,
        marginBottom: 16,
    },
    faqItem: {
        marginBottom: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 16,
        borderRadius: 12,
    },
    question: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 8,
    },
    answer: {
        fontSize: 14,
        color: Colors.textDim,
        lineHeight: 20,
    },
    contactBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    contactBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
