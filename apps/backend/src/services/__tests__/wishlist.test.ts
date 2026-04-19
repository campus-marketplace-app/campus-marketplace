import { afterEach, describe, expect, it, vi } from "vitest";

type QueryOperation = "select" | "upsert" | "delete";

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
    let operation: QueryOperation = "select";
    const chain: Record<string, unknown> = {};

    chain.select = () => chain;
    chain.eq = () => chain;
    chain.order = () => chain;
    chain.limit = () => chain;

    chain.upsert = () => {
      operation = "upsert";
      return chain;
    };

    chain.delete = () => {
      operation = "delete";
      return chain;
    };

    chain.single = async () => nextResponse(table, operation);

    chain.then = (
      resolve: (value: { data: unknown; error: { message: string } | null }) => unknown,
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

import {
  addToWishlist,
  getWishlist,
  isWishlisted,
  removeFromWishlist,
} from "../wishlist.js";

afterEach(() => {
  state.responses.length = 0;
  vi.restoreAllMocks();
});

describe("wishlist service", () => {
  it("validates addToWishlist input", async () => {
    await expect(addToWishlist("", "listing-1")).rejects.toThrow("User ID is required");
    await expect(addToWishlist("user-1", "")).rejects.toThrow("Listing ID is required");
  });

  it("adds a listing to wishlist", async () => {
    enqueueResponse({
      table: "wishlists",
      operation: "upsert",
      data: {
        id: "w1",
        user_id: "user-1",
        listing_id: "listing-1",
        created_at: "2026-01-01T00:00:00.000Z",
      },
    });

    const item = await addToWishlist("user-1", "listing-1");

    expect(item.id).toBe("w1");
    expect(item.user_id).toBe("user-1");
    expect(item.listing_id).toBe("listing-1");
  });

  it("throws when addToWishlist query fails", async () => {
    enqueueResponse({
      table: "wishlists",
      operation: "upsert",
      error: { message: "duplicate key" },
    });

    await expect(addToWishlist("user-1", "listing-1")).rejects.toThrow("Failed to add to wishlist: duplicate key");
  });

  it("throws when addToWishlist returns no data", async () => {
    enqueueResponse({
      table: "wishlists",
      operation: "upsert",
      data: null,
    });

    await expect(addToWishlist("user-1", "listing-1")).rejects.toThrow("Add to wishlist did not return data");
  });

  it("validates removeFromWishlist input", async () => {
    await expect(removeFromWishlist("", "listing-1")).rejects.toThrow("User ID is required");
    await expect(removeFromWishlist("user-1", "")).rejects.toThrow("Listing ID is required");
  });

  it("removes a wishlist row and is idempotent", async () => {
    enqueueResponse({
      table: "wishlists",
      operation: "delete",
      data: null,
    });

    await expect(removeFromWishlist("user-1", "listing-1")).resolves.toBeUndefined();
  });

  it("throws when removeFromWishlist query fails", async () => {
    enqueueResponse({
      table: "wishlists",
      operation: "delete",
      error: { message: "permission denied" },
    });

    await expect(removeFromWishlist("user-1", "listing-1")).rejects.toThrow(
      "Failed to remove from wishlist: permission denied",
    );
  });

  it("validates getWishlist input", async () => {
    await expect(getWishlist("")).rejects.toThrow("User ID is required");
  });

  it("maps wishlist rows with listing details, sorted first image, and availability", async () => {
    enqueueResponse({
      table: "wishlists",
      operation: "select",
      data: [
        {
          id: "w-active",
          user_id: "user-1",
          listing_id: "listing-active",
          created_at: "2026-01-01T00:00:00.000Z",
          listing: {
            id: "listing-active",
            title: "Bike",
            price: "99.5",
            price_unit: "item",
            status: "active",
            deleted_at: null,
            type: "item",
            category: { name: "Sports" },
            images: [
              { path: "two.png", alt_text: "second", order_no: 2 },
              { path: "one.png", alt_text: "first", order_no: 1 },
            ],
          },
        },
        {
          id: "w-sold",
          user_id: "user-1",
          listing_id: "listing-sold",
          created_at: "2026-01-02T00:00:00.000Z",
          listing: {
            id: "listing-sold",
            title: "Desk",
            price: 40,
            price_unit: null,
            status: "sold",
            deleted_at: null,
            type: "item",
            category: null,
            images: [],
          },
        },
        {
          id: "w-closed",
          user_id: "user-1",
          listing_id: "listing-closed",
          created_at: "2026-01-03T00:00:00.000Z",
          listing: {
            id: "listing-closed",
            title: "Tutor",
            price: 25,
            price_unit: "hour",
            status: "closed",
            deleted_at: null,
            type: "service",
            category: null,
            images: [],
          },
        },
        {
          id: "w-archived",
          user_id: "user-1",
          listing_id: "listing-archived",
          created_at: "2026-01-04T00:00:00.000Z",
          listing: {
            id: "listing-archived",
            title: "Lamp",
            price: 10,
            price_unit: null,
            status: "archived",
            deleted_at: null,
            type: "item",
            category: null,
            images: [],
          },
        },
        {
          id: "w-removed-by-delete",
          user_id: "user-1",
          listing_id: "listing-removed",
          created_at: "2026-01-05T00:00:00.000Z",
          listing: {
            id: "listing-removed",
            title: "Old Chair",
            price: 5,
            price_unit: null,
            status: "active",
            deleted_at: "2026-01-06T00:00:00.000Z",
            type: "item",
            category: null,
            images: [],
          },
        },
        {
          id: "w-removed-by-null",
          user_id: "user-1",
          listing_id: "listing-null",
          created_at: "2026-01-06T00:00:00.000Z",
          listing: null,
        },
      ],
    });

    const rows = await getWishlist("user-1");

    expect(rows).toHaveLength(6);
    expect(rows[0]?.listing?.price).toBe(99.5);
    expect(rows[0]?.listing?.first_image_path).toBe("one.png");
    expect(rows[0]?.listing?.first_image_alt).toBe("first");
    expect(rows[0]?.listing?.category_name).toBe("Sports");

    expect(rows[0]?.availability).toBe("available");
    expect(rows[1]?.availability).toBe("sold");
    expect(rows[2]?.availability).toBe("closed");
    expect(rows[3]?.availability).toBe("archived");
    expect(rows[4]?.availability).toBe("removed");
    expect(rows[5]?.availability).toBe("removed");
    expect(rows[5]?.listing).toBeNull();
  });

  it("throws when getWishlist query fails", async () => {
    enqueueResponse({
      table: "wishlists",
      operation: "select",
      error: { message: "network error" },
    });

    await expect(getWishlist("user-1")).rejects.toThrow("Failed to fetch wishlist: network error");
  });

  it("validates isWishlisted input", async () => {
    await expect(isWishlisted("", "listing-1")).rejects.toThrow("User ID is required");
    await expect(isWishlisted("user-1", "")).rejects.toThrow("Listing ID is required");
  });

  it("returns true or false for isWishlisted based on returned rows", async () => {
    enqueueResponse({
      table: "wishlists",
      operation: "select",
      data: [{ id: "w1" }],
    });
    enqueueResponse({
      table: "wishlists",
      operation: "select",
      data: [],
    });

    await expect(isWishlisted("user-1", "listing-1")).resolves.toBe(true);
    await expect(isWishlisted("user-1", "listing-2")).resolves.toBe(false);
  });

  it("throws when isWishlisted query fails", async () => {
    enqueueResponse({
      table: "wishlists",
      operation: "select",
      error: { message: "db down" },
    });

    await expect(isWishlisted("user-1", "listing-1")).rejects.toThrow("Failed to check wishlist: db down");
  });
});
