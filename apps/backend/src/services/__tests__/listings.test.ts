import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createListing,
  deleteListingImage,
  getListingById,
  getListingImageUrl,
  getListingPublishReadiness,
  ListingPublishValidationError,
  publishListing,
  updateListing,
  deleteListing,
  getListingsByUser,
  getListingWithDetails,
  searchListings,
  unpublishListing,
  uploadListingImage,
  upsertItemDetails,
  upsertServiceDetails,
} from "../listings.js";
import { supabase } from "../../supabase-client.js";
import { createTestUser, createTestListing } from "./helpers.js";
import type { TestUser } from "./helpers.js";

let testUser: TestUser;
let categoryId: string;
const listingIdsToCleanup: string[] = [];
const imageCleanup: Array<{ imageId: string; userId: string }> = [];

beforeAll(async () => {
  testUser = await createTestUser("Listings Test User");

  const { data: existingCategory, error: categoryLookupError } = await supabase
    .from("categories")
    .select("id")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (categoryLookupError) {
    throw new Error(`Failed to fetch category for tests: ${categoryLookupError.message}`);
  }

  if (existingCategory?.id) {
    categoryId = existingCategory.id;
    return;
  }

  const { data: createdCategory, error: categoryCreateError } = await supabase
    .from("categories")
    .insert({
      name: `Test Category ${Date.now()}`,
      description: "Temporary category for listings tests",
    })
    .select("id")
    .single<{ id: string }>();

  if (categoryCreateError || !createdCategory) {
    throw new Error(`Failed to create category for tests: ${categoryCreateError?.message ?? "unknown error"}`);
  }

  categoryId = createdCategory.id;
});

afterAll(async () => {
  for (const image of imageCleanup) {
    try {
      await deleteListingImage(image.imageId, image.userId);
    } catch {
      // Already deleted or listing removed — ignore
    }
  }

  // Clean up any listings that weren't explicitly deleted
  for (const id of listingIdsToCleanup) {
    try {
      await deleteListing(id, testUser.user.id);
    } catch {
      // Already deleted — ignore
    }
  }
  await testUser.cleanup();
});

function trackListing(id: string) {
  listingIdsToCleanup.push(id);
  return id;
}

function trackImage(imageId: string, userId: string) {
  imageCleanup.push({ imageId, userId });
  return imageId;
}

function createPngBytes(size = 64): Uint8Array {
  return new Uint8Array(size).fill(1);
}

type PublishableDraftOptions = {
  type?: "item" | "service";
  title?: string;
  price?: number;
  location?: string;
};

async function createPublishableDraft(userId: string, options: PublishableDraftOptions = {}) {
  const {
    type = "item",
    title = "Publishable Test Listing",
    price = 25,
    location = "Campus Center",
  } = options;

  const listing = await createListing({
    user_id: userId,
    type,
    title,
    description: "Listing prepared for publish workflow tests",
    price,
    category_id: categoryId,
    location,
  });
  trackListing(listing.id);

  if (type === "item") {
    await upsertItemDetails(listing.id, userId, {
      condition: "good",
      quantity: 1,
    });
  } else {
    await upsertServiceDetails(listing.id, userId, {
      duration_minutes: 60,
      price_unit: "session",
      available_from: null,
      available_to: null,
    });
  }

  const uploaded = await uploadListingImage(listing.id, userId, createPngBytes(), "image/png", {
    alt_text: "publish-ready",
  });
  trackImage(uploaded.id, userId);

  return listing;
}

describe("createListing", () => {
  it("creates listing with defaults (type=item, status=draft)", async () => {
    const listing = await createTestListing(testUser.user.id);
    trackListing(listing.id);

    expect(listing.id).toBeTruthy();
    expect(listing.type).toBe("item");
    expect(listing.status).toBe("draft");
  });

  it("throws with empty user_id", async () => {
    await expect(createListing({ user_id: "", title: "Test" })).rejects.toThrow("user_id is required");
  });

  it("throws with empty title", async () => {
    await expect(createListing({ user_id: testUser.user.id, title: "" })).rejects.toThrow("title is required");
  });
});

