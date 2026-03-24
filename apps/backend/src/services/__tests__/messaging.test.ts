import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createOrGetConversation,
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
