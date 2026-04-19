# Mark Listing as Sold — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `markListingAsSold` to the backend, guard `sendMessage` against sold listings, and show a sold banner in `ChatPanel`.

**Architecture:** `markListingAsSold` in `listings.ts` updates the listing status, then batch-notifies all wishlisted users and conversation participants (deduped). `sendMessage` in `messaging.ts` gains a guard that throws `ConversationLockedError` when the linked listing is sold. `Conversation` gets a `listing_status` field so `ChatPanel` can disable input without an extra fetch.

**Tech Stack:** TypeScript, Supabase JS client, Vitest (integration tests against real Supabase), React + Tailwind CSS

---

### Task 1: Add `ListingAlreadySoldError` and `markListingAsSold` to `listings.ts`

**Files:**
- Modify: `apps/backend/src/services/listings.ts` (after `unpublishListing` at line 408)

- [ ] **Step 1: Add the error class and function skeleton after `unpublishListing`**

Open `apps/backend/src/services/listings.ts`. After the `unpublishListing` function (line ~408), insert:

```typescript
/** Error thrown when attempting to mark a listing as sold that is already sold. */
export class ListingAlreadySoldError extends Error {
  readonly code = "LISTING_ALREADY_SOLD";

  constructor() {
    super("This listing is already marked as sold");
    this.name = "ListingAlreadySoldError";
  }
}

/**
 * Marks a listing as sold.
 *
 * Removes it from public search, keeps it visible to the seller,
 * and sends a listing_sold notification to all users who wishlisted it
 * or have an open conversation about it (excluding the seller).
 *
 * param listingId - UUID of the listing to mark as sold.
 * param userId - UUID of the seller (must own the listing).
 * returns The updated Listing record with status "sold".
 * throws ListingNotFoundError if the listing does not exist.
 * throws ListingPermissionError if the caller is not the owner.
 * throws ListingAlreadySoldError if already sold.
 */
export async function markListingAsSold(listingId: string, userId: string): Promise<Listing> {
  // 1. Verify ownership (throws if missing or wrong user)
  await verifyListingOwnership(listingId, userId);

  // 2. Fetch current status to guard against double-selling
  const listing = await getListingById(listingId);
  if (listing.status === "sold") {
    throw new ListingAlreadySoldError();
  }

  // 3. Update status to sold
  const { data: updated, error: updateError } = await supabase
    .from("listings")
    .update({ status: "sold" })
    .eq("id", listingId)
    .select(listingSelect)
    .single<ListingRow>();

  if (updateError || !updated) {
    throw new Error(`Failed to mark listing as sold: ${updateError?.message ?? "no data returned"}`);
  }

  // 4. Collect user IDs from wishlists
  const { data: wishlistRows } = await supabase
    .from("wishlists")
    .select("user_id")
    .eq("listing_id", listingId);

  const wishlistUserIds: string[] = (wishlistRows ?? []).map(
    (r: { user_id: string }) => r.user_id,
  );

  // 5. Collect user IDs from conversations linked to this listing (excluding seller)
  // Two-step: first find conversation IDs for this listing, then find participants.
  const { data: linkedConvos } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .is("deleted_at", null);

  const linkedConvoIds = (linkedConvos ?? []).map((r: { id: string }) => r.id);

  const conversationUserIds: string[] = [];
  if (linkedConvoIds.length > 0) {
    const { data: participantRows } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .in("conversation_id", linkedConvoIds)
      .neq("user_id", userId)
      .is("left_at", null);

    conversationUserIds.push(
      ...(participantRows ?? []).map((r: { user_id: string }) => r.user_id),
    );
  }

  // 6. Deduplicate and exclude the seller
  const notifyUserIds = [
    ...new Set([...wishlistUserIds, ...conversationUserIds].filter((id) => id !== userId)),
  ];

  // 7. Batch-insert notifications (skip if no one to notify)
  if (notifyUserIds.length > 0) {
    const notifications = notifyUserIds.map((notifyUserId) => ({
      user_id: notifyUserId,
      type: "listing_sold",
      payload: { listing_id: listingId, listing_title: listing.title },
    }));

    await supabase.from("notifications").insert(notifications);
  }

  return mapListingRow(updated);
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck --workspace=apps/backend
```