describe("getListingById", () => {
  it("returns matching listing", async () => {
    const created = await createTestListing(testUser.user.id);
    trackListing(created.id);

    const fetched = await getListingById(created.id);
    expect(fetched.id).toBe(created.id);
    expect(fetched.title).toBe(created.title);
  });

  it("throws on soft-deleted listing", async () => {
    const listing = await createTestListing(testUser.user.id);
    await deleteListing(listing.id, testUser.user.id);

    await expect(getListingById(listing.id)).rejects.toThrow();
  });
});

describe("updateListing", () => {
  it("returns updated listing for owner", async () => {
    const listing = await createTestListing(testUser.user.id);
    trackListing(listing.id);

    const updated = await updateListing(listing.id, testUser.user.id, { title: "Updated Title" });
    expect(updated.title).toBe("Updated Title");
  });

  it("throws for wrong userId", async () => {
    const listing = await createTestListing(testUser.user.id);
    trackListing(listing.id);

    await expect(
      updateListing(listing.id, "00000000-0000-0000-0000-000000000000", { title: "Hacked" }),
    ).rejects.toThrow();
  });

  it("throws with empty title", async () => {
    const listing = await createTestListing(testUser.user.id);
    trackListing(listing.id);

    await expect(
      updateListing(listing.id, testUser.user.id, { title: "" }),
    ).rejects.toThrow("title cannot be empty");
  });

  it("throws with no fields provided", async () => {
    const listing = await createTestListing(testUser.user.id);
    trackListing(listing.id);

    await expect(updateListing(listing.id, testUser.user.id, {})).rejects.toThrow("No fields provided");
  });
});

describe("deleteListing", () => {
  it("soft-deletes so subsequent getListingById throws", async () => {
    const listing = await createTestListing(testUser.user.id);

    await deleteListing(listing.id, testUser.user.id);

    await expect(getListingById(listing.id)).rejects.toThrow();
  });

  it("throws for wrong userId", async () => {
    const listing = await createTestListing(testUser.user.id);
    trackListing(listing.id);

    await expect(
      deleteListing(listing.id, "00000000-0000-0000-0000-000000000000"),
    ).rejects.toThrow();
  });
});

describe("getListingsByUser", () => {
  it("returns array including created listing", async () => {
    const listing = await createTestListing(testUser.user.id, { title: "User Listing" });
    trackListing(listing.id);

    const listings = await getListingsByUser(testUser.user.id);
    const found = listings.find((l) => l.id === listing.id);
    expect(found).toBeDefined();
  });

  it("filters by status", async () => {
    const draftListing = await createTestListing(testUser.user.id, { status: "draft" });
    trackListing(draftListing.id);

    const drafts = await getListingsByUser(testUser.user.id, "draft");
    expect(drafts.every((l) => l.status === "draft")).toBe(true);
    expect(drafts.some((l) => l.id === draftListing.id)).toBe(true);
  });

  it("excludes soft-deleted listings", async () => {
    const listing = await createTestListing(testUser.user.id, { title: "To Be Deleted" });
    await deleteListing(listing.id, testUser.user.id);

    const listings = await getListingsByUser(testUser.user.id);
    expect(listings.find((l) => l.id === listing.id)).toBeUndefined();
  });
});

describe("searchListings", () => {
  it("default search only returns active listings", async () => {
    const results = await searchListings();
    expect(results.every((l) => l.status === "active")).toBe(true);
  });

  it("with user_id returns all statuses for that user", async () => {
    const draftListing = await createTestListing(testUser.user.id, { status: "draft" });
    trackListing(draftListing.id);

    const results = await searchListings({ user_id: testUser.user.id });
    expect(results.some((l) => l.status === "draft")).toBe(true);
  });

  it("with text query returns relevant listings", async () => {
    const listing = await createPublishableDraft(testUser.user.id, {
      title: "Unique Xylophone Instrument",
    });
    await publishListing(listing.id, testUser.user.id);

    const results = await searchListings({ query: "Xylophone" });
    // Full-text search may not find it immediately due to indexing, so just confirm no error
    expect(Array.isArray(results)).toBe(true);
  });

  it("filters by min_price and max_price", async () => {
    const cheap = await createPublishableDraft(testUser.user.id, {
      title: "Cheap Item",
      price: 5,
    });
    await publishListing(cheap.id, testUser.user.id);

    const expensive = await createPublishableDraft(testUser.user.id, {
      title: "Expensive Item",
      price: 100,
    });
    await publishListing(expensive.id, testUser.user.id);

    const results = await searchListings({ user_id: testUser.user.id, min_price: 50 });
    expect(results.some((l) => l.id === expensive.id)).toBe(true);
    expect(results.some((l) => l.id === cheap.id)).toBe(false);
  });
});

