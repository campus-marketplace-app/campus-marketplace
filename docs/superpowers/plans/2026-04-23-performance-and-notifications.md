# Performance & Notifications Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix N+1 conversation queries, move notifications into React Query, clear the bell when you read messages, and add wishlist-sold notifications.

**Architecture:** Backend batches all per-conversation queries into two `Promise.all` rounds. Notifications become a React Query resource (mirroring `useConversations`) so any page can invalidate the cache directly. A new Postgres trigger fires when a listing flips to `sold` and inserts notifications for wishlisting users. The bell reads and marks state through the shared cache rather than local `useState`.

**Tech Stack:** TypeScript, Supabase JS client, React Query (`@tanstack/react-query`), React 19, Vite 8

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/20260423120000_notify_wishlist_item_sold.sql` | Create | DB trigger: insert notifications when listing sold |
| `apps/backend/src/services/notifications.ts` | Modify | Add `markConversationNotificationsRead` |
| `apps/backend/src/services/messaging.ts` | Modify | Batch `getConversationsByUser` (N+1 → 5 queries) |
| `apps/web/src/hooks/useNotifications.ts` | Create | React Query hook + invalidation helper |
| `apps/web/src/layouts/sidebar-layout.tsx` | Modify | Use hook, remove manual state, fix deps, fix nav |
| `apps/web/src/pages/messages.tsx` | Modify | Mark notifications read on open, remove dead code |
| `apps/web/src/features/notification-bell.tsx` | Modify | CSS variables, per-type label text |

---

## Task 1: DB Migration — Wishlist-Sold Trigger

**Files:**
- Create: `supabase/migrations/20260423120000_notify_wishlist_item_sold.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260423120000_notify_wishlist_item_sold.sql
-- Notify users when a listing they wishlisted is marked as sold.

create or replace function public.notify_wishlist_item_sold()
returns trigger language plpgsql security definer as $$
begin
  -- Only fire when status transitions TO 'sold'.
  if new.status = 'sold' and (old.status is distinct from 'sold') then
    insert into public.notifications (user_id, type, payload)
    select
      w.user_id,
      'wishlist_item_sold',
      jsonb_build_object(
        'listing_id',    new.id,
        'listing_title', new.title,
        'seller_id',     new.user_id
      )
    from public.wishlists w
    where w.listing_id = new.id
      and w.user_id != new.user_id;  -- don't notify the seller
  end if;

  return new;
end;
$$;

create trigger on_listing_sold
  after update on public.listings
  for each row
  execute function public.notify_wishlist_item_sold();
```

- [ ] **Step 2: Verify the file was created**

```bash
ls supabase/migrations/ | grep notify_wishlist
```
Expected: `20260423120000_notify_wishlist_item_sold.sql`

- [ ] **Step 3: Apply locally via Supabase CLI (if CLI is available)**

```bash
supabase db push
```

If the CLI isn't installed, this migration will be applied when the project is next synced. The trigger is idempotent (`create or replace function`) so it's safe to apply multiple times.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260423120000_notify_wishlist_item_sold.sql
git commit -m "feat: notify wishlisting users when a listing is marked sold"
```

---

## Task 2: Backend — Batch `getConversationsByUser`

**Files:**
- Modify: `apps/backend/src/services/messaging.ts`

- [ ] **Step 1: Replace the `getConversationsByUser` function body**

Open `apps/backend/src/services/messaging.ts`. Replace the entire `getConversationsByUser` function (currently lines 218–296) with the batched version below. The function signature stays identical — only the internals change.