Expected: no errors

---

### Task 2: Write integration tests for `markListingAsSold`

**Files:**
- Modify: `apps/backend/src/services/__tests__/listings.test.ts`

- [ ] **Step 1: Add imports at the top of the test file**

In the import block at the top of `listings.test.ts`, add `markListingAsSold` and `ListingAlreadySoldError` to the existing import:

```typescript
import {
  // ...existing imports...
  markListingAsSold,
  ListingAlreadySoldError,
} from "../listings.js";
```

Also add a second test user variable near the top of the file (alongside `let testUser`):

```typescript
let secondUser: TestUser;
```

And in `beforeAll`, create it:

```typescript
secondUser = await createTestUser("Second Test User");
```

And in `afterAll`, clean it up:

```typescript
await secondUser.cleanup();
```

- [ ] **Step 2: Add the test suite**

Append at the bottom of `listings.test.ts`:

```typescript
describe("markListingAsSold", () => {
  it("sets status to sold and removes listing from public search", async () => {
    const listing = await createPublishableDraft(testUser.user.id);
    await publishListing(listing.id, testUser.user.id);

    const sold = await markListingAsSold(listing.id, testUser.user.id);

    expect(sold.status).toBe("sold");

    // Should no longer appear in public search
    const results = await searchListings({});
    expect(results.some((l) => l.id === listing.id)).toBe(false);

    // Seller can still see it
    const sellerListings = await getListingsByUser(testUser.user.id);
    expect(sellerListings.some((l) => l.id === listing.id)).toBe(true);
  });

  it("throws ListingAlreadySoldError if already sold", async () => {
    const listing = await createTestListing(testUser.user.id, {
      title: "Already Sold Listing",
    });
    trackListing(listing.id);
    await supabase.from("listings").update({ status: "sold" }).eq("id", listing.id);

    await expect(markListingAsSold(listing.id, testUser.user.id)).rejects.toBeInstanceOf(
      ListingAlreadySoldError,
    );
  });

  it("throws when called by a non-owner", async () => {
    const listing = await createTestListing(testUser.user.id, {
      title: "Other Owner Listing",
    });
    trackListing(listing.id);

    await expect(markListingAsSold(listing.id, secondUser.user.id)).rejects.toThrow();
  });

  it("creates listing_sold notifications for wishlisted users", async () => {
    const listing = await createPublishableDraft(testUser.user.id, {
      title: "Wishlisted Item",
    });

    // Add secondUser to wishlist directly via supabase (bypasses RLS using service key)
    await supabase.from("wishlists").insert({
      user_id: secondUser.user.id,
      listing_id: listing.id,
    });

    await markListingAsSold(listing.id, testUser.user.id);

    const { data: notifications } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", secondUser.user.id)
      .eq("type", "listing_sold")
      .eq("payload->listing_id", listing.id);

    expect(notifications?.length).toBeGreaterThanOrEqual(1);
    expect(notifications![0].payload.listing_title).toBe("Wishlisted Item");

    // Cleanup
    await supabase.from("wishlists").delete().eq("listing_id", listing.id);
    await supabase.from("notifications").delete().eq("payload->listing_id", listing.id);
  });

  it("does not create a notification for the seller", async () => {
    const listing = await createPublishableDraft(testUser.user.id, {
      title: "Seller No Notify",
    });

    // Seller wishlists their own listing (edge case)
    await supabase.from("wishlists").insert({
      user_id: testUser.user.id,
      listing_id: listing.id,
    });

    await markListingAsSold(listing.id, testUser.user.id);

    const { data: notifications } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", testUser.user.id)
      .eq("type", "listing_sold")
      .eq("payload->listing_id", listing.id);

    expect(notifications?.length ?? 0).toBe(0);

    // Cleanup
    await supabase.from("wishlists").delete().eq("listing_id", listing.id);
  });
});
```

- [ ] **Step 3: Run the new tests**

```bash
npm run test --workspace=apps/backend -- --reporter=verbose 2>&1 | grep -A 5 "markListingAsSold"
```

