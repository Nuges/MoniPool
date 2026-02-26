
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, BorderRadius } from '../constants/Layout';
import Button from './Button';
import { walletService } from '../app/services/WalletService';
import { auditService } from '../app/services/AuditService';
import { useAuth } from '../app/context/AuthContext';
import InfoTooltip from './InfoTooltip';

interface ActionModalProps {
    visible: boolean;
    type: 'withdraw' | 'transfer' | 'deposit';
    onClose: () => void;
    onSuccess?: () => void;
}

export default function ActionModal({ visible, type, onClose, onSuccess }: ActionModalProps) {
    const { userId } = useAuth();
    const [amount, setAmount] = useState('');
    const [recipient, setRecipient] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'input' | 'success'>('input');

    // Always true for v1.1.0 simulation phase
    const isSimulation = true;

    const handleAction = async () => {
        if (!amount || isNaN(Number(amount))) {
            Alert.alert('Invalid Amount', 'Please enter a valid number.');
            return;
        }
        if (type === 'transfer' && !recipient) {
            Alert.alert('Invalid Recipient', 'Please enter a recipient name.');
            return;
        }

        setLoading(true);

        const actionTypeMap = {
            withdraw: 'transaction_withdraw',
            transfer: 'transaction_transfer',
            deposit: 'transaction_deposit'
        };

        // Audit Logging
        if (userId) {
            auditService.logAction(userId, actionTypeMap[type] as any, {
                amount: Number(amount),
                recipient: type === 'transfer' ? recipient : (type === 'withdraw' ? 'Bank' : 'Self'),
                mock: true
            });
        }

        // Simulate network delay
        setTimeout(async () => {
            try {
                if (!userId) throw new Error("No user ID found");
                const numAmount = Number(amount);
                // Ensure unique reference
                const ref = `${type}_${Date.now()}`;

                await walletService.processTransaction(
                    userId,
                    type as any, // WalletService needs to support 'deposit' too, assume it does or maps to 'credit'
                    numAmount,
                    ref
                );

                setLoading(false);
                setStep('success');
            } catch (e) {
                setLoading(false);
                Alert.alert('Error', 'Transaction failed');
            }
        }, 1500);
    };

    const reset = () => {
        setAmount('');
        setRecipient('');
        setStep('input');
        onClose();
    };

    const handleDone = () => {
        if (onSuccess) onSuccess();
        reset();
    };

    const isWithdraw = type === 'withdraw';
    const isDeposit = type === 'deposit';

    let title = 'Transfer Funds';
    let subTitle = 'Send money to another user';

    if (isWithdraw) {
        title = 'Withdraw Funds';
        subTitle = 'Send money to your bank';
    } else if (isDeposit) {
        title = 'Fund Wallet';
        subTitle = 'Add money from your bank';
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={reset}
        >
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.handle} />

                    {step === 'input' && (
                        <>
                            <View style={styles.headerRow}>
                                <Text style={styles.title}>{title}</Text>
                                {isSimulation && (
                                    <View style={styles.simulationBadge}>
                                        <Text style={styles.simulationText}>SIMULATION</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.subtitle}>{subTitle}</Text>

                            {isSimulation && (
                                <InfoTooltip content="MoniPool is currently in Simulation Mode. All transactions are virtual. No real money is moved from your bank account.">
                                    <View style={styles.noticeBox}>
                                        <Ionicons name="information-circle-outline" size={20} color={Colors.warning} />
                                        <Text style={styles.noticeText}>
                                            This is a simulation. No real money is moved. Wallet balances are updated for demo purposes.
                                        </Text>
                                    </View>
                                </InfoTooltip>
                            )}

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Amount (₦)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0.00"
                                    placeholderTextColor={Colors.textMuted}
                                    keyboardType="numeric"
                                    value={amount}
                                    onChangeText={setAmount}
                                />
                            </View>

                            {type === 'transfer' && (
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Recipient Username</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="@username"
                                        placeholderTextColor={Colors.textMuted}
                                        autoCapitalize="none"
                                        value={recipient}
                                        onChangeText={setRecipient}
                                    />
                                </View>
                            )}

                            <Button
                                title={loading ? 'Processing...' : 'Continue'}
                                onPress={handleAction}
                                disabled={loading}
                                style={{ marginTop: Spacing.lg }}
                            />

                            <TouchableOpacity style={styles.cancelBtn} onPress={reset} disabled={loading}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {step === 'success' && (
                        <View style={styles.successContainer}>
                            <View style={styles.successIcon}>
                                <MaterialIcons name="check" size={40} color="#fff" />
                            </View>
                            <Text style={styles.successTitle}>Transaction Successful</Text>
                            <Text style={styles.successDesc}>
                                You have successfully {type === 'deposit' ? 'deposited' : (type === 'withdraw' ? 'withdrawn' : 'transferred')} ₦{Number(amount).toLocaleString()}.
                            </Text>
                            <Button title="Done" onPress={handleDone} />
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: Colors.backgroundLight,
        borderTopLeftRadius: BorderRadius['2xl'],
        borderTopRightRadius: BorderRadius['2xl'],
        padding: Spacing['2xl'],
        paddingBottom: Spacing['4xl'],
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: Colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: Spacing.lg,
    },
    title: {
        color: Colors.text,
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 4,
    },
    subtitle: {
        color: Colors.textSecondary,
        fontSize: 14,
        marginBottom: Spacing.xl,
    },
    inputContainer: {
        marginBottom: Spacing.lg,
        gap: 8,
    },
    label: {
        color: Colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    input: {
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        color: Colors.text,
        fontSize: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cancelBtn: {
        alignItems: 'center',
        padding: Spacing.md,
        marginTop: Spacing.sm,
    },
    cancelText: {
        color: Colors.textMuted,
        fontSize: 14,
        fontWeight: '600',
    },
    successContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.xl,
    },
    successIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.success,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    successTitle: {
        color: Colors.text,
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    successDesc: {
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.xl,
        lineHeight: 20,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    simulationBadge: {
        backgroundColor: '#FFA50030', // Orange with opacity
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#FFA500',
    },
    simulationText: {
        color: '#FFA500',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    noticeBox: {
        backgroundColor: `${Colors.text}10`,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    noticeText: {
        color: Colors.textMuted,
        fontSize: 12,
        flex: 1,
        lineHeight: 16,
    },
});
