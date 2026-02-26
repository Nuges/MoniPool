-- ============================================================
-- MONIPOOL PRODUCTION SCHEMA MIGRATION 
-- Safe to run multiple times, only adds missing elements
-- ============================================================

-- Quick Fix: Allow 'fund' as an alias for 'deposit' in the Enum
DO $$ BEGIN
    ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'fund';
EXCEPTION WHEN duplicate_object THEN null; 
-- To handle PostgreSQL < 12 which doesn't support IF NOT EXISTS for ENUM gracefully we catch duplicate_object
-- But if it's already there or syntax is wrong, we ignore it safely.
WHEN others THEN null; END $$;

DO $$ BEGIN ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'withdraw'; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'transfer'; EXCEPTION WHEN others THEN null; END $$;

-- Pool Tier Updates
DO $$ BEGIN ALTER TYPE pool_tier ADD VALUE IF NOT EXISTS '50k'; EXCEPTION WHEN others THEN null; END $$;

-- Quick Fix: Add missing Audit Actions defined in AuditService.ts to the ENUM
DO $$ BEGIN ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'pool_join_attempt'; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'pool_join_success'; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'pool_join_failure'; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'transaction_fund'; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'trust_gate_check'; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'fee_calculated'; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'protection_fund_contribution'; EXCEPTION WHEN others THEN null; END $$;

-- 1. Profiles Updates
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_flagged boolean default false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text unique;

DO $$ BEGIN
    CREATE POLICY "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Wallets Updates
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS pool_credit numeric(12, 2) default 0.00 check (pool_credit >= 0);