Expected: all `markListingAsSold` tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/services/listings.ts apps/backend/src/services/__tests__/listings.test.ts
git commit -m "feat: add markListingAsSold with wishlist/conversation notifications"
```

---

### Task 3: Add `listing_status` to `Conversation` and update queries in `messaging.ts`

**Files:**
- Modify: `apps/backend/src/services/messaging.ts`

- [ ] **Step 1: Add `ListingStatus` import**

At the top of `messaging.ts`, add the import:

```typescript
import type { ListingStatus } from "./listings.types.js";
```

- [ ] **Step 2: Add `listing_status` to the `Conversation` interface**

In the `Conversation` interface (lines 10–29), add the new field after `is_seller`:

```typescript
  // Status of the linked listing ("active", "sold", "draft", etc.). Null if no listing.
  listing_status?: ListingStatus | null;
```

- [ ] **Step 3: Update `getListingInfo` helper to return status**

Replace the existing `getListingInfo` helper (around line 86):

```typescript
async function getListingInfo(
  listingId: string,
): Promise<{ title: string; user_id: string; status: ListingStatus } | null> {
  const { data } = await supabase
    .from("listings")
    .select("title,user_id,status")
    .eq("id", listingId)
    .single();

  return data ?? null;
}
```

- [ ] **Step 4: Update `getConversationsByUser` to include `listing_status`**

In the `results.push({...})` block inside `getConversationsByUser` (around line 264), add `listing_status` after `is_seller`:

```typescript
      listing_title: listingInfo?.title,
      is_seller: listingInfo ? listingInfo.user_id === userId : undefined,
      listing_status: listingInfo?.status ?? null,
```

- [ ] **Step 5: Update `getConversation` to include `listing_status`**

In the `return {...}` block of `getConversation` (around line 326), add `listing_status` after `is_seller`:

```typescript
    listing_title: listingInfo?.title,
    is_seller: listingInfo ? listingInfo.user_id === userId : undefined,
    listing_status: listingInfo?.status ?? null,
```

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck --workspace=apps/backend
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/services/messaging.ts
git commit -m "feat: expose listing_status on Conversation for sold-state UI"
```

---

### Task 4: Add `ConversationLockedError` and guard in `sendMessage`

**Files:**
- Modify: `apps/backend/src/services/messaging.ts`

- [ ] **Step 1: Add the error class**

Near the top of `messaging.ts`, after the type definitions (after the `Message` interface, around line 39), add:

```typescript
/** Thrown when trying to send a message in a conversation whose linked listing is sold. */
export class ConversationLockedError extends Error {
  readonly code = "CONVERSATION_LOCKED";

  constructor() {
    super("This conversation is locked because the listing has been sold");
    this.name = "ConversationLockedError";
  }
}
```

- [ ] **Step 2: Add the guard at the top of `sendMessage`**

In `sendMessage` (around line 373), after the three input validation checks and before the `isParticipant` check, insert:

```typescript
  // Guard: block messages if the linked listing has been sold.
  const { data: convoCheck } = await supabase
    .from("conversations")
    .select("listing_id")
    .eq("id", conversationId)
    .is("deleted_at", null)
    .single();

  if (convoCheck?.listing_id) {
    const { data: listingCheck } = await supabase
      .from("listings")
      .select("status")
      .eq("id", convoCheck.listing_id)
      .single();

    if (listingCheck?.status === "sold") {
      throw new ConversationLockedError();
    }
  }
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck --workspace=apps/backend
```

Expected: no errors

---

### Task 5: Write integration test for the `sendMessage` guard

**Files:**
- Modify: `apps/backend/src/services/__tests__/listings.test.ts`

We test the guard in the listings test file because it requires a real listing to be marked sold — it fits naturally with the `markListingAsSold` suite.

- [ ] **Step 1: Add the import for messaging functions**

At the top of `listings.test.ts`, add:

```typescript
import { createConversation, sendMessage, ConversationLockedError } from "../messaging.js";
```

- [ ] **Step 2: Add the test inside the `markListingAsSold` describe block**

Append inside the `describe("markListingAsSold", ...)` block:

```typescript
  it("blocks sendMessage after listing is marked sold", async () => {
    const listing = await createPublishableDraft(testUser.user.id, {
      title: "Soon To Be Sold",
    });

    // Create a conversation between testUser (seller) and secondUser (buyer)
    const conversation = await createConversation(
      secondUser.user.id,
      testUser.user.id,
      listing.id,
    );

    // Mark it sold
    await markListingAsSold(listing.id, testUser.user.id);

    // Buyer tries to send a message — should be blocked
    await expect(
      sendMessage(conversation.id, secondUser.user.id, "Is this still available?"),
    ).rejects.toBeInstanceOf(ConversationLockedError);
  });
```

