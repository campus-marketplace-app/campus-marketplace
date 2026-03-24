import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createOrGetConversation,
  getConversationById,
  getMessages,
  sendMessage,
  markConversationAsRead,
} from "../messaging.js";
import { createTestUser, createTestListing } from "./helpers.js";
import { supabase } from "../../supabase-client.js";
import type { TestUser } from "./helpers.js";

let buyer: TestUser;
let seller: TestUser;
let listingId: string;
let conversationId: string;

beforeAll(async () => {
  buyer = await createTestUser("Buyer");
  seller = await createTestUser("Seller");

  const listing = await createTestListing(seller.user.id);
  listingId = listing.id;

  const convo = await createOrGetConversation({
    listing_id: listingId,
    buyer_id: buyer.user.id,
    seller_id: seller.user.id,
  });
  conversationId = convo.id;

  // Seller sends a message so buyer has something to mark as read
  await sendMessage(conversationId, seller.user.id, "Hello buyer!");
});

afterAll(async () => {
  await buyer.cleanup();
  await seller.cleanup();
});

describe("getConversationById", () => {
  it("returns a ConversationSummary with correct shape", async () => {
    const summary = await getConversationById(conversationId, buyer.user.id);
    expect(summary.id).toBe(conversationId);
    expect(summary.listing_id).toBe(listingId);
    expect(typeof summary.unread_count).toBe("number");
    expect(summary.other_participant.user_id).toBe(seller.user.id);
    expect(summary.last_message).not.toBeNull();
  });

  it("includes resolved avatar_url field on other_participant", async () => {
    const summary = await getConversationById(conversationId, buyer.user.id);
    expect("avatar_url" in summary.other_participant).toBe(true);
  });

  it("throws when user is not a participant", async () => {
    const outsider = await createTestUser("Outsider2");
    try {
      await expect(
        getConversationById(conversationId, outsider.user.id),
      ).rejects.toThrow("not a participant");
    } finally {
      await outsider.cleanup();
      // createTestUser changes the shared client's auth state to the new user.
      // Restore seller's session so subsequent tests can call service functions
      // (e.g. sendMessage) with the correct auth context.
      await supabase.auth.setSession(seller.session);
    }
  });

  it("throws with empty conversationId", async () => {
    await expect(getConversationById("", buyer.user.id)).rejects.toThrow("Conversation ID is required");
  });
});

describe("getConversations unread_count", () => {
  it("returns unread_count > 0 before marking as read", async () => {
    // Ensure there is at least one unread message from seller
    await sendMessage(conversationId, seller.user.id, "Unread message for count test");

    const before = await getConversationById(conversationId, buyer.user.id);
    expect(before.unread_count).toBeGreaterThan(0);
  });

  it("returns unread_count 0 after marking as read", async () => {
    await markConversationAsRead(conversationId, buyer.user.id);

    const after = await getConversationById(conversationId, buyer.user.id);
    expect(after.unread_count).toBe(0);
  });
});

describe("getMessages pagination", () => {
  let paginationConvoId: string;
  let paginationBuyerId: string;

  beforeAll(async () => {
    const paginationBuyer = await createTestUser("PaginationBuyer");
    const paginationSeller = await createTestUser("PaginationSeller");
    const paginationListing = await createTestListing(paginationSeller.user.id);
    const paginationConvo = await createOrGetConversation({
      listing_id: paginationListing.id,
      buyer_id: paginationBuyer.user.id,
      seller_id: paginationSeller.user.id,
    });
    paginationConvoId = paginationConvo.id;
    paginationBuyerId = paginationBuyer.user.id;

    await sendMessage(paginationConvoId, paginationBuyer.user.id, "Page msg 1");
    await new Promise((r) => setTimeout(r, 20));
    await sendMessage(paginationConvoId, paginationSeller.user.id, "Page msg 2");
    await new Promise((r) => setTimeout(r, 20));
    await sendMessage(paginationConvoId, paginationBuyer.user.id, "Page msg 3");
    await new Promise((r) => setTimeout(r, 20));
  });

  // Restore seller's session after this suite so subsequent describe blocks
  // that call sendMessage(conversationId, seller.user.id, ...) have the
  // correct auth context (pagination users changed auth state in beforeAll).
  afterAll(async () => {
    if (seller?.session) await supabase.auth.setSession(seller.session);
  });

  it("returns all messages when no options provided", async () => {
    const messages = await getMessages(paginationConvoId, paginationBuyerId);
    expect(messages.length).toBeGreaterThanOrEqual(3);
  });

  it("respects limit option", async () => {
    const limited = await getMessages(paginationConvoId, paginationBuyerId, { limit: 1 });
    expect(limited.length).toBe(1);
  });

  it("respects before cursor — returns only messages before the timestamp", async () => {
    const all = await getMessages(paginationConvoId, paginationBuyerId);
    expect(all.length).toBeGreaterThan(1);

    // Use the created_at of the last message as the cursor
    const cursor = all[all.length - 1].created_at;
    const paged = await getMessages(paginationConvoId, paginationBuyerId, { before: cursor });
    expect(paged.length).toBeGreaterThan(0);

    // All returned messages must be strictly before the cursor
    for (const m of paged) {
      expect(new Date(m.created_at).getTime()).toBeLessThan(new Date(cursor).getTime());
    }
  });

  it("returns empty array when before cursor is earlier than all messages", async () => {
    const result = await getMessages(paginationConvoId, paginationBuyerId, {
      before: "2000-01-01T00:00:00.000Z",
    });
    expect(result).toHaveLength(0);
  });
});

describe("markConversationAsRead", () => {
  it("marks messages from the other participant as read", async () => {
    // Send a fresh message to guarantee there is something unread to mark
    await sendMessage(conversationId, seller.user.id, "Fresh unread message");

    // Before: buyer has unread messages from seller
    const before = await getMessages(conversationId, buyer.user.id);
    const unreadBefore = before.filter((m) => m.sender_id === seller.user.id && !m.is_read);
    expect(unreadBefore.length).toBeGreaterThan(0);

    // Act
    await markConversationAsRead(conversationId, buyer.user.id);

    // After: no unread messages from seller
    const after = await getMessages(conversationId, buyer.user.id);
    const unreadAfter = after.filter((m) => m.sender_id === seller.user.id && !m.is_read);
    expect(unreadAfter.length).toBe(0);
  });

  it("throws when user is not a participant", async () => {
    const outsider = await createTestUser("Outsider");
    try {
      await expect(
        markConversationAsRead(conversationId, outsider.user.id),
      ).rejects.toThrow("not a participant");
    } finally {
      await outsider.cleanup();
      await supabase.auth.setSession(seller.session);
    }
  });

  it("throws with empty conversationId", async () => {
    await expect(markConversationAsRead("", buyer.user.id)).rejects.toThrow("Conversation ID is required");
  });
});
