// ============================================================
// Business Logic Layer: ProtectionFundService
// Handles automated contributions to the Community Protection Fund.
// ============================================================

import { walletService } from '../WalletService';
import { isFeatureEnabled } from '../../config/featureFlags';

class ProtectionFundService {

    private readonly FUND_PERCENTAGE = 0.01; // 1% contribution

    /**
     * Calculate the protection fund amount based on contribution.
     * Returns 0 if flag is OFF.
     */
    calculateFundAmount(contributionAmount: number): number {
        if (!isFeatureEnabled('PROTECTION_FUND')) return 0;
        return Math.ceil(contributionAmount * this.FUND_PERCENTAGE);
    }

    /**
     * Calculate recurring fund based on Total Monthly Contribution.
     * Logic: (MonthlyContribution * Rate) / Frequency Count
     * Rounds UP to nearest Naira.
     */
    calculateRecurringFund(monthlyContribution: number, frequency: 'daily' | 'weekly' | 'monthly'): number {
        if (!isFeatureEnabled('PROTECTION_FUND')) return 0;

        const totalMonthlyFund = Math.ceil(monthlyContribution * this.FUND_PERCENTAGE);

        switch (frequency) {
            case 'daily': return Math.ceil(totalMonthlyFund / 30);
            case 'weekly': return Math.ceil(totalMonthlyFund / 4);
            case 'monthly': return totalMonthlyFund;
            default: return totalMonthlyFund;
        }
    }

    /**
     * Process the protection fund deduction.
     * Idempotent based on reference.
     */
    async processContribution(userId: string, amount: number, reference: string): Promise<boolean> {
        if (!isFeatureEnabled('PROTECTION_FUND') || amount <= 0) return true;

        const fundRef = `fund_${reference}`;

        // Check if already processed (WalletService idempotent check)
        if (await walletService.isReferenceProcessed(fundRef)) {
            return true;
        }

        try {
            await walletService.processTransaction(
                userId,
                'contribution', // Using contribution type to ensure deduction (SafeZone treats 'fund' as deposit)
                amount,
                fundRef
            );
            return true;
        } catch (error) {
            console.error('[ProtectionFund] Transaction failed:', error);
            return false;
        }
    }
}

export const protectionFundService = new ProtectionFundService();
