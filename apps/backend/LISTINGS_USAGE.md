# Listings — Frontend Usage Guide

> **Rule:** Never import from Supabase directly. Always use these functions from `@campus-marketplace/backend`.

---

## Quick Import

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
```

Import types as needed:
```ts
import type { Listing, ListingWithDetails, ItemDetails, ServiceDetails } from "@campus-marketplace/backend";
```

---

## What Gets Returned

### `Listing` — base listing object

```ts
{
  id: string            // listing UUID
  user_id: string       // seller's user UUID
  type: "item" | "service"
  title: string
  description: string
  price: number | null
  price_unit: string | null   // e.g. "/hr", "/month"
  category_id: string | null
  status: "draft" | "active" | "closed" | "sold" | "archived"
  location: string | null
  created_at: string    // ISO-8601 date string
  updated_at: string
}
```

### `ListingWithDetails` — full detail page object (extends `Listing`)

Everything in `Listing`, plus:

```ts
{
  item_details: {               // present when type === "item", otherwise null
    condition: "new" | "like_new" | "good" | "fair" | "poor"
    quantity: number
    expires_at: string | null   // ISO-8601, null = no expiry
  } | null

  service_details: {            // present when type === "service", otherwise null
    duration_minutes: number
    price_unit: string | null
    available_from: string | null   // "HH:MM:SS"
    available_to: string | null
  } | null

  images: Array<{
    id: string
    path: string
    alt_text: string | null
    order_no: number            // images are pre-sorted ascending
  }>

  tags: Array<{ id: string; name: string }>

  category_name: string | null  // plain string, e.g. "Textbooks"
}
```

---

## Functions

### `getListingById(id)` — fetch one listing (no details)

Use this for list/card views where you don't need images or tags.

```ts
const listing = await getListingById("listing-uuid");
```

**Input:** listing UUID string
**Returns:** `Listing`
**Throws:** if listing doesn't exist

---

### `getListingWithDetails(id)` — fetch one listing with everything

Use this for detail pages.

```ts
const listing = await getListingWithDetails("listing-uuid");

// Access item-specific fields
if (listing.type === "item" && listing.item_details) {
  listing.item_details.condition  // "good"
  listing.item_details.expires_at // "2026-06-01T00:00:00Z" or null
}

// Access service-specific fields
if (listing.type === "service" && listing.service_details) {
  listing.service_details.duration_minutes // 60
}

// Images are already sorted by display order
listing.images[0]?.path

// Flat array of tags
listing.tags // [{ id: "...", name: "Math" }]
```

**Input:** listing UUID string
**Returns:** `ListingWithDetails`
**Throws:** if listing doesn't exist

---

### `getListingsByUser(userId, status?)` — fetch a user's listings

Use this for a seller's dashboard or profile page.

```ts
// All listings regardless of status
const all = await getListingsByUser(session.user.id);

// Only active listings
const active = await getListingsByUser(session.user.id, "active");
```

**Input:**
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | `string` | yes | |
| `status` | `string` | no | omit to get all statuses |

**Returns:** `Listing[]` — sorted newest first, empty array if none found

---

### `searchListings(options?)` — search/filter the marketplace

Use this for the browse page and search bar.

```ts
// Basic keyword search (only returns active listings by default)
const results = await searchListings({ query: "graphing calculator" });

// With filters
const filtered = await searchListings({
  type: "item",
  max_price: 50,
  limit: 20,
  offset: 0,    // page 1
});

// Page 2
const page2 = await searchListings({ limit: 20, offset: 20 });
```

**Input — all fields optional:**
| Option | Type | Default | Notes |
|--------|------|---------|-------|
| `query` | `string` | — | keyword search against title + description |
| `type` | `"item" \| "service"` | — | |
| `status` | `string` | `"active"` | auto-applied for public browse |
| `category_id` | `string` | — | UUID |
| `min_price` | `number` | — | |
| `max_price` | `number` | — | |
| `user_id` | `string` | — | scope to one seller (also disables the active-only default) |
| `limit` | `number` | `50` | |
| `offset` | `number` | `0` | |

**Returns:** `Listing[]` — empty array if no matches

---

### `createListing(input)` — create a new listing

New listings start as `"draft"` by default. Call `updateListing` to publish.

```ts
const listing = await createListing({
  user_id: session.user.id,
  title: "TI-84 Plus Calculator",
  type: "item",
  price: 40,
  description: "Good condition, includes case",
});
```

**Input:**
| Field | Type | Required | Default |
|-------|------|----------|---------|
| `user_id` | `string` | **yes** | — |
| `title` | `string` | **yes** | — |
| `type` | `"item" \| "service"` | no | `"item"` |
| `description` | `string` | no | `""` |
| `price` | `number \| null` | no | `null` |
| `price_unit` | `string \| null` | no | `null` |
| `category_id` | `string \| null` | no | `null` |
| `status` | `string` | no | `"draft"` |
| `location` | `string \| null` | no | `null` |

**Returns:** `Listing` with the DB-generated `id`, `created_at`, `updated_at`

---

### `updateListing(id, userId, updates)` — edit a listing

Only the listing's owner can update it. Only pass the fields you want to change — everything else stays the same.

```ts
// Publish a draft
await updateListing(listing.id, session.user.id, { status: "active" });

