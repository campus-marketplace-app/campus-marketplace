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

    chain.upsert = () => {
      operation = "insert";
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
  createListing,
  deleteListing,
  deleteListingImage,
  getListingPublishReadiness,
  getListingsByUser,
  getListingWithDetails,
  getListingById,
  getListingImageUrl,
  ListingAlreadySoldError,
  ListingPublishValidationError,
  markListingAsSold,
  searchListings,
  updateListing,
  uploadListingImage,
  upsertItemDetails,
  upsertServiceDetails,
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

  it("validates markListingAsSold required fields", async () => {
    await expect(markListingAsSold("", "u1")).rejects.toThrow("Listing ID is required");
    await expect(markListingAsSold("l1", "")).rejects.toThrow("User ID is required");
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

  it("validates uploadListingImage input branches", async () => {
    await expect(uploadListingImage("", "u1", new Uint8Array([1]), "image/png")).rejects.toThrow("Listing ID is required");
    await expect(uploadListingImage("l1", "", new Uint8Array([1]), "image/png")).rejects.toThrow("User ID is required");
    await expect(uploadListingImage("l1", "u1", new Uint8Array([1]), "text/plain")).rejects.toThrow(
      "Unsupported image content type. Allowed types: image/jpeg, image/png, image/webp",
    );
    await expect(uploadListingImage("l1", "u1", new Uint8Array(16 * 1024 * 1024), "image/png")).rejects.toThrow(
      "Listing image exceeds max size of 15 MB",
    );
    await expect(uploadListingImage("l1", "u1", new Uint8Array([1]), "image/png", { order_no: -1 })).rejects.toThrow(
      "Listing image order_no must be a non-negative integer",
    );
  });

  it("surfaces uploadListingImage ownership and storage upload errors", async () => {
    enqueueResponse({ table: "listings", operation: "select", error: { message: "missing", code: "PGRST116" } });
    await expect(uploadListingImage("l1", "u1", new Uint8Array([1]), "image/png")).rejects.toThrow(
      "Listing not found or you do not have permission to modify it",
    );

    enqueueResponse({ table: "listings", operation: "select", error: { message: "db fail", code: "DBERR" } });
    await expect(uploadListingImage("l1", "u1", new Uint8Array([1]), "image/png")).rejects.toThrow(
      "Database error while verifying listing ownership: db fail",
    );

    enqueueResponse({ table: "listings", operation: "select", data: { id: "l1" } });
    enqueueResponse({ table: "listing_images", operation: "select", data: { order_no: 0 } });
    state.uploadError = { message: "upload failed" };
    await expect(uploadListingImage("l1", "u1", new Uint8Array([1]), "image/png")).rejects.toThrow(
      "Failed to upload listing image: upload failed",
    );
  });

  it("covers getListingById failure branches", async () => {
    await expect(getListingById("")).rejects.toThrow("Listing ID is required");

    enqueueResponse({ table: "listings", operation: "select", error: { message: "query failed" } });
    await expect(getListingById("l1")).rejects.toThrow("Failed to fetch listing: query failed");

    enqueueResponse({ table: "listings", operation: "select", data: null });
    await expect(getListingById("l1")).rejects.toThrow("Listing not found for ID: l1");
  });

  it("covers deleteListing failure branches", async () => {
    await expect(deleteListing("", "u1")).rejects.toThrow("Listing ID is required");
    await expect(deleteListing("l1", "")).rejects.toThrow("User ID is required");

    enqueueResponse({ table: "listings", operation: "update", error: { message: "missing", code: "PGRST116" } });
    await expect(deleteListing("l1", "u1")).rejects.toThrow("Listing not found or you do not have permission to delete it");

    enqueueResponse({ table: "listings", operation: "update", error: { message: "delete failed", code: "DBERR" } });
    await expect(deleteListing("l1", "u1")).rejects.toThrow("Failed to delete listing: delete failed");

    enqueueResponse({ table: "listings", operation: "update", data: null });
    await expect(deleteListing("l1", "u1")).rejects.toThrow("Listing not found or you do not have permission to delete it");
  });

  it("covers deleteListingImage failure branches", async () => {
    await expect(deleteListingImage("", "u1")).rejects.toThrow("Listing image ID is required");
    await expect(deleteListingImage("img1", "")).rejects.toThrow("User ID is required");

    enqueueResponse({ table: "listing_images", operation: "select", error: { message: "not found", code: "PGRST116" } });
    await expect(deleteListingImage("img1", "u1")).rejects.toThrow("Listing image not found or you do not have permission to delete it");

    enqueueResponse({ table: "listing_images", operation: "select", data: { id: "img1", listing_id: "l1", path: "p", deleted_at: "2026" } });
    await expect(deleteListingImage("img1", "u1")).rejects.toThrow("Listing image not found or you do not have permission to delete it");

    enqueueResponse({ table: "listing_images", operation: "select", data: { id: "img1", listing_id: "l1", path: "p", deleted_at: null } });
    enqueueResponse({ table: "listings", operation: "select", data: { id: "l1" } });
    state.removeError = { message: "remove failed" };
    await expect(deleteListingImage("img1", "u1")).rejects.toThrow("Failed to delete listing image object: remove failed");

    state.removeError = null;
    enqueueResponse({ table: "listing_images", operation: "select", data: { id: "img1", listing_id: "l1", path: "p", deleted_at: null } });
    enqueueResponse({ table: "listings", operation: "select", data: { id: "l1" } });
    enqueueResponse({ table: "listing_images", operation: "delete", error: { message: "delete fail", code: "DBERR" } });
    await expect(deleteListingImage("img1", "u1")).rejects.toThrow("Failed to delete listing image metadata: delete fail");
  });

  it("covers searchListings query error and no-data branch", async () => {
    enqueueResponse({ table: "listings", operation: "select", error: { message: "search failed" } });
    await expect(searchListings({ query: "bike" })).rejects.toThrow("Failed to search listings: search failed");

    enqueueResponse({ table: "listings", operation: "select", data: null });
    await expect(searchListings({ query: "bike" })).resolves.toEqual([]);
  });

  it("covers createListing validation and persistence branches", async () => {
    await expect(createListing({ user_id: "", title: "x" })).rejects.toThrow("Listing user_id is required");
    await expect(createListing({ user_id: "u1", title: "" })).rejects.toThrow("Listing title is required");
    await expect(createListing({ user_id: "u1", title: "x", price: -1 })).rejects.toThrow("Listing price cannot be negative");

    enqueueResponse({ table: "listings", operation: "insert", error: { message: "insert failed" } });
    await expect(createListing({ user_id: "u1", title: "Bike" })).rejects.toThrow("Failed to create listing: insert failed");

    enqueueResponse({ table: "listings", operation: "insert", data: null });
    await expect(createListing({ user_id: "u1", title: "Bike" })).rejects.toThrow("Listing creation did not return data");
  });

  it("covers updateListing validation and update error branches", async () => {
    await expect(updateListing("", "u1", { title: "x" })).rejects.toThrow("Listing ID is required");
    await expect(updateListing("l1", "", { title: "x" })).rejects.toThrow("User ID is required");
    await expect(updateListing("l1", "u1", { title: "   " })).rejects.toThrow("Listing title cannot be empty");
    await expect(updateListing("l1", "u1", { price: -1 })).rejects.toThrow("Listing price cannot be negative");
    await expect(updateListing("l1", "u1", {})).rejects.toThrow("No fields provided to update");

    enqueueResponse({
      table: "listings",
      operation: "select",
      data: {
        id: "l1",
        user_id: "u1",
        type: "item",
        title: "",
        description: "d",
        price: null,
        price_unit: null,
        category_id: null,
        status: "draft",
        location: null,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        listing_images: [],
        listing_tags: [],
        categories: null,
        item_details: null,
        service_details: null,
      },
    });
    await expect(updateListing("l1", "u1", { status: "active" })).rejects.toBeInstanceOf(ListingPublishValidationError);

    enqueueResponse({ table: "listings", operation: "update", error: { message: "missing", code: "PGRST116" } });
    await expect(updateListing("l1", "u1", { title: "new" })).rejects.toThrow("Listing not found or you do not have permission to update it");

    enqueueResponse({ table: "listings", operation: "update", error: { message: "update fail", code: "DBERR" } });
    await expect(updateListing("l1", "u1", { title: "new" })).rejects.toThrow("Failed to update listing: update fail");

    enqueueResponse({ table: "listings", operation: "update", data: null });
    await expect(updateListing("l1", "u1", { title: "new" })).rejects.toThrow("Listing not found or you do not have permission to update it");
  });

  it("covers getListingPublishReadiness input and ownership branches", async () => {
    await expect(getListingPublishReadiness("", "u1")).rejects.toThrow("Listing ID is required");
    await expect(getListingPublishReadiness("l1", "")).rejects.toThrow("User ID is required");

    enqueueResponse({
      table: "listings",
      operation: "select",
      data: {
        id: "l1",
        user_id: "u2",
        type: "item",
        title: "Bike",
        description: "d",
        price: 10,
        price_unit: null,
        category_id: "c1",
        status: "draft",
        location: "NJ",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        listing_images: [{ id: "i1", path: "p", alt_text: null, order_no: 1, deleted_at: null }],
        listing_tags: [],
        categories: { name: "Books" },
        item_details: { condition: "good", quantity: 1, expires_at: null },
        service_details: null,
      },
    });
    await expect(getListingPublishReadiness("l1", "u1")).rejects.toThrow("Listing not found or you do not have permission to update it");
  });

  it("covers getListingsByUser and getListingWithDetails branches", async () => {
    await expect(getListingsByUser("", "active")).rejects.toThrow("User ID is required");

    enqueueResponse({ table: "listings", operation: "select", error: { message: "fetch failed" } });
    await expect(getListingsByUser("u1", "active")).rejects.toThrow("Failed to fetch listings for user: fetch failed");

    enqueueResponse({ table: "listings", operation: "select", data: [] });
    await expect(getListingsByUser("u1")).resolves.toEqual([]);

    await expect(getListingWithDetails("")).rejects.toThrow("Listing ID is required");

    enqueueResponse({ table: "listings", operation: "select", error: { message: "missing", code: "PGRST116" } });
    await expect(getListingWithDetails("l1")).rejects.toThrow("Listing not found for ID: l1");

    enqueueResponse({ table: "listings", operation: "select", error: { message: "boom", code: "DBERR" } });
    await expect(getListingWithDetails("l1")).rejects.toThrow("Failed to fetch listing details: boom");

    enqueueResponse({ table: "listings", operation: "select", data: null });
    await expect(getListingWithDetails("l1")).rejects.toThrow("Listing not found for ID: l1");

    enqueueResponse({
      table: "listings",
      operation: "select",
      data: {
        id: "l1",
        user_id: "u1",
        type: "item",
        title: "Bike",
        description: "d",
        price: "12.50",
        price_unit: null,
        category_id: "c1",
        status: "active",
        location: "NJ",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        listing_images: [
          { id: "i2", path: "p2", alt_text: null, order_no: 2, deleted_at: null },
          { id: "i1", path: "p1", alt_text: null, order_no: 1, deleted_at: null },
          { id: "i3", path: "p3", alt_text: null, order_no: 3, deleted_at: "2026" },
        ],
        listing_tags: [{ tags: { id: "t1", name: "tag1" } }, { tags: null }],
        categories: { name: "Books" },
        item_details: { condition: "good", quantity: 1, expires_at: null },
        service_details: null,
      },
    });

    const details = await getListingWithDetails("l1");
    expect(details.price).toBe(12.5);
    expect(details.images.map((i) => i.id)).toEqual(["i1", "i2"]);
    expect(details.tags).toEqual([{ id: "t1", name: "tag1" }]);
    expect(details.category_name).toBe("Books");
  });

  it("covers upsert item/service detail validation and failure branches", async () => {
    await expect(upsertItemDetails("", "u1", { condition: "good", quantity: 1, expires_at: null })).rejects.toThrow("Listing ID is required");
    await expect(upsertItemDetails("l1", "", { condition: "good", quantity: 1, expires_at: null })).rejects.toThrow("User ID is required");
    await expect(
      upsertItemDetails("l1", "u1", { condition: "" as never, quantity: 1, expires_at: null }),
    ).rejects.toThrow("Item condition is required");
    await expect(upsertItemDetails("l1", "u1", { condition: "good", quantity: 0, expires_at: null })).rejects.toThrow("Item quantity must be at least 1");

    enqueueResponse({ table: "listings", operation: "select", data: { id: "l1" } });
    enqueueResponse({ table: "item_details", operation: "insert", error: { message: "upsert fail" } });
    await expect(upsertItemDetails("l1", "u1", { condition: "good", quantity: 1, expires_at: null })).rejects.toThrow(
      "Failed to upsert item details: upsert fail",
    );

    enqueueResponse({ table: "listings", operation: "select", data: { id: "l1" } });
    enqueueResponse({ table: "item_details", operation: "insert", data: null });
    await expect(upsertItemDetails("l1", "u1", { condition: "good", quantity: 1, expires_at: null })).rejects.toThrow(
      "Item details upsert did not return data",
    );

    await expect(upsertServiceDetails("", "u1", { duration_minutes: 60, price_unit: "hour", available_from: null, available_to: null })).rejects.toThrow(
      "Listing ID is required",
    );
    await expect(upsertServiceDetails("l1", "", { duration_minutes: 60, price_unit: "hour", available_from: null, available_to: null })).rejects.toThrow(
      "User ID is required",
    );

    enqueueResponse({ table: "listings", operation: "select", data: { id: "l1" } });
    enqueueResponse({ table: "service_details", operation: "insert", error: { message: "svc fail" } });
    await expect(upsertServiceDetails("l1", "u1", { duration_minutes: 60, price_unit: "hour", available_from: null, available_to: null })).rejects.toThrow(
      "Failed to upsert service details: svc fail",
    );

    enqueueResponse({ table: "listings", operation: "select", data: { id: "l1" } });
    enqueueResponse({ table: "service_details", operation: "insert", data: null });
    await expect(upsertServiceDetails("l1", "u1", { duration_minutes: 60, price_unit: "hour", available_from: null, available_to: null })).rejects.toThrow(
      "Service details upsert did not return data",
    );
  });

  it("returns public listing image url", () => {
    state.publicUrl = "https://cdn.example/public/path.png";
    expect(getListingImageUrl("listing/path.png")).toBe("https://cdn.example/public/path.png");
  });
});
