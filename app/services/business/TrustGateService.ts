// ============================================================
// Business Logic Layer: TrustGateService
// Wraps ReputationService to enforce stricter eligibility rules
// controlled by the TRUST_GATED_ACCESS feature flag.
// ============================================================

import { reputationService } from '../ReputationService';
import { isFeatureEnabled } from '../../config/featureFlags';
import { Tier } from '../../models/schema';

class TrustGateService {

    /**
     * Check if a user is eligible for a specific tier.
     * If TRUST_GATED_ACCESS is OFF, falls back to standard ReputationService logic.
     * If ON, enforces stricter scores.
     */
    async checkEligibility(userId: string, tier: Tier): Promise<{
        eligible: boolean;
        message: string;
        currentScore: number;
        requiredScore: number;
    }> {
        const standardCheck = await reputationService.getEligibilityMessage(userId, tier);

        // Passthrough if flag is disabled
        if (!isFeatureEnabled('TRUST_GATED_ACCESS')) {
            return {
                eligible: standardCheck.eligible,
                message: standardCheck.message,
                currentScore: standardCheck.currentScore,
                requiredScore: standardCheck.requiredScore
            };
        }

        // ─── STRICTER LOGIC (Flag ON) ───
        // New Requirements:
        // 1m: 85 (was 80)
        // 800k: 80 (was 80)
        // 500k: 70 (was 60)
        // 300k: 60 (was 50/0)
        // 100k: 50 (was 0)

        const strictRequirements: Record<Tier, number> = {
            '2m': 90,
            '1m': 85,
            '500k': 70,
            '300k': 60,
            '100k': 50,
            '50k': 0
        };

        const requiredScore = strictRequirements[tier];
        const currentScore = standardCheck.currentScore;

        if (currentScore >= requiredScore) {
            return {
                eligible: true,
                message: `Trust Gate Passed: You are eligible for the ${tier} tier.`,
                currentScore,
                requiredScore
            };
        }

        return {
            eligible: false,
            message: `Trust Gate: This pool requires a Trust Score of ${requiredScore}. Your current score is ${currentScore}.`,
            currentScore,
            requiredScore
        };
    }
}

export const trustGateService = new TrustGateService();