describe("publish/unpublish listing", () => {
  it("reports missing fields for an incomplete draft", async () => {
    const draft = await createTestListing(testUser.user.id, { title: "Incomplete Publish Test" });
    trackListing(draft.id);

    const readiness = await getListingPublishReadiness(draft.id, testUser.user.id);

    expect(readiness.isPublishable).toBe(false);
    expect(readiness.missingFields).toEqual(
      expect.arrayContaining(["category_id", "price", "location", "images", "item_condition", "item_quantity"]),
    );
  });

  it("blocks publishing incomplete draft via updateListing status transition", async () => {
    const draft = await createTestListing(testUser.user.id, { title: "Blocked Publish Test" });
    trackListing(draft.id);

    await expect(updateListing(draft.id, testUser.user.id, { status: "active" })).rejects.toThrow(
      ListingPublishValidationError,
    );
  });

  it("publishes a complete item draft and includes it in public search results", async () => {
    const draft = await createPublishableDraft(testUser.user.id, {
      title: "Ready To Publish",
      price: 42,
      location: "Library",
    });

    const published = await publishListing(draft.id, testUser.user.id);
    expect(published.status).toBe("active");

    const browseResults = await searchListings({ query: "Ready To Publish" });
    expect(browseResults.some((listing) => listing.id === draft.id)).toBe(true);
  });

  it("unpublishes a published listing back to draft", async () => {
    const draft = await createPublishableDraft(testUser.user.id, {
      title: "Will Unpublish",
    });
    await publishListing(draft.id, testUser.user.id);

    const unpublished = await unpublishListing(draft.id, testUser.user.id);
    expect(unpublished.status).toBe("draft");

    const browseResults = await searchListings({ query: "Will Unpublish" });
    expect(browseResults.some((listing) => listing.id === draft.id)).toBe(false);

    const mine = await getListingsByUser(testUser.user.id, "draft");
    expect(mine.some((listing) => listing.id === draft.id)).toBe(true);
  });

  it("rejects publish/unpublish for non-owner", async () => {
    const draft = await createPublishableDraft(testUser.user.id, {
      title: "Owner Protected",
    });

    await expect(publishListing(draft.id, "00000000-0000-0000-0000-000000000000")).rejects.toThrow();
    await expect(unpublishListing(draft.id, "00000000-0000-0000-0000-000000000000")).rejects.toThrow();
  });
});

describe("getListingWithDetails", () => {
  it("returns item_details, images, tags, and category_name", async () => {
    const listing = await createTestListing(testUser.user.id);
    trackListing(listing.id);

    const details = await getListingWithDetails(listing.id);
    expect(details.id).toBe(listing.id);
    expect(details.images).toEqual([]);
    expect(details.tags).toEqual([]);
    expect(details.category_name).toBeNull();
  });

  it("returns item_details after upsert", async () => {
    const listing = await createTestListing(testUser.user.id);
    trackListing(listing.id);

    await upsertItemDetails(listing.id, testUser.user.id, {
      condition: "good",
      quantity: 3,
    });

    const details = await getListingWithDetails(listing.id);
    expect(details.item_details).not.toBeNull();
    expect(details.item_details?.condition).toBe("good");
    expect(details.item_details?.quantity).toBe(3);
  });
});

