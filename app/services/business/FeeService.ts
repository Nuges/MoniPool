// ============================================================
// Business Logic Layer: FeeService
// Handles dynamic platform fees based on Trust Score.
// Higher Trust = Lower Fees.
// ============================================================

import { walletService } from '../WalletService';
import { reputationService } from '../ReputationService';
import { isFeatureEnabled } from '../../config/featureFlags';

class FeeService {

    private readonly BASE_FEE_PERCENTAGE = 0.02; // 2% Base Fee

    /**
     * Calculate fee based on Trust Score.
     * Returns 0 if flag is OFF.
     */
    async calculateFee(userId: string, contributionAmount: number): Promise<number> {
        if (!isFeatureEnabled('TRUST_BASED_FEES')) return 0;

        const { score } = await reputationService.getScore(userId);

        // Dynamic Fee Logic:
        // Score 80+ : 0.5%
        // Score 60+ : 1.0%
        // Score < 60: 2.0% (Base)

        let rate = this.BASE_FEE_PERCENTAGE;
        if (score >= 80) rate = 0.005;
        else if (score >= 60) rate = 0.01;

        return Math.ceil(contributionAmount * rate);
    }

    /**
     * Calculate recurring fee based on Total Monthly Contribution.
     * Logic: (MonthlyContribution * Rate) / Frequency Count
     * Rounds UP to nearest Naira to eliminate rounding penalty.
     */
    async calculateRecurringFee(monthlyContribution: number, frequency: 'daily' | 'weekly' | 'monthly', userId: string): Promise<number> {
        if (!isFeatureEnabled('TRUST_BASED_FEES')) return 0;

        const { score } = await reputationService.getScore(userId);
        let rate = this.BASE_FEE_PERCENTAGE;
        if (score >= 80) rate = 0.005;
        else if (score >= 60) rate = 0.01;

        const totalMonthlyFee = Math.ceil(monthlyContribution * rate);

        switch (frequency) {
            case 'daily': return Math.ceil(totalMonthlyFee / 30);
            case 'weekly': return Math.ceil(totalMonthlyFee / 4);
            case 'monthly': return totalMonthlyFee;
            default: return totalMonthlyFee;
        }
    }

    /**
     * Calculate Gateway Fee (1.5%)
     * Passed to user.
     */
    calculateGatewayFee(amount: number): number {
        return Math.ceil(amount * 0.015);
    }

    /**
     * Calculate Stamp Duty (Nigerian Law)
     * ₦50 for transfers >= ₦10,000
     */
    calculateStampDuty(amount: number): number {
        return amount >= 10000 ? 50 : 0;
    }

    /**
     * Calculate VAT (7.5%) on Service Fees
     * Service Fees = Platform Fee + Gateway Fee
     */
    calculateVAT(serviceFees: number): number {
        return Math.ceil(serviceFees * 0.075);
    }

    /**
     * Process the fee deduction.
     */
    async processFee(userId: string, amount: number, reference: string): Promise<boolean> {
        if (!isFeatureEnabled('TRUST_BASED_FEES') || amount <= 0) return true;

        const feeRef = `fee_${reference}`;

        if (await walletService.isReferenceProcessed(feeRef)) {
            return true;
        }

        try {
            await walletService.processTransaction(
                userId,
                'fee',
                amount,
                feeRef
            );
            return true;
        } catch (error) {
            console.error('[FeeService] Transaction failed:', error);
            return false;
        }
    }
}

export const feeService = new FeeService();
