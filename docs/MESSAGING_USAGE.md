# Messaging RLS Validation (CM-US-047)

This document captures the schema and row-level security smoke checks required by **CM-US-047 — Messaging schema + RLS validation smoke checks**.

## Scope

This story validates database safety for frontend integration:
- messaging tables exist with expected constraints
- only conversation participants can read/insert messages
- spoofed `sender_id` inserts are rejected

This story does **not** implement `apps/backend/src/services/messaging.ts` service functions.

## Schema and Policy Sources

Core schema and messaging policy migrations:
- `supabase/migrations/20260315120000_core_tables.sql`
- `supabase/migrations/20260318000001_add_rls_conversations_messages.sql`
- `supabase/migrations/20260324234003_add_missing_messaging_rls.sql`
- `supabase/migrations/20260324234121_fix_conversation_participants_rls_recursion.sql`
- `supabase/migrations/20260324234355_fix_conversation_participants_insert_rls.sql`
- `supabase/migrations/20260324234903_add_is_user_participant_fn.sql`

## Acceptance Criteria Traceability

### AC1: Tables exist with constraints
Validated by smoke tests in:
- `apps/backend/src/services/__tests__/messages.smoke.test.ts`

Coverage includes:
- table availability checks for `conversations`, `conversation_participants`, `messages`
- unique constraint on `(conversation_id, user_id)` in `conversation_participants`
- FK constraints for:
  - `conversations.listing_id`
  - `conversation_participants.user_id`
  - `messages.conversation_id`
  - `messages.sender_id`

### AC2: Only participants can read and insert messages
Validated by smoke tests in:
- `apps/backend/src/services/__tests__/messages.smoke.test.ts`

Coverage includes:
- participant can read messages in their conversation
- non-participant read returns no rows under RLS
- participant insert succeeds only when policy checks pass
- non-participant insert is rejected by RLS

### AC3: Spoofed `sender_id` is rejected
Validated by smoke test:
- `rejects spoofed sender_id on insert`

Behavior:
- insert where `sender_id != auth.uid()` is rejected by `messages_insert_as_sender` policy.

## Policy Behavior Notes

- `messages` SELECT is participant-scoped through participant helper checks.
- `messages` INSERT requires all of:
  - authenticated user (`auth.uid()` present)
  - `sender_id = auth.uid()`
  - active participation in target conversation
- `conversation_participants` includes `left_at`; active participation checks rely on `left_at IS NULL`.

## How to Run Smoke Checks

From repo root:

```bash
npm run test --workspace=apps/backend -- messages.smoke.test.ts
```

Recommended companion checks:

```bash
npm run lint --workspace=apps/backend
npm run typecheck --workspace=apps/backend
```
