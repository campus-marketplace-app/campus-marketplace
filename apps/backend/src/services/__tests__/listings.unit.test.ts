import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryOperation = "select" | "insert" | "update" | "delete";

type QueryResponse = {
  table: string;
  operation: QueryOperation;
  data?: unknown;
  error?: { message: string; code?: string } | null;
};

const { state, supabaseMock } = vi.hoisted(() => {
  const mockState = {
    responses: [] as QueryResponse[],
    uploadError: null as { message: string } | null,
    removeError: null as { message: string } | null,
    removedPaths: [] as string[][],
    publicUrl: "https://cdn.example/listing.png",
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
    chain.neq = () => chain;
    chain.is = () => chain;
    chain.in = () => chain;
    chain.order = () => chain;
    chain.limit = () => chain;
    chain.range = () => chain;
    chain.gte = () => chain;
    chain.lte = () => chain;
    chain.textSearch = () => chain;

    chain.insert = () => {
      operation = "insert";
      return chain;
    };

    chain.update = () => {
      operation = "update";
      return chain;
    };

    chain.delete = () => {
      operation = "delete";
      return chain;
    };

    chain.single = async () => nextResponse(table, operation);
    chain.maybeSingle = async () => nextResponse(table, operation);

    chain.returns = () => chain;

    chain.then = (
      resolve: (value: { data: unknown; error: { message: string; code?: string } | null; count: number | null }) => unknown,
      reject?: (reason?: unknown) => unknown,
    ) => Promise.resolve(nextResponse(table, operation)).then(resolve, reject);

    return chain;
  }

  const mockSupabase = {
    from: (table: string) => createChain(table),
    storage: {
      from: () => ({
        upload: async () => ({ error: mockState.uploadError }),
        remove: async (paths: string[]) => {
          mockState.removedPaths.push(paths);
          return { error: mockState.removeError };
        },
        getPublicUrl: () => ({ data: { publicUrl: mockState.publicUrl } }),
      }),
    },
  };

  return {
    state: mockState,
    supabaseMock: mockSupabase,
  };
});

function enqueueResponse(response: QueryResponse) {
  state.responses.push(response);
}

vi.mock("../../supabase-client.js", () => ({
  supabase: supabaseMock,
}));

import {
  getListingImageUrl,
  ListingAlreadySoldError,
  markListingAsSold,
  uploadListingImage,
} from "../listings.js";

describe("listings service unit", () => {
  beforeEach(() => {
    state.responses.length = 0;
    state.uploadError = null;
    state.removeError = null;
    state.removedPaths.length = 0;
    state.publicUrl = "https://cdn.example/listing.png";
    vi.restoreAllMocks();
  });

  it("markListingAsSold throws detailed errors on failed update path", async () => {
    enqueueResponse({ table: "listings", operation: "update", data: null, error: { message: "update fail" } });
    enqueueResponse({ table: "listings", operation: "select", data: null });
    await expect(markListingAsSold("l1", "u1")).rejects.toThrow("Listing not found");

    enqueueResponse({ table: "listings", operation: "update", data: null, error: { message: "update fail" } });
    enqueueResponse({ table: "listings", operation: "select", data: { user_id: "u2", status: "active" } });
    await expect(markListingAsSold("l1", "u1")).rejects.toThrow("Listing not found or you do not have permission to modify it");

    enqueueResponse({ table: "listings", operation: "update", data: null, error: { message: "update fail" } });
    enqueueResponse({ table: "listings", operation: "select", data: { user_id: "u1", status: "sold" } });
    await expect(markListingAsSold("l1", "u1")).rejects.toBeInstanceOf(ListingAlreadySoldError);

    enqueueResponse({ table: "listings", operation: "update", data: null, error: { message: "db unstable" } });
    enqueueResponse({ table: "listings", operation: "select", data: { user_id: "u1", status: "active" } });
    await expect(markListingAsSold("l1", "u1")).rejects.toThrow("Failed to mark listing as sold: db unstable");
  });

  it("markListingAsSold warns when notification insert fails but still returns listing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    enqueueResponse({
      table: "listings",
      operation: "update",
      data: {
        id: "l1",
        user_id: "u1",
        type: "item",
        title: "Bike",
        description: "desc",
        price: 10,
        price_unit: null,
        category_id: null,
        status: "sold",
        location: null,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
    });
    enqueueResponse({ table: "wishlists", operation: "select", data: [{ user_id: "u2" }] });
    enqueueResponse({ table: "conversations", operation: "select", data: [] });
    enqueueResponse({ table: "notifications", operation: "insert", error: { message: "notify fail" } });

    const listing = await markListingAsSold("l1", "u1");

    expect(listing.status).toBe("sold");
    expect(warnSpy).toHaveBeenCalled();
  });

  it("uploadListingImage surfaces order and metadata persistence errors", async () => {
    enqueueResponse({ table: "listings", operation: "select", data: { id: "l1" } });
    enqueueResponse({ table: "listing_images", operation: "select", error: { message: "order query failed" } });
    await expect(uploadListingImage("l1", "u1", new Uint8Array([1]), "image/png")).rejects.toThrow(
      "Failed to determine listing image order: order query failed",
    );

    enqueueResponse({ table: "listings", operation: "select", data: { id: "l1" } });
    enqueueResponse({ table: "listing_images", operation: "select", data: { order_no: 1 } });
    enqueueResponse({ table: "listing_images", operation: "insert", error: { message: "insert failed" } });
    await expect(uploadListingImage("l1", "u1", new Uint8Array([1]), "image/png")).rejects.toThrow(
      "Failed to save listing image metadata: insert failed",
    );

    enqueueResponse({ table: "listings", operation: "select", data: { id: "l1" } });
    enqueueResponse({ table: "listing_images", operation: "select", data: { order_no: 1 } });
    enqueueResponse({ table: "listing_images", operation: "insert", data: null });
    await expect(uploadListingImage("l1", "u1", new Uint8Array([1]), "image/png")).rejects.toThrow(
      "Listing image upload did not return metadata",
    );

    expect(state.removedPaths.length).toBeGreaterThanOrEqual(2);
  });

  it("returns public listing image url", () => {
    state.publicUrl = "https://cdn.example/public/path.png";
    expect(getListingImageUrl("listing/path.png")).toBe("https://cdn.example/public/path.png");
  });
});