```typescript
// Get all conversations for a user, sorted newest-first.
// Includes the other user's display name, last message preview, and unread count.
// Uses two parallel query rounds instead of N×4 sequential queries.
export async function getConversationsByUser(userId: string): Promise<Conversation[]> {
  if (!userId.trim()) throw new Error("User ID is required");

  // Get all conversation IDs the user participates in.
  const { data: participations, error: partError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId)
    .is("left_at", null);

  if (partError) throw new Error(`Failed to fetch conversations: ${partError.message}`);
  if (!participations || participations.length === 0) return [];

  const convoIds = participations.map((r: { conversation_id: string }) => r.conversation_id);

  // Fetch the conversation rows.
  const { data: convos, error: convoError } = await supabase
    .from("conversations")
    .select("id,listing_id,created_at,updated_at")
    .in("id", convoIds)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (convoError) throw new Error(`Failed to fetch conversations: ${convoError.message}`);
  if (!convos || convos.length === 0) return [];

  const listingIds = [
    ...new Set(
      convos
        .map((c: { listing_id: string | null }) => c.listing_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  // Round 1 — four parallel queries, all need only convoIds or listingIds.
  const [
    { data: allParticipants },
    { data: allLastMsgs },
    { data: allUnreadMsgs },
    { data: allListings },
  ] = await Promise.all([
    // Other participant per conversation.
    supabase
      .from("conversation_participants")
      .select("conversation_id,user_id")
      .in("conversation_id", convoIds)
      .is("left_at", null)
      .neq("user_id", userId),

    // Latest message per conversation (deduplicated client-side).
    supabase
      .from("messages")
      .select("conversation_id,content")
      .in("conversation_id", convoIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),

    // Unread messages per conversation (counted client-side).
    supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", convoIds)
      .neq("sender_id", userId)
      .eq("is_read", false)
      .is("deleted_at", null),

    // Listing info for all referenced listings.
    listingIds.length > 0
      ? supabase
          .from("listings")
          .select("id,title,user_id,status")
          .in("id", listingIds)
      : Promise.resolve({ data: [] as { id: string; title: string; user_id: string; status: ListingStatus }[] }),
  ]);

  // Round 2 — profiles for other participants (needs Round 1 result).
  const otherUserIds = [
    ...new Set((allParticipants ?? []).map((p: { user_id: string }) => p.user_id)),
  ];

  const { data: profilesData } = otherUserIds.length > 0
    ? await supabase
        .from("profiles")
        .select("user_id,display_name,avatar_path")
        .in("user_id", otherUserIds)
    : { data: [] as { user_id: string; display_name: string | null; avatar_path: string | null }[] };

  // Build lookup maps — O(n) assembly, no more awaits.
  const otherUserIdByConvoId = new Map<string, string>(
    (allParticipants ?? []).map(
      (p: { conversation_id: string; user_id: string }) => [p.conversation_id, p.user_id],
    ),
  );

  const lastMsgByConvoId = new Map<string, string>();
  for (const msg of (allLastMsgs ?? []) as { conversation_id: string; content: string }[]) {
    if (!lastMsgByConvoId.has(msg.conversation_id)) {
      lastMsgByConvoId.set(msg.conversation_id, msg.content);
    }
  }

  const unreadCountByConvoId = new Map<string, number>();
  for (const msg of (allUnreadMsgs ?? []) as { conversation_id: string }[]) {
    unreadCountByConvoId.set(
      msg.conversation_id,
      (unreadCountByConvoId.get(msg.conversation_id) ?? 0) + 1,
    );
  }

  const profileByUserId = new Map(
    (profilesData ?? []).map(
      (p: { user_id: string; display_name: string | null; avatar_path: string | null }) => [
        p.user_id,
        { displayName: p.display_name ?? undefined, avatarPath: p.avatar_path },
      ],
    ),
  );

  const listingByListingId = new Map(
    (allListings ?? []).map(
      (l: { id: string; title: string; user_id: string; status: ListingStatus }) => [l.id, l],
    ),
  );

  // Assemble — plain loop, zero awaits.
  const results: Conversation[] = [];
  for (const convo of convos) {
    const otherId = otherUserIdByConvoId.get(convo.id);
    if (!otherId) continue;

    const profile = profileByUserId.get(otherId);
    const listingInfo = convo.listing_id ? listingByListingId.get(convo.listing_id) : null;

    results.push({
      id: convo.id,
      listing_id: convo.listing_id,
      created_at: convo.created_at,
      updated_at: convo.updated_at,
      other_user_id: otherId,
      other_user_display_name: profile?.displayName,
      other_user_avatar_path: profile?.avatarPath,
      last_message: lastMsgByConvoId.get(convo.id),
      unread_count: unreadCountByConvoId.get(convo.id) ?? 0,
      listing_title: listingInfo?.title,
      is_seller: listingInfo ? listingInfo.user_id === userId : undefined,
      listing_status: listingInfo?.status ?? null,
    });
  }

  return results;
}
```

