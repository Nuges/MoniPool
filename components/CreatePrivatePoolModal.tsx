import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, BorderRadius } from '../constants/Layout';
import { useAuth } from '../app/context/AuthContext';
import { poolService } from '../app/services/PoolService';
import { Tier } from '../app/models/schema';

export default function CreatePrivatePoolModal({ visible, onClose, onSuccess }: { visible: boolean; onClose: () => void; onSuccess: () => void }) {
    const { userId } = useAuth();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [loading, setLoading] = useState(false);
    const [selectedTier, setSelectedTier] = useState<Tier>('50k');

    const handleCreate = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            await poolService.requestPrivatePool(selectedTier, 'monthly', userId);
            Alert.alert('Success', 'Private Pool created successfully!');
            onSuccess();
            onClose();
            setStep(1);
        } catch (error: any) {
            Alert.alert('Cannot Create Pool', error.message || 'An error occurred.');
            setStep(1); // Reset
            onClose();
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <MaterialIcons name="close" size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Create Private Pool</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={styles.content}>
                    {step === 1 && (
                        <View>
                            <View style={styles.badgeCard}>
                                <MaterialIcons name="verified" size={32} color={Colors.primary} />
                                <Text style={styles.badgeTitle}>Verified Creator</Text>
                                <Text style={styles.badgeText}>You meet the strict requirements (Full KYC + 1 Completed Pool) to host your own private circle.</Text>
                            </View>

                            <Text style={styles.sectionTitle}>Select Pool Amount</Text>
                            {(['50k', '100k', '300k'] as Tier[]).map(t => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.tierOption, selectedTier === t && styles.tierOptionActive]}
                                    onPress={() => setSelectedTier(t)}
                                >
                                    <View style={[styles.radio, selectedTier === t && styles.radioActive]}>
                                        {selectedTier === t && <View style={styles.radioInner} />}
                                    </View>
                                    <Text style={styles.tierText}>{t.toUpperCase()}</Text>
                                    <Text style={styles.tierSub}>5 Members • strict</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {step === 2 && (
                        <View>
                            <Text style={styles.sectionTitle}>The Rules</Text>

                            <View style={styles.ruleItem}>
                                <MaterialIcons name="security" size={24} color={Colors.secondary} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.ruleTitle}>System Controlled</Text>
                                    <Text style={styles.ruleText}>MoniPool collects and locks all funds. You cannot alter payouts or bypass rules.</Text>
                                </View>
                            </View>

                            <View style={styles.ruleItem}>
                                <MaterialIcons name="group" size={24} color={Colors.secondary} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.ruleTitle}>Invite Only (Verified)</Text>
                                    <Text style={styles.ruleText}>You can only invite members who have completed Full KYC. Maximum 5 members.</Text>
                                </View>
                            </View>

                            <View style={styles.ruleItem}>
                                <MaterialIcons name="gavel" size={24} color={Colors.error} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.ruleTitle}>Fraud & Abuse</Text>
                                    <Text style={styles.ruleText}>Any cheating or duplicate account farming will result in permanent ban and fund lock.</Text>
                                </View>
                            </View>
                        </View>
                    )}

                </ScrollView>

                <View style={styles.footer}>
                    {step === 1 ? (
                        <TouchableOpacity style={styles.btnPrimary} onPress={() => setStep(2)}>
                            <Text style={styles.btnPrimaryText}>Continue</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.btnPrimary} onPress={handleCreate} disabled={loading}>
                            {loading ? <ActivityIndicator color={Colors.background} /> : <Text style={styles.btnPrimaryText}>Agree & Create</Text>}
                        </TouchableOpacity>
                    )}
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderColor: Colors.border },
    closeBtn: { width: 40, height: 40, justifyContent: 'center' },
    title: { color: Colors.text, fontSize: 18, fontWeight: '700' },
    content: { padding: Spacing.xl, flex: 1 },
    sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: Spacing.md, marginTop: Spacing.lg },
    badgeCard: { backgroundColor: `${Colors.primary}10`, padding: Spacing.xl, borderRadius: BorderRadius.lg, alignItems: 'center', borderColor: `${Colors.primary}30`, borderWidth: 1 },
    badgeTitle: { color: Colors.primary, fontSize: 18, fontWeight: '800', marginVertical: 8 },
    badgeText: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
    tierOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, padding: Spacing.lg, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
    tierOptionActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}10` },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.textMuted, marginRight: Spacing.md, justifyContent: 'center', alignItems: 'center' },
    radioActive: { borderColor: Colors.primary },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
    tierText: { color: Colors.text, flex: 1, fontSize: 16, fontWeight: '700' },
    tierSub: { color: Colors.textMuted, fontSize: 12 },
    ruleItem: { flexDirection: 'row', gap: Spacing.md, backgroundColor: Colors.card, padding: Spacing.lg, borderRadius: BorderRadius.md, marginBottom: Spacing.md },
    ruleTitle: { color: Colors.text, fontWeight: '700', fontSize: 15, marginBottom: 4 },
    ruleText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
    footer: { padding: Spacing.xl, borderTopWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
    btnPrimary: { backgroundColor: Colors.primary, padding: Spacing.lg, borderRadius: BorderRadius.full, alignItems: 'center' },
    btnPrimaryText: { color: Colors.background, fontWeight: '700', fontSize: 16 },
});
