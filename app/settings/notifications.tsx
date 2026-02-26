import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';
import { Spacing, BorderRadius } from '../../constants/Layout';
import { router, Stack } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';

export default function NotificationsSettings() {
    const [pushEnabled, setPushEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [smsEnabled, setSmsEnabled] = useState(false);
    const [promoEnabled, setPromoEnabled] = useState(true);

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>General</Text>

                <Card variant="solid" style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <MaterialIcons name="notifications-active" size={24} color={Colors.primary} />
                            <Text style={styles.rowLabel}>Push Notifications</Text>
                        </View>
                        <Switch
                            value={pushEnabled}
                            onValueChange={setPushEnabled}
                            trackColor={{ false: Colors.border, true: Colors.primary }}
                            thumbColor="#fff"
                        />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <MaterialIcons name="email" size={24} color={Colors.secondary} />
                            <Text style={styles.rowLabel}>Email Alerts</Text>
                        </View>
                        <Switch
                            value={emailEnabled}
                            onValueChange={setEmailEnabled}
                            trackColor={{ false: Colors.border, true: Colors.primary }}
                            thumbColor="#fff"
                        />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <MaterialIcons name="sms" size={24} color={Colors.warning} />
                            <Text style={styles.rowLabel}>SMS Alerts</Text>
                        </View>
                        <Switch
                            value={smsEnabled}
                            onValueChange={setSmsEnabled}
                            trackColor={{ false: Colors.border, true: Colors.primary }}
                            thumbColor="#fff"
                        />
                    </View>
                </Card>

                <Text style={styles.sectionTitle}>Preferences</Text>

                <Card variant="solid" style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <MaterialIcons name="local-offer" size={24} color="#9B59B6" />
                            <View>
                                <Text style={styles.rowLabel}>Promotions & Tips</Text>
                                <Text style={styles.rowSubtext}>Receive updates on new features</Text>
                            </View>
                        </View>
                        <Switch
                            value={promoEnabled}
                            onValueChange={setPromoEnabled}
                            trackColor={{ false: Colors.border, true: Colors.primary }}
                            thumbColor="#fff"
                        />
                    </View>
                </Card>
            </ScrollView>
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
});
