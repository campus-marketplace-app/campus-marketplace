import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryOperation = "select" | "insert" | "delete";

type QueryResponse = {
  table: string;
  operation: QueryOperation;
  data?: unknown;
  error?: { message: string } | null;
};

const { state, supabaseMock } = vi.hoisted(() => {
  const mockState = {
    responses: [] as QueryResponse[],
  };

  function nextResponse(table: string, operation: QueryOperation) {
    const response = mockState.responses.shift();

    if (!response) {
      throw new Error(`Unexpected query for ${table}.${operation}`);
    }

    if (response.table !== table || response.operation !== operation) {
      throw new Error(
        `Unexpected query order. Expected ${response.table}.${response.operation} but got ${table}.${operation}`,
      );
    }

    return {
      data: response.data ?? null,
      error: response.error ?? null,
      count: null,
    };
  }

  function createChain(table: string) {
    let operation: QueryOperation = "select";
    const chain: Record<string, unknown> = {};

    chain.select = () => chain;
    chain.eq = () => chain;
    chain.is = () => chain;
    chain.order = () => chain;
    chain.limit = () => chain;

    chain.upsert = () => {
      operation = "insert";
      return chain;
    };

    chain.delete = () => {
      operation = "delete";
      return chain;
    };

    chain.single = async () => nextResponse(table, operation);

    chain.then = (
      resolve: (value: { data: unknown; error: { message: string } | null; count: number | null }) => unknown,
      reject?: (reason?: unknown) => unknown,
    ) => Promise.resolve(nextResponse(table, operation)).then(resolve, reject);

    return chain;
  }

  return {
    state: mockState,
    supabaseMock: {
      from: (table: string) => createChain(table),
    },
  };
});

function enqueueResponse(response: QueryResponse) {
  state.responses.push(response);
}

vi.mock("../../supabase-client.js", () => ({
  supabase: supabaseMock,
}));

import { blockUser, getBlockedUsers, isBlocked, unblockUser } from "../blocks.js";

describe("blocks service unit", () => {
  beforeEach(() => {
    state.responses.length = 0;
    vi.restoreAllMocks();
  });

  it("covers blockUser validation and failure branches", async () => {
    await expect(blockUser("", "u2")).rejects.toThrow("User ID is required");
    await expect(blockUser("u1", "")).rejects.toThrow("Blocked user ID is required");
    await expect(blockUser("u1", "u1")).rejects.toThrow("You cannot block yourself");

    enqueueResponse({ table: "blocks", operation: "insert", error: { message: "db fail" } });
    await expect(blockUser("u1", "u2")).rejects.toThrow("Failed to block user: db fail");

    enqueueResponse({ table: "blocks", operation: "insert", data: null });
    await expect(blockUser("u1", "u2")).rejects.toThrow("Block did not return data");
  });

  it("covers unblockUser error branch", async () => {
    await expect(unblockUser("", "u2")).rejects.toThrow("User ID is required");
    await expect(unblockUser("u1", "")).rejects.toThrow("Blocked user ID is required");

    enqueueResponse({ table: "blocks", operation: "delete", error: { message: "delete fail" } });
    await expect(unblockUser("u1", "u2")).rejects.toThrow("Failed to unblock user: delete fail");
  });

  it("covers getBlockedUsers fallback and error branches", async () => {
    await expect(getBlockedUsers("")).rejects.toThrow("User ID is required");

    enqueueResponse({ table: "blocks", operation: "select", error: { message: "query fail" } });
    await expect(getBlockedUsers("u1")).rejects.toThrow("Failed to fetch blocked users: query fail");

    enqueueResponse({ table: "blocks", operation: "select", data: null });
    await expect(getBlockedUsers("u1")).resolves.toEqual([]);
  });

  it("covers isBlocked validation, error, false and true branches", async () => {
    await expect(isBlocked("", "u2")).rejects.toThrow("User ID is required");
    await expect(isBlocked("u1", "")).rejects.toThrow("Target user ID is required");

    enqueueResponse({ table: "blocks", operation: "select", error: { message: "check fail" } });
    await expect(isBlocked("u1", "u2")).rejects.toThrow("Failed to check block status: check fail");

    enqueueResponse({ table: "blocks", operation: "select", data: [] });
    await expect(isBlocked("u1", "u2")).resolves.toBe(false);

    enqueueResponse({ table: "blocks", operation: "select", data: [{ id: "b1" }] });
    await expect(isBlocked("u1", "u2")).resolves.toBe(true);
  });
});