- [ ] **Step 2: Type-check**

```bash
npm run typecheck --workspace=apps/backend
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/services/messaging.ts
git commit -m "perf: batch getConversationsByUser from N×4 queries to 5 total"
```

---

## Task 3: Backend — `markConversationNotificationsRead`

**Files:**
- Modify: `apps/backend/src/services/notifications.ts`

- [ ] **Step 1: Add the new function at the end of `notifications.ts`**

Insert after the `subscribeToNotifications` function (after line 149):

```typescript
// Mark all unread new_message notifications for a conversation as read.
// Called when the user opens that conversation so the bell clears automatically.
export async function markConversationNotificationsRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  if (!conversationId.trim()) throw new Error("Conversation ID is required");
  if (!userId.trim()) throw new Error("User ID is required");

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("type", "new_message")
    .eq("is_read", false)
    .filter("payload->>'conversation_id'", "eq", conversationId);

  if (error) {
    throw new Error(`Failed to mark conversation notifications read: ${error.message}`);
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npm run typecheck --workspace=apps/backend
```
Expected: no errors.

- [ ] **Step 3: Verify the export is visible**

`apps/backend/src/index.ts` uses `export * from "./services/notifications.js"` so the new function is auto-exported. Confirm with:

```bash
grep "markConversationNotificationsRead" apps/backend/src/services/notifications.ts
```
Expected: one match — the function definition.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/services/notifications.ts
git commit -m "feat: add markConversationNotificationsRead to clear bell on conversation open"
```

---

## Task 4: Frontend — `useNotifications` Hook

**Files:**
- Create: `apps/web/src/hooks/useNotifications.ts`

- [ ] **Step 1: Create the hook file**

```typescript
// apps/web/src/hooks/useNotifications.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getNotifications } from '@campus-marketplace/backend';

/** 60-second stale time — realtime subscription handles live updates. */
const NOTIFICATIONS_STALE_TIME = 60 * 1000;

export const notificationKeys = {
  all: ['notifications'] as const,
  byUser: (userId: string) => ['notifications', 'byUser', userId] as const,
};

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: notificationKeys.byUser(userId ?? ''),
    queryFn: () => getNotifications(userId!),
    staleTime: NOTIFICATIONS_STALE_TIME,
    enabled: !!userId,
  });
}

