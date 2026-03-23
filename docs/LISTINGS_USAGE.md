# Listings — Usage Guide

> **Rule:** Never import `@supabase/supabase-js` in the frontend. Use `@campus-marketplace/backend`.

## Import

```ts
import {
  getListingById,
  getListingWithDetails,
  getListingsByUser,
  searchListings,
  createListing,
  updateListing,
  deleteListing,
  upsertItemDetails,
  upsertServiceDetails,
} from "@campus-marketplace/backend";
import type { Listing, ListingWithDetails, ItemDetails, ServiceDetails } from "@campus-marketplace/backend";
```

## Types

```ts
interface Listing {
  id: string
  user_id: string
  type: "item" | "service"
  title: string
  description: string
  price: number | null
  price_unit: string | null   // e.g. "/hr", "/month"
  category_id: string | null
  status: "draft" | "active" | "closed" | "sold" | "archived"
  location: string | null
  created_at: string          // ISO-8601
  updated_at: string
}

// ListingWithDetails extends Listing with:
{
  item_details: {
    condition: "new" | "like_new" | "good" | "fair" | "poor"
    quantity: number
    expires_at: string | null
  } | null                    // null when type === "service"

  service_details: {
    duration_minutes: number
    price_unit: string | null
    available_from: string | null  // "HH:MM:SS"
    available_to: string | null
  } | null                    // null when type === "item"

  images: Array<{
    id: string
    path: string
    alt_text: string | null
    order_no: number          // pre-sorted ascending
  }>

  tags: Array<{ id: string; name: string }>
  category_name: string | null
}
```

---

## getListingById(id) — fetch one listing without details

Use for list/card views where images and tags aren't needed.

```ts
const listing = await getListingById("listing-uuid");
```

**Input:** `string` — listing UUID
**Returns:** `Listing`
**Throws:** if listing doesn't exist

---

## getListingWithDetails(id) — fetch one listing with everything

Use for detail pages.

```ts
const listing = await getListingWithDetails("listing-uuid");
listing.images[0]?.path        // pre-sorted by order_no
listing.tags                   // [{ id, name }]
listing.item_details?.condition
listing.service_details?.duration_minutes
```

**Input:** `string` — listing UUID
**Returns:** `ListingWithDetails`
**Throws:** if listing doesn't exist

---

## getListingsByUser(userId, status?) — fetch a user's listings

Use for seller dashboards or profile pages.

```ts
const all = await getListingsByUser(session.user.id);
const active = await getListingsByUser(session.user.id, "active");
```

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | `string` | yes | |
| `status` | `string` | no | omit to get all statuses |

**Returns:** `Listing[]` — sorted newest first, empty array if none
**Throws:** if `userId` is empty

---

## searchListings(options?) — search and filter the marketplace

```ts
const results = await searchListings({ query: "graphing calculator" });
const filtered = await searchListings({ type: "item", max_price: 50, limit: 20, offset: 0 });
const page2 = await searchListings({ limit: 20, offset: 20 });
```

| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `query` | `string` | no | — | searches title + description |
| `type` | `"item" \| "service"` | no | — | |
| `status` | `string` | no | `"active"` | auto-applied for public browse |
| `category_id` | `string` | no | — | UUID |
| `min_price` | `number` | no | — | |
| `max_price` | `number` | no | — | |
| `user_id` | `string` | no | — | scope to one seller; also disables the active-only default |
| `limit` | `number` | no | `50` | |
| `offset` | `number` | no | `0` | for pagination |

**Returns:** `Listing[]` — empty array if no matches

---

## createListing(input) — create a new listing

New listings start as `"draft"`. Call `updateListing` to publish.

```ts
const listing = await createListing({
  user_id: session.user.id,
  title: "TI-84 Plus Calculator",
  type: "item",
  price: 40,
  description: "Good condition, includes case",
});
```

| Param | Type | Required | Default |
|-------|------|----------|---------|
| `user_id` | `string` | yes | — |
| `title` | `string` | yes | — |
| `type` | `"item" \| "service"` | no | `"item"` |
| `description` | `string` | no | `""` |
| `price` | `number \| null` | no | `null` |
| `price_unit` | `string \| null` | no | `null` |
| `category_id` | `string \| null` | no | `null` |
| `status` | `string` | no | `"draft"` |
| `location` | `string \| null` | no | `null` |

**Returns:** `Listing` with DB-generated `id`, `created_at`, `updated_at`

---

## updateListing(id, userId, updates) — edit a listing

Only the owner can update. Pass only the fields you want to change.

```ts
await updateListing(listing.id, session.user.id, { status: "active" });
await updateListing(listing.id, session.user.id, { price: 35, location: "Library 2nd floor" });
```

| Param | Type | Required |
|-------|------|----------|
| `id` | `string` | yes |
| `userId` | `string` | yes |
| `updates.*` | any `Listing` field except `id` and `user_id` | at least one |

**Returns:** updated `Listing`
**Throws:** if you don't own the listing, or no fields are provided

---

## deleteListing(id, userId) — soft-delete a listing

Hides the listing from all queries. Data is not permanently removed.

```ts
await deleteListing(listing.id, session.user.id);
```

**Input:** `id: string`, `userId: string`
**Returns:** `void`
**Throws:** if you don't own the listing

---

## upsertItemDetails(listingId, userId, details) — save item-specific details

Call after `createListing` for `type: "item"` listings. Safe to call again to update.

```ts
await upsertItemDetails(listing.id, session.user.id, {
  condition: "like_new",
  quantity: 1,
  expires_at: "2026-06-01T00:00:00Z", // omit if no expiry
});
```

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `listingId` | `string` | yes | |
| `userId` | `string` | yes | must own the listing |
| `details.condition` | `string` | yes | `"new"`, `"like_new"`, `"good"`, `"fair"`, `"poor"` |
| `details.quantity` | `number` | yes | must be ≥ 1 |
| `details.expires_at` | `string \| null` | no | ISO-8601 |

**Returns:** `ItemDetails`

---

## upsertServiceDetails(listingId, userId, details) — save service-specific details

Call after `createListing` for `type: "service"` listings.

```ts
await upsertServiceDetails(listing.id, session.user.id, {
  duration_minutes: 60,
  price_unit: "/session",
  available_from: "09:00:00",
  available_to: "17:00:00",
});
```

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `listingId` | `string` | yes | |
| `userId` | `string` | yes | must own the listing |
| `details.duration_minutes` | `number` | yes | must be > 0 |
| `details.price_unit` | `string \| null` | no | e.g. `"/session"` |
| `details.available_from` | `string \| null` | no | `"HH:MM:SS"` |
| `details.available_to` | `string \| null` | no | `"HH:MM:SS"` |

**Returns:** `ServiceDetails`

---

## Error Handling

All functions throw on failure. Wrap calls in `try/catch`:

```ts
try {
  const listing = await getListingById(id);
} catch (err) {
  console.error(err instanceof Error ? err.message : "Unknown error");
}
```

Common errors:
| Message | Cause |
|---------|-------|
| `"Listing not found or you do not have permission to modify it"` | wrong owner or deleted |
| `"Listing ID is required"` | empty string passed |
| `"No fields provided to update"` | `updateListing` called with `{}` |
| `"Item quantity must be at least 1"` | `quantity: 0` passed |

## Source

- `apps/backend/src/services/listings.ts`
- `apps/backend/src/services/listings.types.ts`
