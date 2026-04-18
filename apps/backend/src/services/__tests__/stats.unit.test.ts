import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryResponse = {
  table: string;
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
};

const { state, supabaseMock } = vi.hoisted(() => {
  const mockState = {
    responses: [] as QueryResponse[],
  };

  function nextResponse(table: string) {
    const response = mockState.responses.shift();

    if (!response) {
      throw new Error(`Unexpected query for ${table}`);
    }

    if (response.table !== table) {
      throw new Error(`Unexpected query order. Expected ${response.table} but got ${table}`);
    }

    return {
      data: response.data ?? null,
      error: response.error ?? null,
      count: response.count ?? null,
    };
  }

  function createChain(table: string) {
    const chain: Record<string, unknown> = {};

    chain.select = () => chain;
    chain.eq = () => chain;
    chain.is = () => chain;
    chain.gte = () => chain;

    chain.then = (
      resolve: (value: { data: unknown; error: { message: string } | null; count: number | null }) => unknown,
      reject?: (reason?: unknown) => unknown,
    ) => Promise.resolve(nextResponse(table)).then(resolve, reject);

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

import { getHomeStats } from "../stats.js";

describe("stats service unit", () => {
  beforeEach(() => {
    state.responses.length = 0;
    vi.restoreAllMocks();
  });

  it("returns computed counts and defaults null counts to zero", async () => {
    enqueueResponse({ table: "listings", count: 12 });
    enqueueResponse({ table: "listings", count: null });
    enqueueResponse({ table: "profiles", count: 7 });

    const stats = await getHomeStats();

    expect(stats).toEqual({
      activeListings: 12,
      newToday: 0,
      activeUsers: 7,
    });
  });

  it("defaults activeUsers to zero when users count is null", async () => {
    enqueueResponse({ table: "listings", count: 3 });
    enqueueResponse({ table: "listings", count: 1 });
    enqueueResponse({ table: "profiles", count: null });

    const stats = await getHomeStats();

    expect(stats).toEqual({
      activeListings: 3,
      newToday: 1,
      activeUsers: 0,
    });
  });

  it("defaults activeListings to zero when active listing count is null", async () => {
    enqueueResponse({ table: "listings", count: null });
    enqueueResponse({ table: "listings", count: 2 });
    enqueueResponse({ table: "profiles", count: 4 });

    const stats = await getHomeStats();

    expect(stats).toEqual({
      activeListings: 0,
      newToday: 2,
      activeUsers: 4,
    });
  });

  it("throws for active listings count errors", async () => {
    enqueueResponse({ table: "listings", error: { message: "active failed" } });
    enqueueResponse({ table: "listings", count: 0 });
    enqueueResponse({ table: "profiles", count: 0 });

    await expect(getHomeStats()).rejects.toThrow("Failed to count active listings: active failed");
  });

  it("throws for newToday count errors", async () => {
    enqueueResponse({ table: "listings", count: 10 });
    enqueueResponse({ table: "listings", error: { message: "today failed" } });
    enqueueResponse({ table: "profiles", count: 5 });

    await expect(getHomeStats()).rejects.toThrow("Failed to count today's listings: today failed");
  });

  it("throws for users count errors", async () => {
    enqueueResponse({ table: "listings", count: 10 });
    enqueueResponse({ table: "listings", count: 2 });
    enqueueResponse({ table: "profiles", error: { message: "users failed" } });

    await expect(getHomeStats()).rejects.toThrow("Failed to count users: users failed");
  });
});