// Update price and location
await updateListing(listing.id, session.user.id, { price: 35, location: "Library 2nd floor" });
```

**Input:**
| Param | Type | Required |
|-------|------|----------|
| `id` | `string` | yes |
| `userId` | `string` | yes |
| `updates.title` | `string` | no |
| `updates.description` | `string` | no |
| `updates.price` | `number \| null` | no |
| `updates.price_unit` | `string \| null` | no |
| `updates.category_id` | `string \| null` | no |
| `updates.status` | `string` | no |
| `updates.location` | `string \| null` | no |

**Returns:** Updated `Listing`
**Throws:** if you don't own the listing, or pass no fields at all

---

### `deleteListing(id, userId)` — remove a listing

Hides the listing from all queries. The data is not permanently deleted.
Only the listing's owner can delete it.

```ts
await deleteListing(listing.id, session.user.id);
```

**Input:** listing UUID, user UUID
**Returns:** nothing
**Throws:** if you don't own the listing

---

### `upsertItemDetails(listingId, userId, details)` — save item details

Call this after `createListing` for item-type listings. Can also be called again to update existing details.

```ts
await upsertItemDetails(listing.id, session.user.id, {
  condition: "like_new",
  quantity: 1,
  expires_at: "2026-06-01T00:00:00Z", // optional, omit if no expiry
});
```

**Input:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `listingId` | `string` | yes | |
| `userId` | `string` | yes | must own the listing |
| `details.condition` | `string` | **yes** | `"new"`, `"like_new"`, `"good"`, `"fair"`, or `"poor"` |
| `details.quantity` | `number` | **yes** | must be ≥ 1 |
| `details.expires_at` | `string \| null` | no | ISO-8601 timestamp |

**Returns:** `ItemDetails`

---

### `upsertServiceDetails(listingId, userId, details)` — save service details

Call this after `createListing` for service-type listings.

```ts
await upsertServiceDetails(listing.id, session.user.id, {
  duration_minutes: 60,
  price_unit: "/session",
  available_from: "09:00:00",
  available_to: "17:00:00",
});
```

**Input:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `listingId` | `string` | yes | |
| `userId` | `string` | yes | must own the listing |
| `details.duration_minutes` | `number` | **yes** | must be > 0 |
| `details.price_unit` | `string \| null` | no | e.g. `"/session"` |
| `details.available_from` | `string \| null` | no | `"HH:MM:SS"` |
| `details.available_to` | `string \| null` | no | `"HH:MM:SS"` |

**Returns:** `ServiceDetails`

---

## Full Example: Create and Publish an Item Listing

```ts
// Step 1 — create the listing (starts as draft)
const listing = await createListing({
  user_id: session.user.id,
  title: "Calculus Textbook 3rd Ed",
  type: "item",
  price: 25,
});

// Step 2 — save item-specific details
await upsertItemDetails(listing.id, session.user.id, {
  condition: "good",
  quantity: 1,
});

// Step 3 — publish
await updateListing(listing.id, session.user.id, { status: "active" });
```

---

## Error Handling

Every function throws on failure. Always wrap calls in `try/catch`:

```ts
try {
  const listing = await getListingById(id);
} catch (err) {
  console.error(err instanceof Error ? err.message : "Unknown error");
  // show error state in UI
}
```

Common errors:
| Error message | Cause |
|---------------|-------|
| `"Listing not found or you do not have permission to modify it"` | wrong owner or listing was deleted |
| `"Listing ID is required"` | passed an empty string |
| `"No fields provided to update"` | called `updateListing` with `{}` |
| `"Item quantity must be at least 1"` | passed `quantity: 0` |
