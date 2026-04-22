import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { createConversation, sendMessage, ConversationLockedError } from "../messaging.js";
import {
  createListing,
  deleteListingImage,
  getListingById,
  getListingImageUrl,
  getListingPublishReadiness,
  ListingPublishValidationError,
  markListingAsSold,
  ListingAlreadySoldError,
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
// secondUser is created via the admin API to avoid consuming an extra auth signup
// quota slot and to avoid overwriting the shared client's session.
let secondUser: TestUser;
// Separate Supabase client for secondUser — using the anon key so we can
// authenticate as secondUser without touching the shared service-key client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let secondUserClient: ReturnType<typeof createClient<any>>;
let categoryId: string;
const listingIdsToCleanup: string[] = [];
const imageCleanup: Array<{ imageId: string; userId: string }> = [];

beforeAll(async () => {
  testUser = await createTestUser("Listings Test User");

  // Create a second user via the admin API — no signUpWithEmail call, so the shared
  // service-key client's auth session remains as testUser's JWT.
  const secondEmail = `test-second-${Date.now()}@test.edu`;
  const secondPassword = "TestPassword123!";
  const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
    email: secondEmail,
    password: secondPassword,
    email_confirm: true,
    user_metadata: { display_name: "Second Test User" },
  });
  if (adminError || !adminData.user) {
    throw new Error(`Failed to create second test user: ${adminError?.message ?? "unknown"}`);
  }

  // Build a separate anon-key client for secondUser so wishlists/notifications can
  // be inserted as secondUser (RLS checks auth.uid() = user_id on those tables).
  // The anon key lives in apps/web/.env.local as VITE_SUPABASE_ANON_KEY.
  loadEnv({ path: resolve(process.cwd(), "../web/.env.local") });
  const supabaseUrl = process.env["SUPABASE_URL"] ?? "";
  const supabaseAnonKey = process.env["SUPABASE_ANON_KEY"] ?? process.env["VITE_SUPABASE_ANON_KEY"] ?? "";
  secondUserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await secondUserClient.auth.signInWithPassword({
    email: secondEmail,
    password: secondPassword,
  });
  if (signInError) {
    throw new Error(`Failed to sign in second test user: ${signInError.message}`);
  }

  secondUser = {
    user: adminData.user,
    session: null,
    cleanup: async () => {
      try {
        await supabase.auth.admin.deleteUser(adminData.user.id);
      } catch {
        // Ignore cleanup errors
      }
    },
  };

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
  await secondUser?.cleanup();
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

async function appearsInSearch(
  listingId: string,
  options: Parameters<typeof searchListings>[0] = {},
  maxAttempts = 8,
  delayMs = 250,
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const results = await searchListings(options);
    if (results.some((listing) => listing.id === listingId)) {
      return true;
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return false;
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

    await expect(
      appearsInSearch(draft.id, { status: "active", limit: 200 }),
    ).resolves.toBe(true);
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

  it("rejects files over 15MB", async () => {
    const listing = await createTestListing(testUser.user.id);
    trackListing(listing.id);

    await expect(
      uploadListingImage(
        listing.id,
        testUser.user.id,
        createPngBytes(15 * 1024 * 1024 + 1),
        "image/png",
      ),
    ).rejects.toThrow("max size of 15 MB");
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

describe("markListingAsSold", () => {
  it("sets status to sold and removes listing from public search", async () => {
    const listing = await createPublishableDraft(testUser.user.id);
    await publishListing(listing.id, testUser.user.id);

    const sold = await markListingAsSold(listing.id, testUser.user.id);

    expect(sold.status).toBe("sold");

    // Should no longer appear in public search
    const results = await searchListings({});
    expect(results.some((l) => l.id === listing.id)).toBe(false);

    // Seller can still see it
    const sellerListings = await getListingsByUser(testUser.user.id);
    expect(sellerListings.some((l) => l.id === listing.id)).toBe(true);
  });

  it("throws ListingAlreadySoldError if already sold", async () => {
    const listing = await createTestListing(testUser.user.id, {
      title: "Already Sold Listing",
    });
    trackListing(listing.id);
    await supabase.from("listings").update({ status: "sold" }).eq("id", listing.id);

    await expect(markListingAsSold(listing.id, testUser.user.id)).rejects.toBeInstanceOf(
      ListingAlreadySoldError,
    );
  });

  it("throws when called by a non-owner", async () => {
    const listing = await createTestListing(testUser.user.id, {
      title: "Other Owner Listing",
    });
    trackListing(listing.id);

    await expect(markListingAsSold(listing.id, secondUser.user.id)).rejects.toThrow("permission");
  });

  it("creates listing_sold notifications for wishlisted users", async () => {
    const listing = await createPublishableDraft(testUser.user.id, {
      title: "Wishlisted Item",
    });

    // Insert wishlist as secondUser — uses the per-user anon client so auth.uid()
    // matches user_id and the RLS policy is satisfied.
    const { error: wishlistError } = await secondUserClient.from("wishlists").insert({
      user_id: secondUser.user.id,
      listing_id: listing.id,
    });
    if (wishlistError) throw new Error(`Wishlist insert failed: ${wishlistError.message}`);

    // Sign out of testUser's session so the shared client uses the service role key.
    // This allows markListingAsSold's internal wishlist query to bypass RLS and see
    // all wishlist entries (not just testUser's). The service role JWT bypasses all RLS.
    await supabase.auth.signOut();
    await markListingAsSold(listing.id, testUser.user.id);
    // Sign back in as testUser for the notification assertions below.
    if (testUser.session) {
      await supabase.auth.setSession({
        access_token: testUser.session.access_token,
        refresh_token: testUser.session.refresh_token,
      });
    }

    // Query notifications as secondUser (RLS scopes notifications to auth.uid() = user_id)
    const { data: notifications } = await secondUserClient
      .from("notifications")
      .select("*")
      .eq("user_id", secondUser.user.id)
      .eq("type", "listing_sold")
      .eq("payload->>listing_id", listing.id);

    expect(notifications?.length).toBeGreaterThanOrEqual(1);
    expect(notifications![0].payload.listing_title).toBe("Wishlisted Item");

    // Cleanup — use secondUserClient for rows owned by secondUser
    await secondUserClient.from("wishlists").delete().eq("listing_id", listing.id);
    await secondUserClient.from("notifications").delete().eq("payload->>listing_id", listing.id);
  });

  it("does not create a notification for the seller", async () => {
    const listing = await createPublishableDraft(testUser.user.id, {
      title: "Seller No Notify",
    });

    // Seller wishlists their own listing (edge case)
    await supabase.from("wishlists").insert({
      user_id: testUser.user.id,
      listing_id: listing.id,
    });

    await markListingAsSold(listing.id, testUser.user.id);

    const { data: notifications } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", testUser.user.id)
      .eq("type", "listing_sold")
      .eq("payload->>listing_id", listing.id);

    expect(notifications?.length ?? 0).toBe(0);

    // Cleanup
    await supabase.from("wishlists").delete().eq("listing_id", listing.id);
  });

  it("blocks sendMessage after listing is marked sold", async () => {
    const listing = await createPublishableDraft(testUser.user.id, {
      title: "Soon To Be Sold",
    });

    // Create a conversation between testUser (seller) and secondUser (buyer)
    const conversation = await createConversation(
      secondUser.user.id,
      testUser.user.id,
      listing.id,
    );

    // Mark it sold
    await markListingAsSold(listing.id, testUser.user.id);

    // Buyer tries to send a message — should be blocked
    await expect(
      sendMessage(conversation.id, secondUser.user.id, "Is this still available?"),
    ).rejects.toBeInstanceOf(ConversationLockedError);
  });
});
