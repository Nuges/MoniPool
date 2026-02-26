import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { supabase } from '../services/supabaseClient';
import { walletService } from '../services/WalletService';

// ─── Types ───────────────────────────────────────────

interface AuthState {
    userId: string | null;
    phone: string | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    avatarUri: string | null;
    kycStatus: 'none' | 'pending' | 'verified' | 'rejected'; // New: KYC Status
    isAuthenticated: boolean;
    isRegistered: boolean;
    isLoading: boolean;
    role: 'user' | 'admin';
}

interface AuthContextType extends AuthState {
    login: (params: {
        userId: string;
        phone?: string;
        email?: string;
        firstName: string;
        lastName: string;
        avatarUri?: string;
        pin: string;
        role?: 'user' | 'admin';
    }) => Promise<void>;
    updateProfile: (data: Partial<Pick<AuthState, 'firstName' | 'lastName' | 'avatarUri' | 'kycStatus'>>) => Promise<void>;
    establishAuthSession: (params: { phone?: string; email?: string; pin: string }) => Promise<void>;
    changePin: (newPin: string) => Promise<void>;
    logout: () => Promise<void>;
    verifyPin: (pin: string) => Promise<boolean>;
    loginWithPin: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

// ─── Storage Keys ────────────────────────────────────

const KEYS = {
    USER_ID: 'monipool_user_id',
    PHONE: 'monipool_phone',
    EMAIL: 'monipool_email',
    FIRST_NAME: 'monipool_first_name',
    LAST_NAME: 'monipool_last_name',
    AVATAR_URI: 'monipool_avatar_uri',
    KYC_STATUS: 'monipool_kyc_status', // New Key
    PIN_HASH: 'monipool_pin_hash',
    IS_AUTHENTICATED: 'monipool_is_authenticated',
    ROLE: 'monipool_role',
} as const;

// ─── Context ─────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── PIN Hashing ─────────────────────────────────────

async function hashPin(pin: string): Promise<string> {
    return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `monipool_salt_${pin}`,
    );
}

