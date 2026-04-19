import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryOperation = "select";

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
    };
  }

  function createChain(table: string) {
    const chain: Record<string, unknown> = {};

    chain.select = () => chain;
    chain.eq = () => chain;
    chain.is = () => chain;
    chain.order = () => chain;

    chain.single = async () => nextResponse(table, "select");

    chain.then = (
      resolve: (value: { data: unknown; error: { message: string } | null }) => unknown,
      reject?: (reason?: unknown) => unknown,
    ) => Promise.resolve(nextResponse(table, "select")).then(resolve, reject);

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

import { getCategories, getCategoryById, getTags } from "../categories.js";

describe("categories service unit", () => {
  beforeEach(() => {
    state.responses.length = 0;
    vi.restoreAllMocks();
  });

  it("returns empty arrays for null category/tag lists", async () => {
    enqueueResponse({ table: "categories", operation: "select", data: null });
    enqueueResponse({ table: "tags", operation: "select", data: null });

    await expect(getCategories()).resolves.toEqual([]);
    await expect(getTags()).resolves.toEqual([]);
  });

  it("surfaces getCategories query errors", async () => {
    enqueueResponse({ table: "categories", operation: "select", error: { message: "categories failed" } });

    await expect(getCategories()).rejects.toThrow("Failed to fetch categories: categories failed");
  });

  it("validates and handles getCategoryById failures", async () => {
    await expect(getCategoryById("")).rejects.toThrow("Category ID is required");

    enqueueResponse({ table: "categories", operation: "select", error: { message: "category failed" } });
    await expect(getCategoryById("c1")).rejects.toThrow("Failed to fetch category: category failed");

    enqueueResponse({ table: "categories", operation: "select", data: null });
    await expect(getCategoryById("c1")).rejects.toThrow("Category not found: c1");
  });

  it("surfaces getTags query errors", async () => {
    enqueueResponse({ table: "tags", operation: "select", error: { message: "tags failed" } });

    await expect(getTags()).rejects.toThrow("Failed to fetch tags: tags failed");
  });
});
