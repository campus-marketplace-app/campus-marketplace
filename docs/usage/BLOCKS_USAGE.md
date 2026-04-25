# Blocks — Usage Guide

> **Rule:** Never import `@supabase/supabase-js` in the frontend. Use `@campus-marketplace/backend`.

## Import

```ts
import { blockUser, unblockUser, getBlockedUsers, isBlocked } from "@campus-marketplace/backend";
import type { Block } from "@campus-marketplace/backend";
```

## Types

```ts
interface Block {
  id: string;
  user_id: string;          // who did the blocking
  blocked_user_id: string;  // who got blocked
  created_at: string;       // ISO-8601
}
```

---

## blockUser(userId, blockedUserId) — block a user

```ts
const block = await blockUser(myUserId, otherUserId);
```

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | `string` | yes | your user ID |
| `blockedUserId` | `string` | yes | the user to block |

**Returns:** `Block` — if already blocked, returns the existing row (no duplicate)
**Throws:** if you try to block yourself

---

## unblockUser(userId, blockedUserId) — unblock a user

```ts
await unblockUser(myUserId, otherUserId);
```

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | `string` | yes | your user ID |
| `blockedUserId` | `string` | yes | the user to unblock |

**Returns:** nothing. Does nothing if the block doesn't exist (safe to call anytime).

---

## getBlockedUsers(userId) — list all blocked users

```ts
const blocks = await getBlockedUsers(myUserId);
```

**Input:** `string` — your user ID
**Returns:** `Block[]` — sorted newest-first. Empty array if no one is blocked.

---

## isBlocked(userId, targetUserId) — check if you've blocked someone

```ts
const blocked = await isBlocked(myUserId, otherUserId);
```

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | `string` | yes | your user ID |
| `targetUserId` | `string` | yes | the user to check |

**Returns:** `boolean` — `true` if blocked, `false` otherwise

---

## Error Handling

All functions throw on failure. Wrap calls in `try/catch`:

```ts
try {
  await blockUser(myUserId, otherUserId);
} catch (err) {
  console.error(err instanceof Error ? err.message : "Unknown error");
}
```

## Source

- `apps/backend/src/services/blocks.ts`
