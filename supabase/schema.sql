-- ============================================================
-- MONIPOOL PRODUCTION SCHEMA
-- Phase 1: Data Integrity & Ledger
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Users)
-- Links to Supabase Auth.users via 'id'
create table public.profiles (
    id uuid references auth.users(id) on delete cascade primary key,
    email text unique not null,
    first_name text,
    last_name text,
    phone text unique,
    avatar_url text,
    
    -- Identity & Trust
    bvn text unique,
    nin text unique,
    kyc_level text default 'basic' check (kyc_level in ('basic', 'verified', 'tier2')),
    trust_score int default 50 check (trust_score between 0 and 100),
    
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 2. WALLETS
-- One wallet per user. Mapped 1:1.
create table public.wallets (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) not null unique,
    currency text default 'NGN',
    balance numeric(12, 2) default 0.00 check (balance >= 0), -- Prevent overdrafts at DB level
    locked_balance numeric(12, 2) default 0.00 check (locked_balance >= 0),
    pool_credit numeric(12, 2) default 0.00 check (pool_credit >= 0),
    is_frozen boolean default false,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 3. WALLET LEDGER (Immutable Transactions)
-- Double-entry system simulation (Credit/Debit)
create type transaction_type as enum (
    'deposit', 'withdrawal', 'contribution', 'payout', 
    'fee', 'fund_contribution', 'penalty', 'referral_bonus'
);

create type transaction_status as enum ('pending', 'success', 'failed');

create table public.wallet_transactions (
    id uuid default uuid_generate_v4() primary key,
    wallet_id uuid references public.wallets(id) not null,
    reference text unique not null, -- Idempotency Key
    
    type transaction_type not null,
    amount numeric(12, 2) not null check (amount > 0),
    direction text not null check (direction in ('credit', 'debit')),
    
    status transaction_status default 'pending',
    metadata jsonb default '{}'::jsonb, -- Store pool_id, slot_number etc.
    
    created_at timestamptz default now()
);

-- 4. POOLS
create type pool_tier as enum ('100k', '300k', '500k', '800k', '1m');
create type pool_cycle as enum ('daily', 'weekly', 'monthly');
create type pool_status as enum ('filling', 'locked', 'active', 'completed', 'cancelled');

create table public.pools (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    tier pool_tier not null,
    cycle pool_cycle not null,
    
    amount numeric(12, 2) not null, -- Total Payout Amount
    contribution_amount numeric(12, 2) not null, -- Per member per cycle
    
    capacity int default 5,
    current_members_count int default 0,
    
    min_trust_score int default 50,
    
    status pool_status default 'filling',
    start_date timestamptz,
    
    is_private boolean default false,
    created_by uuid references public.profiles(id),
    approval_status text default 'approved', -- pending, approved, rejected
    
    created_at timestamptz default now()
);

-- 5. POOL MEMBERS (Allocations)
create table public.pool_members (
    id uuid default uuid_generate_v4() primary key,
    pool_id uuid references public.pools(id) not null,
    user_id uuid references public.profiles(id) not null,
    
    payout_slot int not null,
    payout_date timestamptz,
    
    goal_title text,
    goal_description text,
    contribution_frequency pool_cycle default 'monthly',
    
    has_received_payout boolean default false,
    contributions_made int default 0,
    missed_payments int default 0,
    
    status text default 'active', -- active, defaulted, completed
    
    joined_at timestamptz default now(),
    
    unique(pool_id, user_id),
    unique(pool_id, payout_slot)
);

-- 6. PROTECTION FUND LEDGER
-- Isolated ledger for the community fund
create table public.protection_fund_ledger (
    id uuid default uuid_generate_v4() primary key,
    transaction_id uuid references public.wallet_transactions(id), -- Link to source
    amount numeric(12, 2) not null,
    reason text,
    created_at timestamptz default now()
);

-- 7. AUDIT LOGS
create table public.audit_logs (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id),
    action text not null,
    table_name text,
    record_id uuid,
    details jsonb,
    ip_address text,
    created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Profiles: Users can read/edit their own
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Wallets: View Only (Writes handled by Server Functions/RPC)
alter table public.wallets enable row level security;
create policy "Users can view own wallet" on public.wallets for select using (auth.uid() = user_id);

-- Transactions: View Only
alter table public.wallet_transactions enable row level security;
create policy "Users can view own transactions" on public.wallet_transactions for select using (
    wallet_id in (select id from public.wallets where user_id = auth.uid())
);

-- Pools: Public View (for browsing)
alter table public.pools enable row level security;
create policy "Anyone can view active pools" on public.pools for select using (true);

-- Pool Members: View Own + Pool Mates
alter table public.pool_members enable row level security;
create policy "View members of own pools" on public.pool_members for select using (
    pool_id in (
        select pool_id from public.pool_members where user_id = auth.uid()
    )
    or 
    pool_id in (select id from public.pools where status = 'filling') -- View filling pools
);

-- Audit/Ledger: RESTRICTED
alter table public.protection_fund_ledger enable row level security;
-- No public access policies

alter table public.audit_logs enable row level security;
-- No public access policies

-- ============================================================
-- 8. REFERRALS
-- ============================================================

create type referral_status as enum ('pending', 'downloaded', 'registered', 'rewarded');

create table public.referrals (
    id uuid default uuid_generate_v4() primary key,
    referrer_id uuid references public.profiles(id) not null,
    referred_user_id uuid references public.profiles(id) not null,
    referral_code text not null,
    status referral_status default 'pending',
    created_at timestamptz default now(),
    completed_at timestamptz,
    
    unique(referrer_id, referred_user_id)
);

alter table public.referrals enable row level security;
create policy "Users can view own referrals" on public.referrals for select using (auth.uid() = referrer_id);
create policy "Users can view if they were referred" on public.referrals for select using (auth.uid() = referred_user_id);

-- ============================================================
-- FUNCTIONS (RPCs)
-- ============================================================

-- Function to atomically process a wallet transaction
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
$$;

-- ============================================================
-- 9. PRIVATE POOLS & INVITES
-- ============================================================

-- Pool Invites
create table public.pool_invites (
    id uuid default uuid_generate_v4() primary key,
    pool_id uuid references public.pools(id) not null,
    inviter_id uuid references public.profiles(id) not null,
    invitee_id uuid references public.profiles(id) not null,
    status text default 'pending', -- pending, accepted, rejected
    created_at timestamptz default now()
);

alter table public.pool_invites enable row level security;
create policy "Users can view invites addressed to them" on public.pool_invites for select using (auth.uid() = invitee_id);
create policy "Users can view invites they sent" on public.pool_invites for select using (auth.uid() = inviter_id);
create policy "Users can create invites for their pools" on public.pool_invites for insert with check (auth.uid() = inviter_id);
create policy "Users can update their own invites" on public.pool_invites for update using (auth.uid() = invitee_id or auth.uid() = inviter_id);

-- Private Pool Requests
create table public.private_pool_requests (
    id uuid default uuid_generate_v4() primary key,
    creator_id uuid references public.profiles(id) not null,
    tier pool_tier not null,
    requested_at timestamptz default now(),
    status text default 'pending'
);

alter table public.private_pool_requests enable row level security;
create policy "Users can view own requests" on public.private_pool_requests for select using (auth.uid() = creator_id);
create policy "Users can create requests" on public.private_pool_requests for insert with check (auth.uid() = creator_id);