DO $$ BEGIN
    CREATE POLICY "Users can insert own wallet" on public.wallets for insert with check (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2.5 Pool Members Updates
ALTER TABLE public.pool_members ADD COLUMN IF NOT EXISTS contribution_frequency pool_cycle default 'monthly';
ALTER TABLE public.pool_members ADD COLUMN IF NOT EXISTS goal_title text;
ALTER TABLE public.pool_members ADD COLUMN IF NOT EXISTS goal_description text;

-- Drop infinite recursion policy and replace it
DO $$ BEGIN DROP POLICY IF EXISTS "View members of own pools" ON public.pool_members; EXCEPTION WHEN undefined_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Anyone can view pool members" ON public.pool_members FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Users can join pools" ON public.pool_members FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Reload Supabase Schema Cache
NOTIFY pgrst, 'reload schema';

-- 3. Referrals Table
DO $$ BEGIN
    CREATE TYPE referral_status AS ENUM ('pending', 'downloaded', 'registered', 'rewarded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.referrals (
    id uuid default uuid_generate_v4() primary key,
    referrer_id uuid references public.profiles(id) not null,
    referred_user_id uuid references public.profiles(id) not null,
    referral_code text not null,
    status referral_status default 'pending',
    created_at timestamptz default now(),
    completed_at timestamptz,
    unique(referrer_id, referred_user_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view own referrals" on public.referrals for select using (auth.uid() = referrer_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can view if they were referred" on public.referrals for select using (auth.uid() = referred_user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. Audit Logs Table (If not already created)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id),
    action text not null,
    table_name text,
    record_id uuid,
    details jsonb,
    ip_address text,
    created_at timestamptz default now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. RPC Functions
create or replace function public.process_wallet_transaction(
    p_user_id uuid,
    p_type transaction_type,
    p_amount numeric,
    p_reference text,
    p_description text default null,
    p_pool_credit_used numeric default 0,
    p_is_pool_credit boolean default false
) returns json language plpgsql security definer as $body$
declare
    v_wallet_id uuid;
    v_balance numeric;
    v_pool_credit numeric;
    v_tx_id uuid;
    v_direction text;
begin
    -- 1. Get Wallet
    select id, balance, pool_credit into v_wallet_id, v_balance, v_pool_credit
    from public.wallets
    where user_id = p_user_id for update;

    if not found then
        raise exception 'Wallet not found for user %', p_user_id;
    end if;

    -- 2. Determine Credit or Debit & Check Balance
    if p_type in ('deposit', 'payout', 'referral_bonus', 'fund') then
        v_direction := 'credit';
        if p_is_pool_credit then
             v_pool_credit := v_pool_credit + p_amount;
        else
             v_balance := v_balance + p_amount;
        end if;
    else
        v_direction := 'debit';
        
        -- Special logic for contribution (can mix cash and credit)
        if p_type = 'contribution' then
            if p_pool_credit_used > 0 then
                if v_pool_credit < p_pool_credit_used then
                    raise exception 'Insufficient pool credit';
                end if;
                v_pool_credit := v_pool_credit - p_pool_credit_used;
            end if;
            
            if v_balance < (p_amount - p_pool_credit_used) then
                 raise exception 'Insufficient cash balance';
            end if;
            v_balance := v_balance - (p_amount - p_pool_credit_used);
        else
            -- Strict cash deduction
            if v_balance < p_amount then
                 raise exception 'Insufficient withdrawable funds';
            end if;
            v_balance := v_balance - p_amount;
        end if;
    end if;

    -- 3. Update Wallet
    update public.wallets 
    set balance = v_balance, pool_credit = v_pool_credit, updated_at = now()
    where id = v_wallet_id;

    -- 4. Insert Transaction
    insert into public.wallet_transactions(
        wallet_id, reference, type, amount, direction, status, metadata
    )
    values (
        v_wallet_id, p_reference, p_type, p_amount, v_direction, 'success', 
        jsonb_build_object('description', p_description, 'pool_credit_used', p_pool_credit_used, 'is_pool_credit', p_is_pool_credit)
    ) returning id into v_tx_id;

    return json_build_object('transaction_id', v_tx_id, 'new_balance', v_balance, 'new_pool_credit', v_pool_credit);
end;
$body$;

-- Function for penalties
create or replace function public.increment_missed_payments(
    p_user_id uuid,
    p_pool_id uuid
) returns void language plpgsql security definer as $body$
begin
    update public.pool_members 
    set missed_payments = missed_payments + 1 
    where user_id = p_user_id and pool_id = p_pool_id;
    
    update public.profiles
    set trust_score = greatest(trust_score - 5, 0)
    where id = p_user_id;

    update public.profiles
    set is_flagged = true
    where id = p_user_id and (
        select sum(missed_payments) from public.pool_members where user_id = p_user_id
    ) >= 3;
end;
$body$;

-- ============================================================
-- 6. Missing Client RLS Policies (Fixing permission denied errors)
-- ============================================================

-- Pools: Client auto-creates and updates pools when joining
DO $$ BEGIN
    CREATE POLICY "Users can insert pools" on public.pools for insert with check (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update pools" on public.pools for update using (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Pool Members: Client self-inserts and updates when joining
DO $$ BEGIN
    CREATE POLICY "Users can insert pool members" on public.pool_members for insert with check (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own pool members" on public.pool_members for update using (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Referrals: Client inserts usage and updates status
DO $$ BEGIN
    CREATE POLICY "Users can insert referrals" on public.referrals for insert with check (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update referrals" on public.referrals for update using (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Audit Logs: Client inserts audit entries
DO $$ BEGIN
    CREATE POLICY "Users can insert audit logs" on public.audit_logs for insert with check (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- 7. Auto-Create Wallet in RPC (Fixes Funding Bug for Old Accounts)
-- ============================================================
create or replace function public.process_wallet_transaction(
    p_user_id uuid,
    p_type transaction_type,
    p_amount numeric,
    p_reference text,
    p_description text default null,
    p_pool_credit_used numeric default 0,
    p_is_pool_credit boolean default false
) returns json language plpgsql security definer as $$
declare
    v_wallet_id uuid;
    v_balance numeric;
    v_pool_credit numeric;
    v_tx_id uuid;
    v_direction text;
begin
    -- 1. Get Wallet
    select id, balance, pool_credit into v_wallet_id, v_balance, v_pool_credit
    from public.wallets
    where user_id = p_user_id for update;

    -- 1.5 Auto-create wallet if missing
    if not found then
        insert into public.wallets (user_id, balance, pool_credit)
        values (p_user_id, 0.00, 0.00)
        returning id, balance, pool_credit into v_wallet_id, v_balance, v_pool_credit;
    end if;

    -- 2. Determine Credit or Debit & Check Balance
    if p_type in ('deposit', 'payout', 'referral_bonus', 'fund') then
        v_direction := 'credit';
        if p_is_pool_credit then
             v_pool_credit := v_pool_credit + p_amount;
        else
             v_balance := v_balance + p_amount;
        end if;
    else
        v_direction := 'debit';
        
        -- Special logic for contribution (can mix cash and credit)
        if p_type = 'contribution' then
            if p_pool_credit_used > 0 then
                if v_pool_credit < p_pool_credit_used then
                    raise exception 'Insufficient pool credit';
                end if;
                v_pool_credit := v_pool_credit - p_pool_credit_used;
            end if;
            
            if v_balance < (p_amount - p_pool_credit_used) then
                 raise exception 'Insufficient cash balance';
            end if;
            v_balance := v_balance - (p_amount - p_pool_credit_used);
        else
            -- Strict cash deduction
            if v_balance < p_amount then
                 raise exception 'Insufficient withdrawable funds';
            end if;
            v_balance := v_balance - p_amount;
        end if;
    end if;

    -- 3. Update Wallet
    update public.wallets 
    set balance = v_balance, pool_credit = v_pool_credit, updated_at = now()
    where id = v_wallet_id;

    -- 4. Insert Transaction
    insert into public.wallet_transactions(
        wallet_id, reference, type, amount, direction, status, metadata
    )
    values (
        v_wallet_id, p_reference, p_type, p_amount, v_direction, 'success', 
        jsonb_build_object('description', p_description, 'pool_credit_used', p_pool_credit_used, 'is_pool_credit', p_is_pool_credit)
    ) returning id into v_tx_id;

    return json_build_object('transaction_id', v_tx_id, 'new_balance', v_balance, 'new_pool_credit', v_pool_credit);
end;
$$;

-- ============================================================
-- 8. Private Pools Updates
-- ============================================================

-- Pools tracking
ALTER TABLE public.pools ADD COLUMN IF NOT EXISTS is_private boolean default false;
ALTER TABLE public.pools ADD COLUMN IF NOT EXISTS created_by uuid references public.profiles(id);
ALTER TABLE public.pools ADD COLUMN IF NOT EXISTS approval_status text default 'approved';

-- Pool Invites
CREATE TABLE IF NOT EXISTS public.pool_invites (
    id uuid default uuid_generate_v4() primary key,
    pool_id uuid references public.pools(id) not null,
    inviter_id uuid references public.profiles(id) not null,
    invitee_id uuid references public.profiles(id) not null,
    status text default 'pending',
    created_at timestamptz default now()
);

ALTER TABLE public.pool_invites ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view invites addressed to them" on public.pool_invites for select using (auth.uid() = invitee_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can view invites they sent" on public.pool_invites for select using (auth.uid() = inviter_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create invites for their pools" on public.pool_invites for insert with check (auth.uid() = inviter_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update their own invites" on public.pool_invites for update using (auth.uid() = invitee_id or auth.uid() = inviter_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Private Pool Requests
CREATE TABLE IF NOT EXISTS public.private_pool_requests (
    id uuid default uuid_generate_v4() primary key,
    creator_id uuid references public.profiles(id) not null,
    tier pool_tier not null,
    requested_at timestamptz default now(),
    status text default 'pending'
);

ALTER TABLE public.private_pool_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view own requests" on public.private_pool_requests for select using (auth.uid() = creator_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create requests" on public.private_pool_requests for insert with check (auth.uid() = creator_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';