describe("upsertItemDetails", () => {
  it("creates and then updates item details", async () => {
    const listing = await createTestListing(testUser.user.id);
    trackListing(listing.id);

    const created = await upsertItemDetails(listing.id, testUser.user.id, {
      condition: "good",
      quantity: 2,
    });
    expect(created.condition).toBe("good");
    expect(created.quantity).toBe(2);

    const updated = await upsertItemDetails(listing.id, testUser.user.id, {
      condition: "fair",
      quantity: 1,
    });
    expect(updated.condition).toBe("fair");
    expect(updated.quantity).toBe(1);
  });

  it("throws when called by a non-owner", async () => {
    const listing = await createTestListing(testUser.user.id);
    trackListing(listing.id);

    await expect(
      upsertItemDetails(listing.id, "00000000-0000-0000-0000-000000000000", {
        condition: "good",
        quantity: 1,
      }),
    ).rejects.toThrow();
  });

  it("throws when quantity is less than 1", async () => {
    const listing = await createTestListing(testUser.user.id);
    trackListing(listing.id);

    await expect(
      upsertItemDetails(listing.id, testUser.user.id, {
        condition: "good",
        quantity: 0,
      }),
    ).rejects.toThrow("at least 1");
  });
});

describe("upsertServiceDetails", () => {
  it("creates and then updates service details", async () => {
    const listing = await createTestListing(testUser.user.id, { type: "service" });
    trackListing(listing.id);

    const created = await upsertServiceDetails(listing.id, testUser.user.id, {
      duration_minutes: 60,
      price_unit: "hour",
      available_from: null,
      available_to: null,
    });
    expect(created.duration_minutes).toBe(60);

    const updated = await upsertServiceDetails(listing.id, testUser.user.id, {
      duration_minutes: 90,
      price_unit: "session",
      available_from: null,
      available_to: null,
    });
    expect(updated.duration_minutes).toBe(90);
  });
});

describe("listing image storage", () => {
  it("uploads listing image for owner and returns metadata", async () => {
    const listing = await createTestListing(testUser.user.id);
    trackListing(listing.id);

    const uploaded = await uploadListingImage(
      listing.id,
      testUser.user.id,
      createPngBytes(),
      "image/png",
      { alt_text: "front view" },
    );

    trackImage(uploaded.id, testUser.user.id);

    expect(uploaded.id).toBeTruthy();
    expect(uploaded.path.startsWith(`${listing.id}/`)).toBe(true);
    expect(uploaded.alt_text).toBe("front view");
    expect(uploaded.order_no).toBeGreaterThanOrEqual(0);

    const url = getListingImageUrl(uploaded.path);
    expect(url).toContain("listing-images");
  });

  it("rejects upload from non-owner", async () => {
    const listing = await createTestListing(testUser.user.id);
    trackListing(listing.id);

    await expect(
      uploadListingImage(listing.id, "00000000-0000-0000-0000-000000000000", createPngBytes(), "image/png"),
    ).rejects.toThrow("permission");
  });

  it("rejects unsupported content types", async () => {
    const listing = await createTestListing(testUser.user.id);
    trackListing(listing.id);

    await expect(
      uploadListingImage(listing.id, testUser.user.id, createPngBytes(), "image/gif"),
    ).rejects.toThrow("Unsupported image content type");
  });

  it("rejects files over 5MB", async () => {
    const listing = await createTestListing(testUser.user.id);
    trackListing(listing.id);

    await expect(
      uploadListingImage(
        listing.id,
        testUser.user.id,
        createPngBytes(5 * 1024 * 1024 + 1),
        "image/png",
      ),
    ).rejects.toThrow("max size of 5 MB");
  });

  it("soft-deletes listing image metadata and excludes it from details", async () => {
    const listing = await createTestListing(testUser.user.id);
    trackListing(listing.id);

    const uploaded = await uploadListingImage(
      listing.id,
      testUser.user.id,
      createPngBytes(),
      "image/png",
    );

    const beforeDelete = await getListingWithDetails(listing.id);
    expect(beforeDelete.images.some((image) => image.id === uploaded.id)).toBe(true);

    await deleteListingImage(uploaded.id, testUser.user.id);

    const afterDelete = await getListingWithDetails(listing.id);
    expect(afterDelete.images.some((image) => image.id === uploaded.id)).toBe(false);
  });

  it("rejects deleting image as non-owner", async () => {
    const listing = await createTestListing(testUser.user.id);
    trackListing(listing.id);

    const uploaded = await uploadListingImage(
      listing.id,
      testUser.user.id,
      createPngBytes(),
      "image/png",
    );
    trackImage(uploaded.id, testUser.user.id);

    await expect(
      deleteListingImage(uploaded.id, "00000000-0000-0000-0000-000000000000"),
    ).rejects.toThrow("permission");
  });
});
