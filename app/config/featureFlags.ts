// ============================================================
// Feature Flags — Future Work Scaffolding
// All flags are FALSE. No active logic. No UI exposure.
// These exist solely as placeholders for future backend integration.
// ============================================================

export const FEATURE_FLAGS = {
    /**
     * Referral Rewards → Wallet Auto-Credit
     * When enabled, completing a referral will auto-credit ₦500 to the
     * referrer's wallet via WalletService.processTransaction().
     *
     * TODO: Integrate with WalletService.processTransaction() in
     *       ReferralService.recordReferral() when backend is ready.
     */
    REFERRAL_REWARDS: false,

    /**
     * Push Notifications
     * When enabled, the app will register for push tokens and receive
     * server-sent notifications for pool events, payment reminders, etc.
     *
     * TODO: Integrate expo-notifications, register push token on login,
     *       subscribe to pool and wallet events.
     */
    PUSH_NOTIFICATIONS: false,

    /**
     * KYC Verification
     * When enabled, users can submit identity documents for verification.
     * KYC level determines tier eligibility limits.
     *
     * TODO: Integrate with KYC provider API (e.g., Smile Identity, Verify.ng).
     *       Gate pool join for tiers above 500k behind KYC Level 2+.
     */
    KYC_VERIFICATION: false,

    /**
     * Payment Gateway (Paystack / Flutterwave)
     * When enabled, wallet funding goes through a real payment gateway
     * instead of in-memory simulation.
     *
     * TODO: Integrate Paystack or Flutterwave SDK.
     *       Replace WalletService.processTransaction('deposit') with
     *       gateway-initiated flow: initiate → verify → credit.
     */
    PAYMENT_GATEWAY: false,

    /**
     * Real-Time Pool Chat
     * When enabled, group chat uses WebSocket or Firebase Realtime Database
     * instead of local mock messages.
     *
     * TODO: Set up WebSocket connection or Firebase Realtime DB.
     *       Replace chatMessages mock data with live subscription.
     *       Add typing indicators and read receipts.
     */
    REALTIME_CHAT: false,

    // ─── NEW BUSINESS MODELS (v1.1.0) ───

    /**
     * Trust-Gated Pool Access
     * Enforces stricter trust score requirements for higher tiers.
     */
    TRUST_GATED_ACCESS: false,

    /**
     * Default Protection Fund
     * Automatically deducts a small percentage for the community protection fund.
     */
    PROTECTION_FUND: true,

    /**
     * Trust-Based Fee Fairness
     * Applies dynamic platform fees based on trust score (Higher trust = Lower fee).
     */
    TRUST_BASED_FEES: true,
} as const;

const MUTABLE_FLAGS = { ...FEATURE_FLAGS };

/** Type-safe flag check helper. */
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
    return MUTABLE_FLAGS[flag];
}

/** 
 * Runtime override for Feature Flags (DEV ONLY).
 * Allows toggling flags from the DevDebug menu.
 */
export function setFeatureFlag(flag: keyof typeof FEATURE_FLAGS, enabled: boolean) {
    if (__DEV__) {
        console.log(`[DEV] Feature Flag '${flag}' set to ${enabled}`);
        // @ts-ignore
        MUTABLE_FLAGS[flag] = enabled;
    }
}