- [ ] **Step 3: Run the full test suite**

```bash
npm run test --workspace=apps/backend
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/services/messaging.ts apps/backend/src/services/__tests__/listings.test.ts
git commit -m "feat: block sendMessage on sold listings with ConversationLockedError"
```

---

### Task 6: Update `ChatPanel` with sold banner and disabled input

**Files:**
- Modify: `apps/web/src/components/ChatPanel.tsx`

- [ ] **Step 1: Add `listingStatus` to `ChatPanelProps`**

In the `ChatPanelProps` type (lines 6–18), add after `isSeller`:

```typescript
  listingStatus?: string | null;
```

- [ ] **Step 2: Destructure `listingStatus` in the component**

In the function signature destructure (lines 28–40), add after `isSeller`:

```typescript
    listingStatus,
```

- [ ] **Step 3: Derive `isSold` at the top of the component body**

After the `bottomRef` declaration, add:

```typescript
    const isSold = listingStatus === "sold";
```

- [ ] **Step 4: Add the sold banner above the message input**

Replace the message input section (the `<div className="m-2 mt-0 ...">` block at lines 149–167) with:

```tsx
            {/* Sold banner — shown when the linked listing has been sold */}
            {isSold && (
                <div className="mx-2 mb-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-center text-sm text-[var(--color-text-muted)]">
                    This item has been sold. Messaging is no longer available.
                </div>
            )}

            {/* Message input */}
            <div className="m-2 mt-0 flex items-center gap-2 border-t border-[var(--color-border)] bg-[var(--color-background)] p-3">
                <input
                    type="text"
                    placeholder={isSold ? "This conversation is closed" : "Type a message..."}
                    value={messageInput}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSold}
                    className="flex-1 rounded-lg border border-[var(--color-border)] bg-transparent px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 transition-all placeholder:text-[var(--color-text-muted)] disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                    type="button"
                    onClick={onSend}
                    disabled={!messageInput.trim() || isSold}
                    className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-on-primary)] disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                    <Send size={16} />
                    Send
                </button>
            </div>
```

- [ ] **Step 5: Pass `listingStatus` from the messages page**

Open `apps/web/src/pages/messages.tsx`. The `<ChatPanel` render starts at line 278. Add `listingStatus` after `isSeller`:

```tsx
                        <ChatPanel
                            messages={messages}
                            userId={user.id}
                            otherUserName={activeConvo.other_user_display_name ?? "Unknown User"}
                            messageInput={messageInput}
                            onInputChange={setMessageInput}
                            onSend={handleSend}
                            loading={chatLoading}
                            onBack={() => setMobileView("list")}
                            listingId={activeConvo.listing_id}
                            listingTitle={activeConvo.listing_title}
                            isSeller={activeConvo.is_seller}
                            listingStatus={activeConvo.listing_status}
                        />
```

- [ ] **Step 6: Run typecheck on the frontend**

```bash
npm run typecheck --workspace=apps/web
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/ChatPanel.tsx apps/web/src/pages/messages.tsx
git commit -m "feat: show sold banner and disable input in ChatPanel for sold listings"
```

---

## Verification Checklist

- [ ] `markListingAsSold(listingId, sellerId)` → listing status is `"sold"`
- [ ] `searchListings({})` → sold listing does not appear
- [ ] `getListingsByUser(sellerId)` → sold listing still visible
- [ ] `notifications` table has rows for wishlisted users + conversation participants, with `type = "listing_sold"` and correct `listing_title` in payload
- [ ] Seller has no notification row for their own listing
- [ ] `sendMessage(conversationId, buyerId, "...")` on a sold-linked conversation → throws `ConversationLockedError`
- [ ] Messages page: open a conversation for a sold listing → sold banner visible, input disabled
- [ ] Messages page: open a conversation for an active listing → input works normally
- [ ] All backend tests pass: `npm run test --workspace=apps/backend`
- [ ] No type errors: `npm run typecheck`
