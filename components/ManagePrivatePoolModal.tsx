import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, BorderRadius } from '../constants/Layout';
import { useAuth } from '../app/context/AuthContext';
import { poolService } from '../app/services/PoolService';

export default function ManagePrivatePoolModal({ visible, poolId, onClose }: { visible: boolean; poolId: string; onClose: () => void }) {
    const { userId } = useAuth();
    const [loading, setLoading] = useState(false);
    const [invitee, setInvitee] = useState('');

    const handleInvite = async () => {
        if (!userId || !poolId || !invitee.trim()) return;
        setLoading(true);
        try {
            await poolService.inviteUserToPool(poolId, userId, invitee.trim());
            Alert.alert('Success', 'Invite sent successfully!');
            setInvitee('');
        } catch (error: any) {
            Alert.alert('Cannot Invite', error.message || 'An error occurred.');
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
                    <Text style={styles.title}>Manage Private Pool</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={styles.content}>
                    <Text style={styles.sectionTitle}>Invite Members</Text>
                    <Text style={styles.subText}>Invite verified users to your private pool by entering their email or phone number. (Max 5 total members).</Text>

                    <View style={styles.inputContainer}>
                        <MaterialIcons name="person-add" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email or Phone Number"
                            placeholderTextColor={Colors.textMuted}
                            value={invitee}
                            onChangeText={setInvitee}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.btnPrimary, !invitee.trim() && { opacity: 0.5 }]}
                        onPress={handleInvite}
                        disabled={loading || !invitee.trim()}
                    >
                        {loading ? <ActivityIndicator color={Colors.background} /> : <Text style={styles.btnPrimaryText}>Send Invite</Text>}
                    </TouchableOpacity>
                </ScrollView>
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
    sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
    subText: { color: Colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: Spacing.xl },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 50, marginBottom: Spacing.xl },
    inputIcon: { marginRight: 8 },
    input: { flex: 1, color: Colors.text, fontSize: 15 },
    btnPrimary: { backgroundColor: Colors.primary, padding: Spacing.lg, borderRadius: BorderRadius.full, alignItems: 'center' },
    btnPrimaryText: { color: Colors.background, fontWeight: '700', fontSize: 16 },
});
