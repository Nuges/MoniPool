-- ============================================================
-- MONIPOOL SECURITY ENHANCEMENT MIGRATION
-- Adds device fingerprinting, completed_cycles tracking,
-- and escrow management tables.
-- Run AFTER the base schema.sql
-- ============================================================

-- 1. DEVICE FINGERPRINTS TABLE
-- Tracks device hashes per user for fraud detection
CREATE TABLE IF NOT EXISTS public.device_fingerprints (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    device_hash text NOT NULL,
    platform text, -- 'ios', 'android', 'web'
    device_name text,
    first_seen_at timestamptz DEFAULT now(),
    last_seen_at timestamptz DEFAULT now(),

    UNIQUE(user_id, device_hash)
);

ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own devices" ON public.device_fingerprints
    FOR SELECT USING (auth.uid() = user_id);

-- 2. DEVICE BANS TABLE
-- Permanently blocks devices associated with defaulted users
CREATE TABLE IF NOT EXISTS public.device_bans (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_hash text UNIQUE NOT NULL,
    banned_user_id uuid REFERENCES public.profiles(id),
    reason text DEFAULT 'pool_default',
    banned_at timestamptz DEFAULT now()
);

ALTER TABLE public.device_bans ENABLE ROW LEVEL SECURITY;
-- No public read access to bans table (server-side only)

-- 3. ADD completed_cycles TO profiles (for tier gating)
-- Tracks how many pool cycles a user has fully completed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'completed_cycles'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN completed_cycles int DEFAULT 0;
    END IF;
END $$;

-- 4. ADD accepted_terms_at TO profiles (for credit bureau consent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'accepted_terms_at'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN accepted_terms_at timestamptz;
    END IF;
END $$;

-- 5. ESCROW TRACKING VIEW
-- Provides a summary of locked funds per pool per user
CREATE OR REPLACE VIEW public.escrow_summary AS
SELECT
    pm.pool_id,
    pm.user_id,
    p.name AS pool_name,
    p.tier,
    p.contribution_amount AS escrow_amount,
    w.locked_balance AS total_locked,
    pm.status AS member_status
FROM public.pool_members pm
JOIN public.pools p ON p.id = pm.pool_id
JOIN public.wallets w ON w.user_id = pm.user_id
WHERE pm.status = 'active';

-- 6. FUNCTION: Check if a device is banned
CREATE OR REPLACE FUNCTION public.is_device_banned(p_device_hash text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.device_bans WHERE device_hash = p_device_hash
    );
$$;

-- 7. FUNCTION: Increment completed_cycles for a user
CREATE OR REPLACE FUNCTION public.increment_completed_cycles(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles
    SET completed_cycles = COALESCE(completed_cycles, 0) + 1
    WHERE id = p_user_id;
END;
$$;
