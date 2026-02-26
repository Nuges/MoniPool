# MoniPool — Behavior Snapshot (Pre-Hardening Baseline)

> Captured: 2026-02-17 · Version: v1.0.0 (Phase 1 MVP — Frontend Only)
> Purpose: Document current behavior BEFORE any hardening changes.

---

## 1. Pool Join Flow (PoolService.findOrJoinPool)

### Current Behavior
1. Receives: `tier`, `poolCycle`, `userId`, `contributionFrequency`
2. Searches for a `filling` pool matching `tier` + `cycle` with `currentMembers < capacity`
3. If no match → creates new pool in next series number
4. Checks if user is already a member → returns pool if yes (idempotent)
5. Assigns `payoutSlot = currentMembers + 1`
6. Calculates `payoutDate` relative to `pool.startDate` or `Date.now()`
7. Pushes new `PoolMember` to pool, increments `currentMembers`
8. If `currentMembers >= capacity` (5):
   - Sets `status = 'locked'`
   - Sets `startDate = new Date()`
   - Recalculates all member payout dates from firm start date

### Known Gaps
- No trust score check before joining
- No guard against joining `locked`/`active`/`completed` pools
- `locked → active → completed` transitions not implemented
- Pool capacity is hardcoded to 5

---

## 2. Wallet Ledger (WalletService)

### Current Behavior
1. In-memory `Map<string, Wallet>` + `Transaction[]` ledger
2. `createWallet(userId)` → initializes with balance 0, NGN
3. `getWallet(userId)` → returns wallet or undefined
4. `getHistory(userId)` → filtered + sorted by timestamp desc
5. `processTransaction()`:
   - Validates: wallet exists, amount > 0
   - For `withdrawal`/`contribution`/`penalty`: checks `balance >= amount`
   - `deposit`/`payout` → adds to balance
   - All other types → subtracts from balance
   - Appends to ledger, updates wallet

### Known Gaps
- No idempotency (no duplicate reference check)
- No reference validation
- Transaction ID is `Math.random().toString(36).substr(2, 9)` — weak
- No reversal mechanism
- All data lost on process restart

---

## 3. Trust Score Calculation (ReputationService)

### Current Behavior
1. In-memory `Map<string, ReputationScore>`
2. Default new user: score 50, 0 successful cycles, 0 missed payments
3. Default eligibility: `['100k', '300k']` (restricted)
4. `updateScore(userId, newScore)` → updates score + recalculates eligibility
5. `canJoinTier(userId, tier)` → checks if tier is in user's eligibility list

### Eligibility Rules
- Score >= 80 → all tiers (100k, 300k, 500k, 800k, 1m)
- Score >= 60 → 100k, 300k, 500k
- Score < 60 → 100k, 300k only

### Known Gaps
- `canJoinTier()` is never called from the UI
- No mechanism to increment/decrement score based on behavior
- No score history or audit trail
- `successfulCycles` and `missedPayments` are tracked but never updated

---

## 4. Data Flow Summary

```
UI Screens → Mock Data (data/mockData.ts)  ← static, hardcoded
Services   → In-memory Maps/Arrays         ← runtime only, no persistence
Types      → Dual definitions              ← types.ts vs mockData.ts (conflicting)
Auth       → None                           ← always redirects to onboarding
```

This snapshot serves as the baseline. All post-hardening behavior must preserve or explicitly improve upon these documented behaviors.
