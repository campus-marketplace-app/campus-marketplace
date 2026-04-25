# Notifications — Usage Guide

> **Rule:** Never import `@supabase/supabase-js` in the frontend. Use `@campus-marketplace/backend`.

## Import

```ts
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@campus-marketplace/backend";
import type { Notification } from "@campus-marketplace/backend";
```

## Types

```ts
interface Notification {
  id: string;
  user_id: string;
  type: string;                      // e.g. "new_message", "listing_sold"
  payload: Record<string, unknown>;  // extra data, shape depends on type
  is_read: boolean;
  read_at: string | null;
  created_at: string;                // ISO-8601
}
```

---

## getNotifications(userId) — load all notifications

```ts
const notifications = await getNotifications(myUserId);
```

**Input:** `string` — your user ID
**Returns:** `Notification[]` — sorted newest-first. Empty array if none exist.

---

## markNotificationRead(notificationId, userId) — mark one as read

```ts
await markNotificationRead(notificationId, myUserId);
```

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `notificationId` | `string` | yes | which notification |
| `userId` | `string` | yes | your user ID (ownership check) |

**Returns:** nothing
**Throws:** if the notification doesn't exist or doesn't belong to you

---

## markAllNotificationsRead(userId) — mark everything as read

```ts
await markAllNotificationsRead(myUserId);
```

**Input:** `string` — your user ID
**Returns:** nothing. Does nothing if there are no unread notifications (safe to call anytime).

---

## deleteNotification(notificationId, userId) — permanently delete one

```ts
await deleteNotification(notificationId, myUserId);
```

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `notificationId` | `string` | yes | which notification |
| `userId` | `string` | yes | your user ID (ownership check) |

**Returns:** nothing
**Throws:** if the notification doesn't exist or doesn't belong to you

---

## Error Handling

All functions throw on failure. Wrap calls in `try/catch`:

```ts
try {
  const notifications = await getNotifications(myUserId);
} catch (err) {
  console.error(err instanceof Error ? err.message : "Unknown error");
}
```

## Source

- `apps/backend/src/services/notifications.ts`
