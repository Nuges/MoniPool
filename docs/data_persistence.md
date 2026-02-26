# MoniPool — Data Persistence Strategy

> **Documentation only — no code changes required.**
> Defines which entities are server-authoritative, which can be client-cached,
> and which actions must be transactional.

---

## Server-Authoritative Entities

These MUST be fetched from and persisted by the backend. The client should never
modify these without a confirmed server response.

| Entity | Reason |
|--------|--------|
| **Wallet balance** | Financial data — single source of truth on server |
| **Transaction ledger** | Append-only, tamper-proof — server-signed records |
| **Pool membership** | Determines payout order and contribution schedule |
| **Pool status/lifecycle** | `filling → locked → active → completed` — server-managed |
| **Trust/reputation score** | Must be computed server-side to prevent manipulation |
| **Referral records** | Reward eligibility verification requires server authority |
| **Payout schedule** | Determines who receives funds and when |
| **KYC status** | Identity verification is inherently server-only |

## Client-Cached Entities

These can be cached locally for performance and offline display, but always
refresh from the server when connectivity is available.

| Entity | Cache Strategy |
|--------|---------------|
| **User profile** | Cache after login, refresh on profile screen focus |
| **Tier definitions** | Cache indefinitely, update on app version change |
| **Pool list (overview)** | Cache with 30s TTL, refresh on screen focus |
| **Transaction history** | Cache last 50 transactions, paginate from server |
| **Notification list** | Cache locally, mark-as-read syncs to server |
| **Referral code/link** | Cache after first generation — code never changes |
| **Contribution breakdown** | Compute client-side from tier definitions (static math) |

## Transactional Actions (Must Be Atomic)

These operations MUST be processed as atomic transactions on the backend.
Partial completion is unacceptable.

| Action | Atomicity Requirement |
|--------|----------------------|
| **Pool join** | Create membership + reserve slot + deduct first contribution — all or nothing |
| **Contribution payment** | Debit wallet + record in pool ledger + update member status — rollback on any failure |
| **Payout disbursement** | Credit recipient wallet + update pool cycle + advance payout schedule |
| **Penalty application** | Debit penalty amount + reduce trust score + log reason — single transaction |
| **Wallet fund** | Credit wallet + record transaction + verify payment gateway confirmation |
| **Wallet withdrawal** | Verify balance + debit wallet + initiate bank transfer — hold until confirmed |
| **Referral reward** | Verify referral completion + credit wallet + update referral status |

## Conflict Resolution

| Scenario | Resolution |
|----------|-----------|
| Double pool join | Idempotency key — return existing membership |
| Double transaction | Reference field — reject with `DUPLICATE_REFERENCE` |
| Balance race condition | Optimistic locking with version field on wallet |
| Pool capacity overflow | Database constraint on member count + CHECK constraint |
| Stale trust score | Always fetch fresh before tier eligibility check |

## Migration Path

When transitioning from in-memory to backend:

1. Replace service method bodies with API calls to matching contract endpoints
2. Keep same method signatures — no UI changes needed
3. Add loading/error states to UI components (currently instant due to in-memory)
4. Add retry logic for transient failures (network timeouts)
5. Add offline queue for actions attempted without connectivity