// ─── Provider ────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({
        userId: null,
        phone: null,
        email: null,
        firstName: null,
        lastName: null,
        avatarUri: null,
        kycStatus: 'none', // Default
        isAuthenticated: false,
        isRegistered: false,
        isLoading: true,
        role: 'user',
    });

    // Restore session on mount
    useEffect(() => {
        (async () => {
            try {
                // Check if we have a registered user at all
                let hasUser = false;
                let pinHash: string | null = null;

                if (Platform.OS === 'web') {
                    pinHash = localStorage.getItem(KEYS.PIN_HASH);
                    hasUser = !!pinHash;
                } else {
                    pinHash = await SecureStore.getItemAsync(KEYS.PIN_HASH);
                    hasUser = !!pinHash;
                }

                if (!hasUser) {
                    setState(prev => ({ ...prev, isLoading: false, isRegistered: false }));
                    return;
                }

                let userId, phone, email, firstName, lastName, avatarUri, kycStatus, role, isAuth;

                if (Platform.OS === 'web') {
                    userId = localStorage.getItem(KEYS.USER_ID);
                    phone = localStorage.getItem(KEYS.PHONE);
                    email = localStorage.getItem(KEYS.EMAIL);
                    firstName = localStorage.getItem(KEYS.FIRST_NAME);
                    lastName = localStorage.getItem(KEYS.LAST_NAME);
                    avatarUri = localStorage.getItem(KEYS.AVATAR_URI);
                    kycStatus = localStorage.getItem(KEYS.KYC_STATUS);
                    role = localStorage.getItem(KEYS.ROLE);
                    isAuth = localStorage.getItem(KEYS.IS_AUTHENTICATED);
                } else {
                    [userId, phone, email, firstName, lastName, avatarUri, kycStatus, role, isAuth] = await Promise.all([
                        SecureStore.getItemAsync(KEYS.USER_ID),
                        SecureStore.getItemAsync(KEYS.PHONE),
                        SecureStore.getItemAsync(KEYS.EMAIL),
                        SecureStore.getItemAsync(KEYS.FIRST_NAME),
                        SecureStore.getItemAsync(KEYS.LAST_NAME),
                        SecureStore.getItemAsync(KEYS.AVATAR_URI),
                        SecureStore.getItemAsync(KEYS.KYC_STATUS),
                        SecureStore.getItemAsync(KEYS.ROLE),
                        SecureStore.getItemAsync(KEYS.IS_AUTHENTICATED),
                    ]);
                }

                // Fetch fresh profile from Supabase
                if (userId) {
                    const { data: profile, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', userId)
                        .single();

                    // Self-healing: If profile doesn't exist in DB (e.g. wiped or creation failed), clear ghost session
                    if (error && error.code === 'PGRST116') {
                        console.warn('[AuthContext] Profile missing in DB. Forcing logout to clear ghost session.');
                        if (Platform.OS === 'web') {
                            Object.values(KEYS).forEach(key => localStorage.removeItem(key));
                        } else {
                            const deletePromises = Object.values(KEYS).map(key => SecureStore.deleteItemAsync(key));
                            await Promise.all(deletePromises);
                        }
                        setState(prev => ({
                            ...prev,
                            isLoading: false,
                            isRegistered: false,
                            isAuthenticated: false,
                            userId: null
                        }));
                        return;
                    }

                    if (profile) {
                        firstName = profile.first_name || firstName;
                        lastName = profile.last_name || lastName;
                        email = profile.email || email;
                        phone = profile.phone || phone;
                        kycStatus = profile.kyc_level || kycStatus;
                    }
                }

                setState({
                    userId,
                    phone,
                    email,
                    firstName,
                    lastName,
                    avatarUri,
                    kycStatus: (kycStatus as AuthState['kycStatus']) || 'none',
                    isAuthenticated: isAuth === 'true',
                    isRegistered: true,
                    isLoading: false,
                    role: (role as 'user' | 'admin') || 'user',
                });

            } catch (error) {
                console.error('[AuthContext] Failed to restore session:', error);
                setState(prev => ({ ...prev, isLoading: false }));
            }
        })();
    }, []);

    // -------------------------------------------------------------
    // Establish Auth Session (Called after PIN creation)
    // -------------------------------------------------------------
    const establishAuthSession = useCallback(async (params: {
        phone?: string;
        email?: string;
        pin: string;
    }) => {
        try {
            const crypto = require('expo-crypto');
            const safePin = String(params.pin || '0000');
            const safePhone = params.phone ? String(params.phone) : '';
            const safeEmail = params.email ? String(params.email) : '';

            // Create a deterministic mock email if one isn't provided
            const identifier = safePhone || safeEmail || crypto.randomUUID();
            const numericId = identifier.replace(/\D/g, '').slice(0, 10) || Math.floor(Math.random() * 1000000000).toString();
            const dbEmail = safeEmail || `user${numericId}@example.com`;

            // Note: Supabase Auth requires a password of at least 6 characters. The PIN is usually 4 digits.
            const authPassword = `${safePin}mp`;

            // Try signing in first to avoid hitting the new signup rate limit for existing mock users
            let authResponse: any = await supabase.auth.signInWithPassword({
                email: dbEmail,
                password: authPassword,
            });

            // If user doesn't exist, sign them up
            if (authResponse.error && authResponse.error.message.includes('Invalid login credentials')) {
                authResponse = await supabase.auth.signUp({
                    email: dbEmail,
                    password: authPassword,
                });
            }

            if (authResponse.error) {
                console.error('[AuthContext] Supabase Auth Session Error:', authResponse.error.message);
                throw new Error(authResponse.error.message);
            }

            const realUserId = authResponse.data.user?.id;
            if (!realUserId) {
                throw new Error("Failed to retrieve authenticated user ID from Supabase.");
            }
        } catch (error) {
            console.error('[AuthContext] Failed to establish auth session:', error);
            throw error;
        }
    }, []);

    // -------------------------------------------------------------
    // Login — finalize profile, wallet, and local persistence
    // -------------------------------------------------------------
    const login = useCallback(async (params: {
        userId: string;
        phone?: string;
        email?: string;
        firstName: string;
        lastName: string;
        avatarUri?: string;
        pin: string;
        role?: 'user' | 'admin';
    }) => {
        try {
            // ... strict coercion ...
            // We use uuidv4 if no userId is provided (which shouldn't happen long term, but handle it gracefully for dev)
            const crypto = require('expo-crypto');
            const safeUserId = String(params.userId || crypto.randomUUID());
            const safePhone = params.phone ? String(params.phone) : '';
            const safeEmail = params.email ? String(params.email) : '';
            const safeFirstName = String(params.firstName || '');
            const safeLastName = String(params.lastName || '');
            const safeAvatarUri = params.avatarUri ? String(params.avatarUri) : '';
            const safePin = String(params.pin || '0000');
            const safeRole = params.role || 'user';

            const pinHash = await hashPin(safePin);

            const numericId = safeUserId.replace(/\D/g, '').slice(0, 10) || Math.floor(Math.random() * 1000000000).toString();
            const dbEmail = safeEmail || `user${numericId}@example.com`;

            // Make sure the session actually exists right now. It should have been created by establishAuthSession.
            const { data: sessionData } = await supabase.auth.getSession();
            const realUserId: string = sessionData?.session?.user?.id as string;

            if (!realUserId) {
                console.warn('[AuthContext] No auth session found during login completion. Attempting to establish one...');
                await establishAuthSession({ phone: safePhone, email: safeEmail, pin: safePin });
            }

            const { data: finalSessionData } = await supabase.auth.getSession();
            const finalRealUserId: string = finalSessionData?.session?.user?.id as string;

            if (!finalRealUserId) {
                throw new Error("Failed to secure authenticated user ID from Supabase.");
            }

            // 2. Upsert profile in Supabase using the authenticated user ID
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: finalRealUserId,
                first_name: safeFirstName,
                last_name: safeLastName,
                phone: safePhone || null,
                email: dbEmail,
            }, { onConflict: 'id' });

            if (profileError) {
                console.error('[AuthContext] Failed to upsert profile in Supabase:', profileError);
                throw new Error(profileError.message);
            }

            // Ensure wallet exists
            try {
                await walletService.createWallet(finalRealUserId);
            } catch (err) {
                // Ignore
            }

            if (Platform.OS === 'web') {
                localStorage.setItem(KEYS.USER_ID, finalRealUserId);
                if (safePhone) localStorage.setItem(KEYS.PHONE, safePhone);
                if (safeEmail) localStorage.setItem(KEYS.EMAIL, safeEmail);
                localStorage.setItem(KEYS.FIRST_NAME, safeFirstName);
                localStorage.setItem(KEYS.LAST_NAME, safeLastName);
                if (safeAvatarUri) localStorage.setItem(KEYS.AVATAR_URI, safeAvatarUri);
                localStorage.setItem(KEYS.KYC_STATUS, 'none');
                localStorage.setItem(KEYS.PIN_HASH, pinHash);
                localStorage.setItem(KEYS.IS_AUTHENTICATED, 'true');
                localStorage.setItem(KEYS.ROLE, safeRole);
            } else {
                await Promise.all([
                    SecureStore.setItemAsync(KEYS.USER_ID, finalRealUserId),
                    SecureStore.setItemAsync(KEYS.PHONE, safePhone),
                    SecureStore.setItemAsync(KEYS.EMAIL, safeEmail),
                    SecureStore.setItemAsync(KEYS.FIRST_NAME, safeFirstName),
                    SecureStore.setItemAsync(KEYS.LAST_NAME, safeLastName),
                    SecureStore.setItemAsync(KEYS.AVATAR_URI, safeAvatarUri),
                    SecureStore.setItemAsync(KEYS.KYC_STATUS, 'none'), // Default for new user
                    SecureStore.setItemAsync(KEYS.PIN_HASH, pinHash),
                    SecureStore.setItemAsync(KEYS.IS_AUTHENTICATED, 'true'),
                    SecureStore.setItemAsync(KEYS.ROLE, safeRole),
                ]);
            }

            setState({
                userId: finalRealUserId,
                phone: safePhone || null,
                email: safeEmail || null,
                firstName: safeFirstName,
                lastName: safeLastName,
                avatarUri: safeAvatarUri || null,
                kycStatus: 'none',
                isAuthenticated: true,
                isRegistered: true,
                isLoading: false,
                role: safeRole,
            });
        } catch (error) {
            console.error('[AuthContext] Login failed:', error);
            throw error;
        }
    }, [establishAuthSession]);

    // Update Profile (Partial)
    const updateProfile = useCallback(async (data: Partial<Pick<AuthState, 'firstName' | 'lastName' | 'avatarUri' | 'kycStatus'>>) => {
        try {
            if (state.userId) {
                const dbUpdates: any = {};
                if (data.firstName !== undefined) dbUpdates.first_name = data.firstName;
                if (data.lastName !== undefined) dbUpdates.last_name = data.lastName;
                if (data.kycStatus !== undefined) {
                    // Prevent DB constraint violation: schema only allows ('basic', 'verified', 'tier2')
                    if (data.kycStatus === 'pending') {
                        // Keep DB as 'basic' until the admin approves it to 'verified'
                        dbUpdates.kyc_level = 'basic';
                    } else {
                        dbUpdates.kyc_level = data.kycStatus;
                    }
                }

                if (Object.keys(dbUpdates).length > 0) {
                    const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', state.userId);
                    if (error) console.error('[AuthContext] Supabase profile update failed:', error);
                }
            }

            if (Platform.OS === 'web') {
                if (data.firstName !== undefined) localStorage.setItem(KEYS.FIRST_NAME, data.firstName || '');
                if (data.lastName !== undefined) localStorage.setItem(KEYS.LAST_NAME, data.lastName || '');
                if (data.avatarUri !== undefined) localStorage.setItem(KEYS.AVATAR_URI, data.avatarUri || '');
                if (data.kycStatus !== undefined) localStorage.setItem(KEYS.KYC_STATUS, data.kycStatus);
            } else {
                const updates: Promise<void>[] = [];
                if (data.firstName !== undefined) updates.push(SecureStore.setItemAsync(KEYS.FIRST_NAME, data.firstName || ''));
                if (data.lastName !== undefined) updates.push(SecureStore.setItemAsync(KEYS.LAST_NAME, data.lastName || ''));
                if (data.avatarUri !== undefined) updates.push(SecureStore.setItemAsync(KEYS.AVATAR_URI, data.avatarUri || ''));
                if (data.kycStatus !== undefined) updates.push(SecureStore.setItemAsync(KEYS.KYC_STATUS, data.kycStatus));
                await Promise.all(updates);
            }

            setState(prev => ({
                ...prev,
                ...data,
            }));
        } catch (error) {
            console.error('[AuthContext] Update profile failed:', error);
            throw error;
        }
    }, [state.userId]);

    // Refresh Profile (Fetch latest from DB)
    const refreshProfile = useCallback(async () => {
        if (!state.userId) return;
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', state.userId)
                .single();

            if (error) {
                console.error('[AuthContext] Failed to refresh profile:', error);
                return;
            }

            if (profile) {
                const newKycStatus = profile.kyc_level || state.kycStatus;

                if (Platform.OS === 'web') {
                    if (profile.first_name) localStorage.setItem(KEYS.FIRST_NAME, profile.first_name);
                    if (profile.last_name) localStorage.setItem(KEYS.LAST_NAME, profile.last_name);
                    if (newKycStatus) localStorage.setItem(KEYS.KYC_STATUS, newKycStatus);
                } else {
                    const updates: Promise<void>[] = [];
                    if (profile.first_name) updates.push(SecureStore.setItemAsync(KEYS.FIRST_NAME, profile.first_name));
                    if (profile.last_name) updates.push(SecureStore.setItemAsync(KEYS.LAST_NAME, profile.last_name));
                    if (newKycStatus) updates.push(SecureStore.setItemAsync(KEYS.KYC_STATUS, newKycStatus));
                    await Promise.all(updates);
                }

                setState(prev => ({
                    ...prev,
                    firstName: profile.first_name || prev.firstName,
                    lastName: profile.last_name || prev.lastName,
                    email: profile.email || prev.email,
                    phone: profile.phone || prev.phone,
                    kycStatus: newKycStatus as AuthState['kycStatus'],
                }));
            }
        } catch (error) {
            console.error('[AuthContext] Refresh profile error:', error);
        }
    }, [state.userId, state.kycStatus]);

    // Change PIN
    const changePin = useCallback(async (newPin: string) => {
        try {
            const pinHash = await hashPin(newPin);
            if (Platform.OS === 'web') {
                localStorage.setItem(KEYS.PIN_HASH, pinHash);
            } else {
                await SecureStore.setItemAsync(KEYS.PIN_HASH, pinHash);
            }
        } catch (error) {
            console.error('[AuthContext] Failed to update PIN:', error);
            throw error;
        }
    }, []);

    // Login with PIN only (Existing User)
    const loginWithPin = useCallback(async () => {
        try {
            if (Platform.OS === 'web') {
                localStorage.setItem(KEYS.IS_AUTHENTICATED, 'true');
            } else {
                await SecureStore.setItemAsync(KEYS.IS_AUTHENTICATED, 'true');
            }
            setState(prev => ({ ...prev, isAuthenticated: true }));
        } catch (error) {
            console.error('[AuthContext] PIN login failed:', error);
        }
    }, []);

    // Logout — Sign out of Supabase and clear auth state, but KEEP user data for easy PIN login
    const logout = useCallback(async () => {
        try {
            // 1. Sign out of Supabase first so the session doesn't linger
            await supabase.auth.signOut();

            // 2. Clear ONLY the authenticated flag from local storage
            if (Platform.OS === 'web') {
                localStorage.removeItem(KEYS.IS_AUTHENTICATED);
            } else {
                await SecureStore.deleteItemAsync(KEYS.IS_AUTHENTICATED);
            }

            setState(prev => ({
                ...prev,
                isAuthenticated: false,
            }));
        } catch (error) {
            console.error('[AuthContext] Logout failed:', error);
        }
    }, []);
    // Verify PIN
    const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
        try {
            let storedHash: string | null = null;
            if (Platform.OS === 'web') {
                storedHash = localStorage.getItem(KEYS.PIN_HASH);
            } else {
                storedHash = await SecureStore.getItemAsync(KEYS.PIN_HASH);
            }

            if (!storedHash) return false;
            const inputHash = await hashPin(pin);
            return inputHash === storedHash;
        } catch {
            return false;
        }
    }, []);

    return (
        <AuthContext.Provider value={{
            ...state,
            login,
            logout,
            verifyPin,
            loginWithPin,
            updateProfile,
            establishAuthSession,
            changePin,
            refreshProfile
        }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// ─── Hook ────────────────────────────────────────────

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return ctx;
}
