import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { supabase } from "../../supabase-client.js";
import { blockUser, getBlockedUsers, isBlocked, unblockUser } from "../blocks.js";
import { createTestUser } from "./helpers.js";
import type { TestUser } from "./helpers.js";

let blocker: TestUser | undefined;
let blocked: TestUser | undefined;

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes("request rate limit reached");
}

beforeAll(async () => {
  try {
    blocker = await createTestUser("Blocker Test User");
    blocked = await createTestUser("Blocked Test User");
  } catch (error) {
    if (isRateLimitError(error)) {
      return;
    }

    throw error;
  }
});

async function useSession(user: TestUser | undefined) {
  if (!user) {
    throw new Error("Test user is required");
  }

  if (!user.session) {
    throw new Error("Test user session is required");
  }

  await supabase.auth.setSession({
    access_token: user.session.access_token,
    refresh_token: user.session.refresh_token,
  });
}

afterAll(async () => {
  await blocker?.cleanup();
  await blocked?.cleanup();
});

describe("blockUser", () => {
  it("creates a block row and returns it", async () => {
    await useSession(blocker);
    const block = await blockUser(blocker!.user.id, blocked!.user.id);

    expect(block.user_id).toBe(blocker!.user.id);
    expect(block.blocked_user_id).toBe(blocked!.user.id);
  });

  it("throws when blocking yourself", async () => {
    await useSession(blocker);
    await expect(blockUser(blocker!.user.id, blocker!.user.id)).rejects.toThrow("You cannot block yourself");
  });

  it("throws for empty IDs", async () => {
    await expect(blockUser("", blocked!.user.id)).rejects.toThrow("User ID is required");
    await expect(blockUser(blocker!.user.id, "")).rejects.toThrow("Blocked user ID is required");
  });
});

describe("block reads and removal", () => {
  it("reports blocked status and lists blocked users", async () => {
    await useSession(blocker);
    expect(await isBlocked(blocker!.user.id, blocked!.user.id)).toBe(true);

    const blockedUsers = await getBlockedUsers(blocker!.user.id);
    expect(blockedUsers.some((entry) => entry.blocked_user_id === blocked!.user.id)).toBe(true);
  });

  it("unblocks a user and clears the relationship", async () => {
    await useSession(blocker);
    await unblockUser(blocker!.user.id, blocked!.user.id);

    expect(await isBlocked(blocker!.user.id, blocked!.user.id)).toBe(false);
  });

  it("throws for empty IDs on read and delete paths", async () => {
    await useSession(blocker);
    await expect(getBlockedUsers("")).rejects.toThrow("User ID is required");
    await expect(isBlocked("", blocked!.user.id)).rejects.toThrow("User ID is required");
    await expect(isBlocked(blocker!.user.id, "")).rejects.toThrow("Target user ID is required");
    await expect(unblockUser("", blocked!.user.id)).rejects.toThrow("User ID is required");
    await expect(unblockUser(blocker!.user.id, "")).rejects.toThrow("Blocked user ID is required");
  });
});