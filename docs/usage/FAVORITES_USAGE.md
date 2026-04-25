# Favorites — Usage Guide

> **Rule:** Never import `@supabase/supabase-js` in the frontend. Use `@campus-marketplace/backend`.

## Import

```ts
import { addFavorite, removeFavorite, getFavoritesByUser, isFavorited } from "@campus-marketplace/backend";
import type { Favorite } from "@campus-marketplace/backend";
```

## Types

```ts
interface Favorite {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
  listing_title?: string;      // joined from listings table
  listing_price?: number | null; // joined from listings table
}
```

---

## addFavorite(userId, listingId) — favorite a listing

```ts
const favorite = await addFavorite(myUserId, listingId);
```

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | `string` | yes | your user ID |
| `listingId` | `string` | yes | the listing to favorite |

**Returns:** `Favorite` — if already favorited, returns the existing row (no duplicate created)
**Throws:** if the listing doesn't exist or has been deleted

---

## removeFavorite(userId, listingId) — unfavorite a listing

```ts
await removeFavorite(myUserId, listingId);
```

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | `string` | yes | your user ID |
| `listingId` | `string` | yes | the listing to unfavorite |

**Returns:** nothing. Does nothing if the favorite doesn't exist (safe to call anytime).

---

## getFavoritesByUser(userId) — load all favorites for the "My Favorites" page

```ts
const favorites = await getFavoritesByUser(myUserId);
```

**Input:** `string` — your user ID
**Returns:** `Favorite[]` — sorted newest-first, includes listing title and price. Empty array if no favorites.

---

## isFavorited(userId, listingId) — check if a listing is favorited (for the heart icon)

```ts
const hearted = await isFavorited(myUserId, listingId);
```

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | `string` | yes | your user ID |
| `listingId` | `string` | yes | the listing to check |

**Returns:** `boolean` — `true` if favorited, `false` otherwise

---

## Error Handling

All functions throw on failure. Wrap calls in `try/catch`:

```ts
try {
  await addFavorite(myUserId, listingId);
} catch (err) {
  console.error(err instanceof Error ? err.message : "Unknown error");
}
```

## Source

- `apps/backend/src/services/favorites.ts`
