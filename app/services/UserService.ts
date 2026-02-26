// ============================================================
// Service: UserService
// Handles: User data retrieval from Supabase 'profiles' table
// Last updated: Phase 2 Integration
// ============================================================

import { supabase } from './supabaseClient';

export interface UserProfile {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    kycStatus: 'none' | 'pending' | 'verified' | 'rejected' | 'tier2';
    trustScore: number;
    joinedAt: Date;
    isFlagged: boolean;
}

class UserService {
    /**
     * Get all users for Admin Dashboard
     */
    async getAllUsers(): Promise<UserProfile[]> {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) {
            console.error('[UserService] Error fetching users:', error);
            return [];
        }
        return data.map(this.mapProfile);
    }

    /**
     * Get single user by ID
     */
    async getUserById(userId: string): Promise<UserProfile | undefined> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !data) {
            console.error(`[UserService] Error fetching user ${userId}:`, error?.message);
            return undefined;
        }

        return this.mapProfile(data);
    }

    /**
     * Update User Data
     */
    async updateUser(userId: string, updates: Partial<UserProfile>): Promise<void> {
        // Map from camelCase to db snake_case
        const dbUpdates: any = {};
        if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
        if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
        if (updates.email !== undefined) dbUpdates.email = updates.email;
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
        if (updates.trustScore !== undefined) dbUpdates.trust_score = updates.trustScore;

        if (updates.kycStatus === 'verified') dbUpdates.kyc_level = 'verified';
        else if (updates.kycStatus === 'tier2') dbUpdates.kyc_level = 'tier2';
        else if (updates.kycStatus === 'none' || updates.kycStatus === 'rejected') dbUpdates.kyc_level = 'basic';

        dbUpdates.updated_at = new Date().toISOString();

        const { error } = await supabase
            .from('profiles')
            .update(dbUpdates)
            .eq('id', userId);

        if (error) {
            console.error(`[UserService] Error updating user ${userId}:`, error);
        }
    }

    /**
     * Helper to map DB row to internal UserProfile shape
     */
    private mapProfile(row: any): UserProfile {
        let kycStatus: UserProfile['kycStatus'] = 'none';
        if (row.kyc_level === 'verified') kycStatus = 'verified';
        if (row.kyc_level === 'tier2') kycStatus = 'tier2';

        return {
            id: row.id,
            firstName: row.first_name || '',
            lastName: row.last_name || '',
            email: row.email,
            phone: row.phone,
            kycStatus: kycStatus,
            trustScore: row.trust_score || 50,
            joinedAt: new Date(row.created_at),
            isFlagged: false // Replace with actual logic if flagged status is added to DB
        };
    }
}

export const userService = new UserService();
