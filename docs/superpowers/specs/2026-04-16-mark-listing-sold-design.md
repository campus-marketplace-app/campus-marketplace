# Mark Listing as Sold — Design Spec

**Date:** 2026-04-16  
**Status:** Approved

## Context

Sellers need a way to mark a listing as sold once a transaction completes. When this happens:
- The listing disappears from public search (home page)
- The seller can still see it in their own dashboard
- Users who wishlisted the item get a notification
- Users with an open conversation about the listing get a notification and can no longer send new messages

The frontend team owns the "Mark as Sold" button on the listing page. This spec covers only the backend function, the messaging guard, and the ChatPanel sold state in the messages UI.

---

## Scope

| Area | In Scope | Out of Scope |
|------|----------|--------------|
| `listings.ts` — `markListingAsSold` | ✅ | |
| `messaging.ts` — `sendMessage` guard | ✅ | |
| `ChatPanel.tsx` — sold banner + disabled input | ✅ | |
| Listing detail page / my-listings page | | ❌ (frontend team) |
| Notification bell component | | ❌ (no changes needed) |

---

## Backend: `markListingAsSold`

**File:** `apps/backend/src/services/listings.ts`

```typescript
export async function markListingAsSold(
  listingId: string,
  userId: string
): Promise<Listing>
```

**Steps:**
1. Fetch listing by `listingId` — throw `ListingNotFoundError` if missing
2. Verify `listing.user_id === userId` — throw `ListingPermissionError` if not owner
3. Throw `ListingAlreadySoldError` if `listing.status === "sold"`
4. Update `listings.status = "sold"` in Supabase
5. Query `wishlists` table: `SELECT user_id WHERE listing_id = listingId`
6. Query `conversation_participants` joined with `conversations`: get all `user_id`s for conversations where `conversations.listing_id = listingId`, excluding the seller (`user_id !== userId`)
7. Merge both arrays, deduplicate with a `Set`
8. Batch-insert into `notifications`: `type = "listing_sold"`, `payload = { listing_id: listingId, listing_title: listing.title }`
9. Return the updated listing

**New error class:**
```typescript
export class ListingAlreadySoldError extends Error {}
```

**No migration needed** — `notifications` table already has `type TEXT, payload JSONB`; `wishlists` and `conversations.listing_id` already exist.

**Auto-export:** `markListingAsSold` and `ListingAlreadySoldError` are picked up by the existing `export * from "./services/listings.js"` in `index.ts`.

---

## Backend: `sendMessage` guard

**File:** `apps/backend/src/services/messaging.ts`

At the top of the existing `sendMessage` function, before inserting the message:

1. Fetch the conversation to get `listing_id`
2. If `listing_id` is set, fetch `listings.status` for that listing
3. If status is `"sold"`, throw `ConversationLockedError`

**New error class:**
```typescript
export class ConversationLockedError extends Error {}
```

**Auto-export:** picked up by existing `export * from "./services/messaging.js"` in `index.ts`.

---

## Backend: Expose `listing_status` on `Conversation`

**File:** `apps/backend/src/services/messaging.ts`

The `Conversation` interface currently includes `listing_title` and `is_seller` but not listing status. Add `listing_status` so the frontend can read it without an extra fetch:

```typescript
// In the Conversation interface:
listing_status: ListingStatus | null;
```

Update the SQL in `getConversationsByUser` and `getConversation` to join `listings.status` alongside `listings.title`. If `listing_id` is null, `listing_status` is `null`.

---

## Frontend: ChatPanel sold state

**File:** `apps/web/src/components/ChatPanel.tsx`

The component already receives listing context (title, seller/buyer role). Add:

- If `conversation.listing_status === "sold"`, render a banner above the message input: *"This item has been sold"*
- Disable the message `<textarea>` and send button when banner is shown
- `listing_status` comes from the updated `Conversation` object — no new API call needed

---

## Notification Payload

```json
{
  "listing_id": "<uuid>",
  "listing_title": "Used MacBook Pro 14\""
}
```

The existing `notification-bell.tsx` already renders payload previews — `listing_title` will surface naturally as the notification description.

---

## Error Handling Summary

| Scenario | Error |
|----------|-------|
| Listing not found | `ListingNotFoundError` (existing) |
| Caller is not the seller | `ListingPermissionError` (existing) |
| Listing already sold | `ListingAlreadySoldError` (new) |
| Sending message on sold listing | `ConversationLockedError` (new) |

---

## Verification

1. Call `markListingAsSold(listingId, sellerId)` — verify listing status becomes `"sold"`
2. Call `searchListings()` — verify the sold listing no longer appears
3. Call `getListingsByUser(sellerId)` — verify the sold listing is still returned
4. Check `notifications` table — verify rows exist for all wishlisted users and conversation participants (excluding seller), with correct `type` and `payload`
5. Call `sendMessage` on a conversation linked to the sold listing — verify `ConversationLockedError` is thrown
6. Open the messages page as a buyer — verify the sold banner appears and the input is disabled
