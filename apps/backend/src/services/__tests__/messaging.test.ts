import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createOrGetConversation,
  getConversationById,
  getMessages,
  sendMessage,
  markConversationAsRead,
} from "../messaging.js";
import { createTestUser, createTestListing } from "./helpers.js";
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

  it("reflects unread_count correctly before and after markConversationAsRead", async () => {
    // Ensure there is at least one unread message from seller
    await sendMessage(conversationId, seller.user.id, "Unread message for count test");

    const before = await getConversationById(conversationId, buyer.user.id);
    expect(before.unread_count).toBeGreaterThan(0);

    await markConversationAsRead(conversationId, buyer.user.id);

    const after = await getConversationById(conversationId, buyer.user.id);
    expect(after.unread_count).toBe(0);
  });

  it("throws when user is not a participant", async () => {
    const outsider = await createTestUser("Outsider2");
    try {
      await expect(
        getConversationById(conversationId, outsider.user.id),
      ).rejects.toThrow("not a participant");
    } finally {
      await outsider.cleanup();
    }
  });

  it("throws with empty conversationId", async () => {
    await expect(getConversationById("", buyer.user.id)).rejects.toThrow("Conversation ID is required");
  });
});

describe("getMessages pagination", () => {
  it("respects limit option", async () => {
    // Send extra messages so we have more than 1
    await sendMessage(conversationId, buyer.user.id, "Page msg 1");
    await sendMessage(conversationId, seller.user.id, "Page msg 2");
    await sendMessage(conversationId, buyer.user.id, "Page msg 3");

    const limited = await getMessages(conversationId, buyer.user.id, { limit: 1 });
    expect(limited.length).toBe(1);
  });

  it("respects before cursor — returns only messages before the timestamp", async () => {
    const all = await getMessages(conversationId, buyer.user.id);
    expect(all.length).toBeGreaterThan(1);

    // Use the created_at of the last message as the cursor
    const cursor = all[all.length - 1].created_at;
    const paged = await getMessages(conversationId, buyer.user.id, { before: cursor });

    // All returned messages must be strictly before the cursor
    for (const m of paged) {
      expect(new Date(m.created_at).getTime()).toBeLessThan(new Date(cursor).getTime());
    }
  });

  it("returns empty array when before cursor is earlier than all messages", async () => {
    const result = await getMessages(conversationId, buyer.user.id, {
      before: "2000-01-01T00:00:00.000Z",
    });
    expect(result).toHaveLength(0);
  });
});

describe("markConversationAsRead", () => {
  it("marks messages from the other participant as read", async () => {
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
    }
  });

  it("throws with empty conversationId", async () => {
    await expect(markConversationAsRead("", buyer.user.id)).rejects.toThrow("Conversation ID is required");
  });
});
