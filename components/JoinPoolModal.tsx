
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing, BorderRadius } from '../constants/Layout';
import Button from './Button';
import { poolService } from '../app/services/PoolService';
import { walletService } from '../app/services/WalletService';
import { Tier, Cycle, Wallet } from '../app/models/schema';
import { useAuth } from '../app/context/AuthContext';

interface JoinPoolModalProps {
    visible: boolean;
    tier: Tier;
    onClose: () => void;
    onSuccess: () => void;
}

type Step = 'frequency' | 'goal' | 'review';

export default function JoinPoolModal({ visible, tier, onClose, onSuccess }: JoinPoolModalProps) {
    const { userId } = useAuth();
    const [step, setStep] = useState<Step>('frequency');
    const [frequency, setFrequency] = useState<Cycle>('monthly'); // Default to monthly as per requirements
    const [goalTitle, setGoalTitle] = useState('');
    const [customGoal, setCustomGoal] = useState('');
    const [loading, setLoading] = useState(false);
    const [calculations, setCalculations] = useState<any>(null);
    const [preview, setPreview] = useState<any>(null);
    const [walletData, setWalletData] = useState<Wallet | null>(null);

    // Goal Presets
    const GOAL_PRESETS = ['Rent', 'School Fees', 'Business Capital', 'Gadget', 'Emergency', 'Custom'];

    // Reset state when modal opens
    useEffect(() => {
        if (visible) {
            setStep('frequency');
            setFrequency('monthly');
            setGoalTitle('');
            setCustomGoal('');
            setLoading(false);
            setCalculations(null);

            if (userId) {
                walletService.getWallet(userId).then(w => setWalletData(w || null));
            }
        }
    }, [visible, userId]);

    const handleNext = async () => {
        if (step === 'frequency') {
            setStep('goal');
        } else if (step === 'goal') {
            const finalGoal = goalTitle === 'Custom' ? customGoal : goalTitle;
            if (!finalGoal.trim()) {
                Alert.alert('Goal Required', 'Please select or type a goal for this savings cycle.');
                return;
            }
            // Calculate totals
            const layout = poolService.calculateTotalRecurringDeduction(tier, frequency, userId || 'user1');
            const prev = await poolService.getPreviewInfo(tier, 'monthly'); // Always monthly payout for now? App seems to imply fixed payout cycle.

            setCalculations(layout);
            setPreview(prev);
            setStep('review');
        }
    };

    const handleJoin = async () => {
        setLoading(true);
        try {
            if (!userId) throw new Error("No user ID found");

            const finalGoal = goalTitle === 'Custom' ? customGoal : goalTitle;
            const payoutCycle = 'monthly'; // Fixed for now based on previous code

            // Pool Credit Logic
            const availableCredit = walletData?.poolCredit || 0;
            const creditUsed = Math.min(calculations.contribution, availableCredit);
            const totalCashDue = calculations.total - creditUsed;

            if ((walletData?.balance ?? 0) < totalCashDue) {
                Alert.alert('Insufficient Funds', `You need ₦${totalCashDue.toLocaleString()} but have ₦${(walletData?.balance ?? 0).toLocaleString()}.`);
                setLoading(false);
                return;
            }

            const refBase = `join_${tier}_${Date.now()}`;

            // Process Transaction
            await walletService.processTransaction(
                userId,
                'contribution',
                calculations.total,
                `${refBase}_all_in`,
                {
                    poolCreditUsed: creditUsed,
                    fee: calculations.fee,
                    fund: calculations.fund,
                    gatewayFee: calculations.gatewayFee,
                    stampDuty: calculations.stampDuty,
                    vat: calculations.vat
                }
            );

            // Join Pool
            await poolService.findOrJoinPool(
                tier,
                payoutCycle,
                userId,
                frequency,
                finalGoal
            );

            setLoading(false);
            onSuccess();
            onClose();
        } catch (e: any) {
            setLoading(false);
            Alert.alert('Error', e.message || 'Failed to join pool');
        }
    };

    const renderFrequencyStep = () => (
        <View>
            <Text style={styles.stepTitle}>Step 1/3: Contribution Config</Text>
            <Text style={styles.stepDesc}>How often do you want to contribute towards your {tier} goal?</Text>

            <View style={styles.optionsContainer}>
                {(['daily', 'weekly', 'monthly'] as Cycle[]).map((opt) => {
                    const amount = poolService.calculateContributionAmount(tier, 'monthly', opt);
                    return (
                        <TouchableOpacity
                            key={opt}
                            style={[styles.optionCard, frequency === opt && styles.optionCardActive]}
                            onPress={() => setFrequency(opt)}
                        >
                            <View style={styles.optionHeader}>
                                <Text style={[styles.optionLabel, frequency === opt && styles.optionLabelActive]}>
                                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                </Text>
                                {frequency === opt && <MaterialIcons name="check-circle" size={20} color={Colors.primary} />}
                            </View>
                            <Text style={[styles.optionAmount, frequency === opt && styles.optionAmountActive]}>
                                ₦{amount.toLocaleString()}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    const renderGoalStep = () => (
        <View>
            <Text style={styles.stepTitle}>Step 2/3: Set a Goal 🎯</Text>
            <Text style={styles.stepDesc}>What are you saving for? This helps you stay motivated.</Text>

            <View style={styles.tagsContainer}>
                {GOAL_PRESETS.map(preset => (
                    <TouchableOpacity
                        key={preset}
                        style={[styles.tag, goalTitle === preset && styles.tagActive]}
                        onPress={() => setGoalTitle(preset)}
                    >
                        <Text style={[styles.tagText, goalTitle === preset && styles.tagTextActive]}>{preset}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {goalTitle === 'Custom' && (
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Your Goal Title</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. My New Car"
                        placeholderTextColor={Colors.textMuted}
                        value={customGoal}
                        onChangeText={setCustomGoal}
                        autoFocus
                    />
                </View>
            )}
        </View>
    );

    const renderReviewStep = () => {
        if (!calculations || !preview) return <ActivityIndicator />;

        const finalGoal = goalTitle === 'Custom' ? customGoal : goalTitle;
        const payoutDateStr = preview?.date ? preview.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

        // Pool Credit Logic for display
        const availableCredit = walletData?.poolCredit || 0;
        const creditUsed = Math.min(calculations.contribution, availableCredit);
        const totalCashDue = calculations.total - creditUsed;

        return (
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.stepTitle}>Step 3/3: Review & Confirm</Text>

                <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Goal</Text>
                        <Text style={styles.summaryValue}>{finalGoal}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Contribution</Text>
                        <Text style={styles.summaryValue}>₦{calculations.contribution.toLocaleString()} / {frequency}</Text>
                    </View>
                    <View style={styles.divider} />

                    <View style={styles.breakdownItem}>
                        <Text style={styles.breakdownLabel}>Platform Fee</Text>
                        <Text style={styles.breakdownValue}>+ ₦{calculations.fee.toLocaleString()}</Text>
                    </View>
                    <View style={styles.breakdownItem}>
                        <Text style={styles.breakdownLabel}>Protection Fund</Text>
                        <Text style={styles.breakdownValue}>+ ₦{calculations.fund.toLocaleString()}</Text>
                    </View>
                    <View style={styles.breakdownItem}>
                        <Text style={styles.breakdownLabel}>Gateway Fee</Text>
                        <Text style={styles.breakdownValue}>+ ₦{calculations.gatewayFee.toLocaleString()}</Text>
                    </View>
                    <View style={styles.breakdownItem}>
                        <Text style={styles.breakdownLabel}>Taxes (VAT + Stamp)</Text>
                        <Text style={styles.breakdownValue}>+ ₦{(calculations.stampDuty + calculations.vat).toLocaleString()}</Text>
                    </View>

                    {creditUsed > 0 && (
                        <View style={styles.breakdownItem}>
                            <Text style={[styles.breakdownLabel, { color: Colors.success }]}>Pool Credit Applied</Text>
                            <Text style={[styles.breakdownValue, { color: Colors.success }]}>- ₦{creditUsed.toLocaleString()}</Text>
                        </View>
                    )}

                    <View style={styles.divider} />
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total Due Now</Text>
                        <Text style={styles.totalValue}>₦{totalCashDue.toLocaleString()}</Text>
                    </View>
                </View>

                <View style={styles.infoBox}>
                    <MaterialIcons name="event" size={20} color={Colors.secondary} />
                    <Text style={styles.infoText}>Estimated Payout: <Text style={{ fontWeight: '700' }}>{payoutDateStr}</Text></Text>
                </View>
            </ScrollView>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <View style={styles.content}>
                    <View style={styles.handle} />

                    <View style={styles.header}>
                        <TouchableOpacity onPress={step === 'frequency' ? onClose : () => setStep(step === 'review' ? 'goal' : 'frequency')}>
                            <MaterialIcons name={step === 'frequency' ? "close" : "arrow-back"} size={24} color={Colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Join {tier} Pool</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <View style={styles.body}>
                        {step === 'frequency' && renderFrequencyStep()}
                        {step === 'goal' && renderGoalStep()}
                        {step === 'review' && renderReviewStep()}
                    </View>

                    <View style={styles.footer}>
                        {step !== 'review' ? (
                            <Button
                                title="Next"
                                onPress={handleNext}
                            />
                        ) : (
                            <Button
                                title={loading ? "Joining..." : "Confirm & Pay"}
                                onPress={handleJoin}
                                disabled={loading}
                                variant="primary"
                            />
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>
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
        height: '80%',
        padding: Spacing.lg,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: Colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: Spacing.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    body: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: 8,
    },
    stepDesc: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: Spacing.xl,
    },
    optionsContainer: {
        gap: Spacing.md,
    },
    optionCard: {
        backgroundColor: Colors.card,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    optionCardActive: {
        borderColor: Colors.primary,
        backgroundColor: `${Colors.primary}10`,
    },
    optionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    optionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    optionLabelActive: {
        color: Colors.primary,
    },
    optionAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    optionAmountActive: {
        color: Colors.primary,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: Spacing.xl,
    },
    tag: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    tagActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    tagText: {
        color: Colors.text,
        fontWeight: '600',
        fontSize: 14,
    },
    tagTextActive: {
        color: '#fff',
    },
    inputContainer: {
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
    summaryCard: {
        backgroundColor: Colors.card,
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
        marginBottom: Spacing.lg,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    summaryLabel: {
        color: Colors.textMuted,
        fontSize: 14,
    },
    summaryValue: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: 12,
    },
    breakdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    breakdownLabel: {
        color: Colors.textSecondary,
        fontSize: 13,
    },
    breakdownValue: {
        color: Colors.textSecondary,
        fontSize: 13,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    totalValue: {
        color: Colors.primary,
        fontSize: 24,
        fontWeight: '800',
    },
    infoBox: {
        backgroundColor: `${Colors.secondary}20`,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoText: {
        color: Colors.secondary,
        fontSize: 14,
    },
    footer: {
        marginTop: Spacing.lg,
        paddingBottom: Spacing.lg
    }
});