export function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return {
    invalidate: (userId: string) =>
      queryClient.invalidateQueries({ queryKey: notificationKeys.byUser(userId) }),
  };
}
```

- [ ] **Step 2: Type-check**

```bash
npm run typecheck --workspace=apps/web
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/useNotifications.ts
git commit -m "feat: add useNotifications React Query hook"
```

---

## Task 5: Frontend — `sidebar-layout.tsx` Refactor

**Files:**
- Modify: `apps/web/src/layouts/sidebar-layout.tsx`

- [ ] **Step 1: Update the imports**

At the top of `sidebar-layout.tsx`, make these changes:

Remove from the `@campus-marketplace/backend` import:
```
getNotifications,
```

Add these two new import lines after the existing hook imports:
```typescript
import { useNotifications, useInvalidateNotifications, notificationKeys } from '../hooks/useNotifications';
import { useQueryClient } from '@tanstack/react-query';
```

`Notification` is already imported from `@campus-marketplace/backend` — do not add a duplicate. Also remove `getNotifications` from that same existing import line (it will no longer be called directly).

- [ ] **Step 2: Replace `notifications` state with React Query**

Remove this line from the component:
```typescript
const [notifications, setNotifications] = useState<Notification[]>([]);
```

Add these lines after the `useTheme` destructure:
```typescript
const queryClient = useQueryClient();
const { data: notifications = [] } = useNotifications(user?.id);
const { invalidate: invalidateNotifications } = useInvalidateNotifications();
```

- [ ] **Step 3: Update `handleMarkAllRead` — replace `setNotifications` with cache invalidation**

Replace the existing `handleMarkAllRead` function:

```typescript
const handleMarkAllRead = async () => {
    if (!user) return;
    try {
        await markAllNotificationsRead(user.id);
        invalidateNotifications(user.id);
    } catch (error) {
        console.error("Failed to mark all notifications read:", error);
    }
};
```

- [ ] **Step 4: Update `handleNotificationClick` — replace `setNotifications` with cache invalidation, add type-based navigation**

Replace the existing `handleNotificationClick` function:

```typescript
const handleNotificationClick = async (n: Notification) => {
    if (!user) return;
    try {
        if (!n.is_read) {
            await markNotificationRead(n.id, user.id);
            invalidateNotifications(user.id);
        }
        const payload = n.payload as Record<string, unknown>;
        if (n.type === 'wishlist_item_sold' && payload.listing_id) {
            navigate(`/listing/${String(payload.listing_id)}`);
        } else {
            navigate('/messages');
        }
    } catch (error) {
        console.error("Failed to handle notification click:", error);
        navigate('/messages');
    }
};
```

- [ ] **Step 5: Remove `getNotifications` call from `checkUserSession` and remove `location.pathname` from deps**

In the `checkUserSession` `useEffect`, find and delete this block (it appears after `setIsLoggedIn(true)`):
```typescript
const notifs = await getNotifications(user.id);
setNotifications(notifs);
```

Also remove `location.pathname` from the effect's dependency array. The array should now be:
```typescript
}, [profileRefreshKey, loadPrefsForUser]);
```

- [ ] **Step 6: Update the realtime subscription to warm the React Query cache**

Replace the existing `subscribeToNotifications` `useEffect`:

```typescript
useEffect(() => {
    if (!user) return;

    const { unsubscribe } = subscribeToNotifications(user.id, (newNotif) => {
        queryClient.setQueryData(
            notificationKeys.byUser(user.id),
            (prev: Notification[] | undefined) => [newNotif, ...(prev ?? [])],
        );
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.id]);
```

- [ ] **Step 7: Type-check**

```bash
npm run typecheck --workspace=apps/web
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/layouts/sidebar-layout.tsx
git commit -m "refactor: move notifications to React Query, fix route-change over-fetching"
```

---

## Task 6: Frontend — `messages.tsx` — Bell Fix + Dead Code Removal

**Files:**
- Modify: `apps/web/src/pages/messages.tsx`

- [ ] **Step 1: Update imports**

Add to the `@campus-marketplace/backend` import:
```
markConversationNotificationsRead,
```

Remove from the `@campus-marketplace/backend` import (it's only used by the dead code):
```
getListingWithDetails,
```

Add after the existing hook imports:
```typescript
import { useInvalidateNotifications } from '../hooks/useNotifications';
```

- [ ] **Step 2: Add `useInvalidateNotifications` to the component**

After the `useInvalidateConversations` line:
```typescript
const { invalidate: invalidateNotifications } = useInvalidateNotifications();
```

- [ ] **Step 3: Delete the dead `listingTitlesById` state and its `useEffect`**

Remove these lines entirely:
```typescript
const [listingTitlesById, setListingTitlesById] = useState<Record<string, string>>({});
```

Remove the entire `useEffect` that loads listing titles (it starts with `// --- fetch listing titles for conversations` and ends after the `void loadListingTitles();` block + cleanup — roughly lines 117–164 in the current file).

- [ ] **Step 4: Mark conversation notifications read when a conversation is opened**

In the `activeConversationId` `useEffect` (the one that calls `markMessagesRead`), add the notification marking call directly after the existing `markMessagesRead` line:

```typescript
// Mark incoming messages as read.
markMessagesRead(activeConversationId, user.id).catch(console.error);
// Clear the bell for this conversation.
markConversationNotificationsRead(activeConversationId, user.id)
    .then(() => invalidateNotifications(user.id))
    .catch(console.error);
```

Also add the same inside the realtime handler, where the existing code already marks messages read on new incoming message:

```typescript
if (newMsg.sender_id !== user.id) {
    markMessagesRead(activeConversationId, user.id).catch(console.error);
    markConversationNotificationsRead(activeConversationId, user.id)
        .then(() => invalidateNotifications(user.id))
        .catch(console.error);
}
```

- [ ] **Step 5: Type-check**

```bash
npm run typecheck --workspace=apps/web
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/messages.tsx
git commit -m "fix: clear notification bell when opening a conversation; remove dead listingTitlesById code"
```

---

## Task 7: Frontend — `notification-bell.tsx` Polish

**Files:**
- Modify: `apps/web/src/features/notification-bell.tsx`

- [ ] **Step 1: Add `getNotificationLabel` helper**

Add this function before the `NotificationBell` component definition:

```typescript
function getNotificationLabel(n: Notification): string {
  const payload = n.payload as Record<string, unknown>;
  switch (n.type) {
    case 'new_message':
      return String(payload.preview || 'New message');
    case 'wishlist_item_sold':
      return `${String(payload.listing_title || 'A wishlisted item')} has been sold`;
    default:
      return 'New notification';
  }
}
```

- [ ] **Step 2: Replace hardcoded colors with CSS variables**

Replace the dropdown container `div` className:
```
// Before:
"absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"

// After:
"absolute right-0 mt-2 w-80 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto border"
```
And add inline style to that same div:
```typescript
style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
```

Replace the sticky header `div` className:
```
// Before:
"sticky top-0 bg-white border-b border-gray-200 p-3 flex items-center justify-between"

// After:
"sticky top-0 border-b p-3 flex items-center justify-between"
```
Add inline style:
```typescript
style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
```

Replace the `h3` className:
```
// Before: "text-sm font-bold text-gray-800"
// After:  "text-sm font-bold"
```
Add inline style:
```typescript
style={{ color: 'var(--color-text)' }}
```

Replace the "No notifications yet" `div` className:
```
// Before: "p-6 text-center text-gray-500 text-sm"
// After:  "p-6 text-center text-sm"
```
Add inline style:
```typescript
style={{ color: 'var(--color-text-muted)' }}
```

Replace the `divide-y` container `div` className:
```
// Before: "divide-y divide-gray-100"
// After:  "divide-y divide-[var(--color-border)]"
```

Replace each notification `button` className:
```
// Before: "w-full text-left p-3 hover:bg-gray-50 transition-colors flex items-start gap-3"
// After:  "w-full text-left p-3 hover:bg-[var(--color-surface-alt)] transition-colors flex items-start gap-3"
```

Replace the preview text `p` className:
```
// Before: "text-xs text-gray-600 line-clamp-2"
// After:  "text-xs line-clamp-2"
```
Add inline style:
```typescript
style={{ color: 'var(--color-text-muted)' }}
```

Replace the timestamp `p` className:
```
// Before: "text-xs text-gray-400 mt-1"
// After:  "text-xs mt-1"
```
Add inline style:
```typescript
style={{ color: 'var(--color-text-muted)' }}
```

- [ ] **Step 3: Use `getNotificationLabel` in the notification list**

Replace this line inside the notification `button`:
```typescript
{String((n.payload as Record<string, unknown>)?.preview || 'New message')}
```
With:
```typescript
{getNotificationLabel(n)}
```

- [ ] **Step 4: Type-check**

```bash
npm run typecheck --workspace=apps/web
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/notification-bell.tsx
git commit -m "polish: use CSS variables in notification bell, add per-type label text"
```

---

## Final Verification

- [ ] **Run full type-check across all workspaces**

```bash
npm run typecheck
```
Expected: no errors in either workspace.

- [ ] **Run lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Manual smoke test — bell bug fix**
  1. Start dev server: `npm run dev`
  2. Log in as User A in one browser tab, User B in another (or incognito)
  3. Have User B send User A a message
  4. Check User A's bell — should show unread badge
  5. User A opens the Messages page and clicks the conversation
  6. Bell badge should disappear within a few seconds (React Query refetch)

- [ ] **Manual smoke test — wishlist-sold notification**
  1. User A wishlists a listing owned by User B
  2. User B marks that listing as complete/sold
  3. User A's bell should receive a new notification
  4. Clicking the notification should navigate to `/listing/<id>`

- [ ] **Manual smoke test — conversation list performance**
  1. Open browser DevTools → Network tab
  2. Navigate to Messages page
  3. Count Supabase requests — should be 5 (participants, messages desc, messages unread, listings, profiles), not one per conversation
