// MoniPool — Trust Profile screen
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Share,
    Alert,
    Image,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { Spacing, BorderRadius, Shadows } from '../../constants/Layout';
import Card from '../../components/Card';
import Avatar from '../../components/Avatar';
import { getTrustLabel, getTrustColor } from '../utils/formatters';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { referralService } from '../services/ReferralService';
import { reputationService } from '../services/ReputationService';

import ThemedAlert from '../../components/ThemedAlert';
import ActionSheet from '../../components/ActionSheet';

export default function Profile() {
    const { userId, logout, role, firstName, lastName, phone, avatarUri, kycStatus, refreshProfile } = useAuth();
    const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false);
    const [showLogoutAlert, setShowLogoutAlert] = useState(false);
    const [showLegalSheet, setShowLegalSheet] = useState(false);

    // Async states
    const [trustScore, setTrustScore] = useState(0);
    const [trustLevel, setTrustLevel] = useState<'verified' | 'growing' | 'high_risk'>('growing');
    const [referralCode, setReferralCode] = useState('');
    const [referralStats, setReferralStats] = useState({ totalReferrals: 0, completedReferrals: 0, rewardEarned: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadProfileData = async () => {
        if (!userId) return;
        try {
            const scoreData = await reputationService.getScore(userId);
            setTrustScore(scoreData.score);

            const resolveTrustLevel = (s: number) => {
                if (s >= 90) return 'legend';
                if (s >= 80) return 'diamond';
                if (s >= 70) return 'gold';
                if (s >= 50) return 'silver';
                if (s >= 30) return 'bronze';
                return 'starter';
            };
            setTrustLevel(resolveTrustLevel(scoreData.score) as any);

            const code = await referralService.getReferralCode(userId);
            setReferralCode(code || 'PENDING');

            const stats = await referralService.getStats(userId);
            setReferralStats(stats);
        } catch (error) {
            console.error('[Profile] Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadProfileData();
        }, [userId])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                loadProfileData(),
                refreshProfile()
            ]);
        } finally {
            setRefreshing(false);
        }
    };

    const trustColor = getTrustColor(trustLevel);
    const trustLabel = getTrustLabel(trustLevel);

    const displayName = firstName && lastName ? `${firstName} ${lastName}` : 'MoniPool Member';
    const displayPhone = phone || 'No phone number';

    const scoreBreakdown = [
        { label: 'Payment History', score: 95, icon: 'history', weight: '30%' },
        { label: 'Group Completion', score: 88, icon: 'check-circle', weight: '25%' },
        { label: 'Account Age', score: 72, icon: 'calendar-today', weight: '15%' },
        { label: 'KYC Level', score: 80, icon: 'verified-user', weight: '15%' },
        { label: 'Device Consistency', score: 100, icon: 'smartphone', weight: '10%' },
        { label: 'Missed Payments', score: 90, icon: 'flash-on', weight: '5%' },
    ];

    const getKycBadge = () => {
        if (kycStatus === 'verified') return 'Verified';
        if (kycStatus === 'pending') return 'Pending';
        return 'Unverified';
    };

    const getKycColor = () => {
        if (kycStatus === 'verified') return Colors.success;
        if (kycStatus === 'pending') return Colors.warning;
        return Colors.secondary;
    };

    const settings = [
        { icon: 'person-outline', label: 'Edit Profile', color: Colors.primary },
        { icon: 'verified-user', label: 'KYC Verification', color: getKycColor(), badge: getKycBadge() },
        { icon: 'fingerprint', label: 'Security & PIN', color: '#9B59B6' },
        { icon: 'notifications', label: 'Notifications', color: '#F39C12' },
        { icon: 'help-outline', label: 'Help & Support', color: '#3498DB' },
        { icon: 'description', label: 'Terms & Privacy', color: Colors.textMuted },
        { icon: 'logout', label: 'Log Out', color: Colors.error },
    ];

    const handleSettingPress = (label: string) => {
        switch (label) {
            case 'Edit Profile':
                router.push('/settings/edit-profile');
                break;
            case 'KYC Verification':
                router.push('/settings/kyc');
                break;
            case 'Security & PIN':
                router.push('/settings/security');
                break;
            case 'Notifications':
                router.push('/settings/notifications');
                break;
            case 'Help & Support':
                router.push('/help');
                break;
            case 'Terms & Privacy':
                setShowLegalSheet(true);
                break;
            case 'Log Out':
                setShowLogoutAlert(true);
                break;
            default:
                // For "Coming Soon" we can stick to native alert or add a toast later
                Alert.alert('Coming Soon', `${label} is under development.`);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ThemedAlert
                visible={showLogoutAlert}
                title="Log Out"
                message="Are you sure you want to log out?"
                onClose={() => setShowLogoutAlert(false)}
                buttons={[
                    { text: 'Cancel', style: 'cancel', onPress: () => setShowLogoutAlert(false) },
                    {
                        text: 'Log Out', style: 'destructive', onPress: async () => {
                            setShowLogoutAlert(false);
                            await logout();
                        }
                    }
                ]}
            />

            <ActionSheet
                visible={showLegalSheet}
                title="Legal Documents"
                onClose={() => setShowLegalSheet(false)}
                options={[
                    { label: 'Terms & Conditions', icon: 'description', onPress: () => router.push('/legal/terms') },
                    { label: 'Privacy Policy', icon: 'security', onPress: () => router.push('/legal/privacy') }
                ]}
            />

            {loading && !refreshing ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Profile</Text>
                    </View>

                    {/* Profile Card */}
                    <View style={styles.profileCardWrapper}>
                        <LinearGradient
                            colors={[Colors.card, Colors.cardLight]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.profileCard, Shadows.card]}
                        >
                            {avatarUri ? (
                                <Image
                                    source={{ uri: avatarUri }}
                                    style={{ width: 72, height: 72, borderRadius: 36, marginBottom: Spacing.md }}
                                />
                            ) : (
                                <Avatar name={displayName} size={72} color={Colors.primary} />
                            )}
                            <Text style={styles.profileName}>{displayName}</Text>
                            <Text style={styles.profilePhone}>{displayPhone}</Text>

                            {/* Trust badge */}
                            <View style={[styles.trustBadge, { backgroundColor: `${trustColor}15`, borderColor: `${trustColor}30` }]}>
                                <Text style={[styles.trustBadgeText, { color: trustColor }]}>{trustLabel}</Text>
                            </View>
                        </LinearGradient>
                    </View>

                    {/* Trust Score Gauge */}
                    <View style={styles.gaugeWrapper}>
                        <Card variant="glass" style={styles.gaugeCard}>
                            <Text style={styles.gaugeTitle}>Trust Score</Text>

                            {/* Circular gauge visual */}
                            <View style={styles.gauge}>
                                <View style={[styles.gaugeRing, { borderColor: `${trustColor}30` }]}>
                                    <View style={[styles.gaugeInner, { borderColor: trustColor }]}>
                                        <Text style={[styles.gaugeScore, { color: trustColor }]}>
                                            {trustScore}
                                        </Text>
                                        <Text style={styles.gaugeMax}>/100</Text>
                                    </View>
                                </View>
                            </View>

                            <Text style={styles.gaugeDescription}>
                                Your trust score is based on your savings behavior and profile completeness.
                            </Text>
                        </Card>
                    </View>



                    {/* Score Breakdown */}
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={[styles.sectionHeader, { marginBottom: isBreakdownExpanded ? Spacing.md : 0 }]}
                            onPress={() => setIsBreakdownExpanded(!isBreakdownExpanded)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Score Breakdown</Text>
                            <MaterialIcons
                                name={isBreakdownExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                                size={24}
                                color={Colors.textMuted}
                            />
                        </TouchableOpacity>

                        {isBreakdownExpanded && (
                            <Card variant="solid" padding={0}>
                                {scoreBreakdown.map((item, index) => (
                                    <View
                                        key={item.label}
                                        style={[
                                            styles.breakdownItem,
                                            index < scoreBreakdown.length - 1 && styles.breakdownBorder,
                                        ]}
                                    >
                                        <View style={styles.breakdownLeft}>
                                            <View style={styles.iconContainer}>
                                                <MaterialIcons name={item.icon as any} size={20} color={Colors.primary} />
                                            </View>
                                            <View>
                                                <Text style={styles.breakdownLabel}>{item.label}</Text>
                                                <Text style={styles.breakdownWeight}>Weight: {item.weight}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.breakdownRight}>
                                            <View style={styles.miniBar}>
                                                <View
                                                    style={[
                                                        styles.miniBarFill,
                                                        {
                                                            width: `${item.score}%`,
                                                            backgroundColor:
                                                                item.score >= 80
                                                                    ? Colors.secondary
                                                                    : item.score >= 50
                                                                        ? Colors.warning
                                                                        : Colors.error,
                                                        },
                                                    ]}
                                                />
                                            </View>
                                            <Text style={styles.breakdownScore}>{item.score}</Text>
                                        </View>
                                    </View>
                                ))}
                            </Card>
                        )}
                    </View>

                    {/* Referral */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Invite & Earn</Text>
                        <Card variant="solid">
                            <View style={{ alignItems: 'center', paddingVertical: Spacing.sm }}>
                                <Text style={{ color: Colors.textSecondary, fontSize: 13, marginBottom: 4 }}>
                                    Your Referral Code
                                </Text>
                                <Text style={{
                                    color: Colors.primary,
                                    fontSize: 24,
                                    fontWeight: '800',
                                    letterSpacing: 2,
                                    marginBottom: Spacing.md,
                                }}>
                                    {referralCode}
                                </Text>

                                <View style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-around',
                                    width: '100%',
                                    marginBottom: Spacing.md,
                                }}>
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ color: Colors.text, fontSize: 20, fontWeight: '700' }}>
                                            {referralStats.totalReferrals}
                                        </Text>
                                        <Text style={{ color: Colors.textMuted, fontSize: 11 }}>Invited</Text>
                                    </View>
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ color: Colors.text, fontSize: 20, fontWeight: '700' }}>
                                            {referralStats.completedReferrals}
                                        </Text>
                                        <Text style={{ color: Colors.textMuted, fontSize: 11 }}>Joined</Text>
                                    </View>
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ color: Colors.success, fontSize: 20, fontWeight: '700' }}>
                                            ₦{referralStats.rewardEarned.toLocaleString()}
                                        </Text>
                                        <Text style={{ color: Colors.textMuted, fontSize: 11 }}>Earned</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    onPress={handleShare}
                                    activeOpacity={0.8}
                                    style={{
                                        backgroundColor: Colors.primary,
                                        borderRadius: BorderRadius.lg,
                                        paddingVertical: 14,
                                        paddingHorizontal: 40,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}
                                >
                                    <MaterialIcons name="share" size={20} color="#fff" />
                                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                                        Invite Friends
                                    </Text>
                                </TouchableOpacity>

                                <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: Spacing.sm, textAlign: 'center', lineHeight: 16 }}>
                                    Earn ₦500 Pool Credit when a friend joins.{"\n"}
                                    Earn ₦500 bonus when they complete a cycle.{"\n"}
                                    <Text style={{ color: Colors.secondary }}>Pool Credit cannot be withdrawn.</Text>
                                </Text>
                            </View>
                        </Card>
                    </View>

                    {/* Settings */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Settings</Text>

                        <Card variant="solid" padding={0}>
                            {settings.map((item, index) => (
                                <TouchableOpacity
                                    key={item.label}
                                    style={[
                                        styles.settingsItem,
                                        index < settings.length - 1 && styles.settingsBorder,
                                    ]}
                                    activeOpacity={0.7}
                                    onPress={() => handleSettingPress(item.label)}
                                >
                                    <View style={styles.settingsLeft}>
                                        <View style={[styles.settingsIcon, { backgroundColor: `${item.color}15` }]}>
                                            <MaterialIcons name={item.icon as any} size={20} color={item.color} />
                                        </View>
                                        <Text style={[styles.settingsLabel, item.label === 'Log Out' && { color: Colors.error }]}>
                                            {item.label}
                                        </Text>
                                    </View>
                                    <View style={styles.settingsRight}>
                                        {item.badge && (
                                            <View style={styles.settingsBadge}>
                                                <Text style={styles.settingsBadgeText}>{item.badge}</Text>
                                            </View>
                                        )}
                                        <MaterialIcons name="chevron-right" size={18} color={Colors.textMuted} />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </Card>
                    </View>

                    {/* App version */}
                    <Text style={styles.version}>MoniPool v1.0.0</Text>

                    <View style={{ height: 30 }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );

    // ── Referral Helpers ──
    async function handleShare() {
        if (!userId) return;
        try {
            const message = await referralService.getShareMessage(userId, firstName! || 'MoniPool Member');
            await Share.share({
                message,
                title: 'Join MoniPool',
            });
        } catch (error: any) {
            if (error.message !== 'User did not share') {
                Alert.alert('Error', 'Could not open share dialog.');
            }
        }
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xl,
        marginBottom: Spacing.lg,
    },
    headerTitle: {
        color: Colors.text,
        fontSize: 28,
        fontWeight: '800',
    },

    // Profile card
    profileCardWrapper: {
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    profileCard: {
        alignItems: 'center',
        padding: Spacing['2xl'],
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    },
    profileName: {
        color: Colors.text,
        fontSize: 22,
        fontWeight: '800',
        marginTop: Spacing.md,
        marginBottom: 4,
    },
    profilePhone: {
        color: Colors.textSecondary,
        fontSize: 14,
        marginBottom: Spacing.md,
    },
    trustBadge: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
    },
    trustBadgeText: {
        fontSize: 13,
        fontWeight: '700',
    },

    // Gauge
    gaugeWrapper: {
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing['2xl'],
    },
    gaugeCard: {
        alignItems: 'center',
    },
    gaugeTitle: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: Spacing.lg,
    },
    gauge: {
        marginBottom: Spacing.lg,
    },
    gaugeRing: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gaugeInner: {
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 4,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.card,
    },
    gaugeScore: {
        fontSize: 36,
        fontWeight: '800',
    },
    gaugeMax: {
        color: Colors.textMuted,
        fontSize: 14,
    },
    gaugeDescription: {
        color: Colors.textSecondary,
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },

    // Section
    section: {
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing['2xl'],
    },
    sectionTitle: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: Spacing.md,
    },

    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    // Breakdown
    breakdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.lg,
    },
    breakdownBorder: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    breakdownLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: `${Colors.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    breakdownLabel: {
        color: Colors.text,
        fontSize: 14,
        fontWeight: '500',
    },
    breakdownWeight: {
        color: Colors.textMuted,
        fontSize: 11,
    },
    breakdownRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    miniBar: {
        width: 60,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    miniBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    breakdownScore: {
        color: Colors.text,
        fontSize: 13,
        fontWeight: '700',
        minWidth: 24,
        textAlign: 'right',
    },

    // Settings
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.lg,
    },
    settingsBorder: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    settingsLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingsIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsLabel: {
        color: Colors.text,
        fontSize: 15,
        fontWeight: '500',
    },
    settingsRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    settingsBadge: {
        backgroundColor: `${Colors.secondary}20`,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
    },
    settingsBadgeText: {
        color: Colors.secondary,
        fontSize: 11,
        fontWeight: '700',
    },

    // Version
    version: {
        color: Colors.textMuted,
        fontSize: 12,
        textAlign: 'center',
        marginTop: Spacing.lg,
    },
});
