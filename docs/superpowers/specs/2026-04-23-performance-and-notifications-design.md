# Performance & Notifications Polish — Design Spec
**Date:** 2026-04-23

## Goals

1. Fix the N+1 query problem in `getConversationsByUser`
2. Move notifications into React Query (consistent with rest of caching system)
3. Fix the bell bug — unread badge persists after reading messages
4. Add wishlist-sold notification type
5. Remove dead code and notification over-fetching

---

## Section 1: Performance

### `getConversationsByUser` — batch query refactor

**Problem:** For each conversation the function runs 4–5 sequential `await`s (participant lookup, profile lookup, last message, unread count, listing info). With N conversations this is N×4–5 round trips.

**Fix:** Two parallel query rounds, then a plain Map-lookup assembly loop.

**Round 1** — all run in `Promise.all`, only need `convoIds`:
- `conversation_participants` — all other participants across all conversation IDs
- `messages` (newest-first, all convos) — last message per conversation, deduplicated client-side
- `messages` (unread only, all convos) — unread messages filtered by `sender_id != userId` and `is_read = false`, counted client-side per conversation ID
- `listings` — all listing rows for the listing IDs present in the conversation set

**Round 2** — one query, after Round 1:
- `profiles` — display name + avatar path for all other-participant user IDs collected in Round 1

**Assembly:** plain `for` loop, all data looked up from Maps — zero awaits.

**Result:** 5 queries total (4 parallel + 1), independent of conversation count.

### Notification over-fetching

**Problem:** `sidebar-layout.tsx`'s session-check `useEffect` has `location.pathname` in its dependency array. This causes `getNotifications` (and `getSessionFromTokens`) to re-run on every page navigation.

**Fix:** Moving notifications to React Query (Section 2) removes `getNotifications` from that effect entirely. `location.pathname` is removed from the deps — the session check runs once on mount and on explicit `profileRefreshKey` bumps only.

### Dead code removal

**Problem:** `messages.tsx` maintains a `listingTitlesById` state and a `useEffect` that fetches listing details and stores titles. The variable is never passed to any component — `Conversation` objects already include `listing_title` from the backend.

**Fix:** Delete the `listingTitlesById` useState, its `useEffect`, and the `getListingWithDetails` import (~45 lines).

---

## Section 2: Notifications → React Query + Bell Bug Fix

### New hook — `useNotifications`

**File:** `apps/web/src/hooks/useNotifications.ts`

Mirrors `useConversations.ts` in structure. Exports:
- `notificationKeys` — query key factory (`['notifications', 'byUser', userId]`)
- `useNotifications(userId)` — React Query fetch, 60s stale time (realtime handles live updates)
- `useInvalidateNotifications()` — returns `invalidate(userId)` helper

### `sidebar-layout.tsx` changes

- Remove `notifications` useState
- Remove `getNotifications` call from `checkUserSession`
- Remove `location.pathname` from session-check effect deps
- Consume `useNotifications(user?.id)` for the bell
- Realtime subscription: on new notification, call `queryClient.setQueryData` to prepend into cache (no extra round-trip)

### Bell bug fix — `markConversationNotificationsRead`

**New backend function** in `apps/backend/src/services/notifications.ts`:

```
markConversationNotificationsRead(conversationId: string, userId: string): Promise<void>
```

Marks all `new_message` notifications as read where:
- `user_id = userId`
- `type = 'new_message'`
- `is_read = false`
- `payload->>'conversation_id' = conversationId` (JSONB filter via Supabase `.filter()`)

Re-exported from `apps/backend/src/index.ts`.

**`messages.tsx` changes:**
- In the `activeConversationId` effect, after `markMessagesRead`, also call `markConversationNotificationsRead`
- Then call `invalidateNotifications(user.id)` so the bell re-fetches and clears

### Notification bell — CSS variables

Replace hardcoded Tailwind color classes in `notification-bell.tsx`:
- `bg-white` → `bg-[var(--color-surface)]`
- `border-gray-200` → `border-[var(--color-border)]`
- `text-gray-800` → `text-[var(--color-text)]`
- `text-gray-500/400/600` → `text-[var(--color-text-muted)]`
- `hover:bg-gray-50` → `hover:bg-[var(--color-surface-alt)]`
- `divide-gray-100` → `divide-[var(--color-border)]`

### Notification display text

Add a `getNotificationLabel(n: Notification): string` helper inside `notification-bell.tsx`:
- `new_message` → `payload.preview` or `'New message'` fallback
- `wishlist_item_sold` → `'[listing_title] has been sold'`
- unknown type → `'New notification'`

---

## Section 3: Wishlist-Sold Notification

### New DB migration

**File:** `supabase/migrations/20260423120000_notify_wishlist_item_sold.sql`

Trigger function `notify_wishlist_item_sold()` fires `AFTER UPDATE ON listings FOR EACH ROW WHEN (NEW.status = 'sold' AND OLD.status IS DISTINCT FROM 'sold')`.

For each row in `wishlists` where `listing_id = NEW.id AND user_id != NEW.user_id` (excludes seller), inserts a notification:
```json
{
  "type": "wishlist_item_sold",
  "payload": {
    "listing_id": "<id>",
    "listing_title": "<title>",
    "seller_id": "<seller user_id>"
  }
}
```

The existing `subscribeToNotifications` realtime channel in `sidebar-layout.tsx` already handles INSERT events — no frontend subscription changes needed.

### Click navigation

In `sidebar-layout.tsx`'s `handleNotificationClick`:
- `new_message` → navigate to `/messages` (existing behavior)
- `wishlist_item_sold` → navigate to `/listing/[payload.listing_id]`
- unknown → no navigation, just mark read

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20260423120000_notify_wishlist_item_sold.sql` | New — wishlist-sold trigger |
| `apps/backend/src/services/notifications.ts` | Add `markConversationNotificationsRead` |
| `apps/backend/src/services/messaging.ts` | Batch `getConversationsByUser` |
| `apps/backend/src/index.ts` | Re-export new notification function |
| `apps/web/src/hooks/useNotifications.ts` | New — React Query hook |
| `apps/web/src/layouts/sidebar-layout.tsx` | Use hook, remove manual state + over-fetching |
| `apps/web/src/pages/messages.tsx` | Call mark-read + invalidate, remove dead code |
| `apps/web/src/features/notification-bell.tsx` | CSS variables, per-type label |
