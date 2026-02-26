// ============================================================
// Service: AuditService
// Purpose: Lightweight, privacy-safe audit logging for critical actions.
// Constraints: Database backed via Supabase `audit_logs`. NO PII. NO Secrets.
// Last updated: Phase 2 Integration
// ============================================================

import { supabase } from './supabaseClient';

type AuditAction =
    | 'auth_login' | 'auth_signup' | 'auth_pin_change' | 'auth_logout'
    | 'profile_update' | 'profile_kyc_submit'
    | 'pool_create' | 'pool_join' | 'pool_leave' | 'pool_complete'
    | 'transaction_deposit' | 'transaction_withdraw' | 'transaction_transfer' | 'transaction_contribution' | 'transaction_payout' | 'transaction_fee'
    | 'admin_suspend_user' | 'admin_flag_pool' | 'admin_override'
    | 'system_auto_debit' | 'system_payout_trigger'
    | 'pool_join_attempt' | 'pool_join_success' | 'pool_join_failure'
    | 'trust_gate_check' | 'fee_calculated' | 'protection_fund_contribution';

interface AuditLog {
    timestamp: string;
    action: AuditAction;
    userId: string;
    details?: Record<string, any>;
}

class AuditService {
    /**
     * Log a critical system action.
     * Safe to call in production (console logs are stripped in release builds).
     */
    async logAction(userId: string, action: AuditAction, details?: Record<string, any>): Promise<void> {
        const { error } = await supabase
            .from('audit_logs')
            .insert({
                user_id: userId,
                action: action,
                details: details || {}
            });

        // DEV-only output for debugging
        if (__DEV__) {
            if (error) {
                console.error('[AUDIT] Failed to save log to Supabase:', error);
            }
        }
    }

    /**
     * Retrieve recent logs (for admin/debug tools).
     */
    async getLogs(limit: number = 100): Promise<AuditLog[]> {
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error || !data) {
            console.error('[AUDIT] Failed to retrieve logs:', error);
            return [];
        }

        return data.map(row => ({
            timestamp: row.created_at,
            action: row.action as AuditAction,
            userId: row.user_id,
            details: row.details
        }));
    }

    /**
     * Clear logs (for testing).
     */
    async clearLogs(): Promise<void> {
        // Typically not allowed via RLS in production, but defined here for completeness if admin
        const { error } = await supabase.from('audit_logs').delete().filter('id', 'not.is', null);
        if (error) console.error('[AUDIT] Clear logs failed:', error);
    }
}

export const auditService = new AuditService();
