// Wishlist service module.
// Manages rows in public.wishlists (user ↔ listing many-to-many).
// Wishlist items are kept even after a listing is sold or removed so users
// can see what they saved and future alerting can reference those rows.

import { supabase } from "../supabase-client.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WishlistAvailability = "available" | "sold" | "closed" | "archived" | "removed";

export interface WishlistItem {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
}

/** Listing data attached to each wishlist item. null only if the listing was hard-deleted. */
export interface WishlistListing {
  id: string;
  title: string;
  price: number | null;
  price_unit: string | null;
  status: string;
  deleted_at: string | null;
  type: string;
  category_name: string | null;
  first_image_path: string | null;
  first_image_alt: string | null;
}

export interface WishlistItemWithListing extends WishlistItem {
  listing: WishlistListing | null;
  /** Computed from listing.status / deleted_at so the frontend doesn't need extra logic. */
  availability: WishlistAvailability;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Raw row shape from the Supabase nested select. */
type WishlistRow = {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
  listing: {
    id: string;
    title: string;
    price: number | string | null;
    price_unit: string | null;
    status: string;
    deleted_at: string | null;
    type: string;
    category: { name: string } | null;
    images: Array<{ path: string; alt_text: string | null; order_no: number }>;
  } | null;
};

function computeAvailability(
  listing: { status: string; deleted_at: string | null } | null,
): WishlistAvailability {
  if (!listing || listing.deleted_at !== null) return "removed";
  if (listing.status === "sold")     return "sold";
  if (listing.status === "closed")   return "closed";
  if (listing.status === "archived") return "archived";
  if (listing.status === "active")   return "available";
  return "removed"; // draft listings treated as unavailable to the wishlisting user
}

function mapRow(row: WishlistRow): WishlistItemWithListing {
  const l = row.listing;

  // Sort images by sort_order and take the first one.
  const sortedImages = l?.images
    ? [...l.images].sort((a, b) => a.order_no - b.order_no)
    : [];

  const listing: WishlistListing | null = l
    ? {
        id: l.id,
        title: l.title,
        price: l.price === null ? null : Number(l.price),
        price_unit: l.price_unit,
        status: l.status,
        deleted_at: l.deleted_at,
        type: l.type,
        category_name: l.category?.name ?? null,
        first_image_path: sortedImages[0]?.path ?? null,
        first_image_alt: sortedImages[0]?.alt_text ?? null,
      }
    : null;

  return {
    id: row.id,
    user_id: row.user_id,
    listing_id: row.listing_id,
    created_at: row.created_at,
    listing,
    availability: computeAvailability(listing),
  };
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

// Add a listing to the user's wishlist.
// If already wishlisted, returns the existing row instead of throwing.
export async function addToWishlist(userId: string, listingId: string): Promise<WishlistItem> {
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }
  if (!listingId.trim()) {
    throw new Error("Listing ID is required");
  }

  const { data, error } = await supabase
    .from("wishlists")
    .upsert(
      { user_id: userId, listing_id: listingId },
      { onConflict: "user_id,listing_id" },
    )
    .select("id,user_id,listing_id,created_at")
    .single<WishlistItem>();

  if (error) {
    throw new Error(`Failed to add to wishlist: ${error.message}`);
  }

  if (!data) {
    throw new Error("Add to wishlist did not return data");
  }

  return data;
}

// Remove a listing from the user's wishlist.
// Does nothing if the item is not in the wishlist (idempotent).
export async function removeFromWishlist(userId: string, listingId: string): Promise<void> {
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }
  if (!listingId.trim()) {
    throw new Error("Listing ID is required");
  }

  const { error } = await supabase
    .from("wishlists")
    .delete()
    .eq("user_id", userId)
    .eq("listing_id", listingId);

  if (error) {
    throw new Error(`Failed to remove from wishlist: ${error.message}`);
  }
}

// Get all wishlist items for a user, sorted newest-first.
// Joins listing data (title, price, status, first image, category) so the frontend
// can render the full wishlist in one call. Unavailable items are included so
// users can see sold/removed listings they saved.
export async function getWishlist(userId: string): Promise<WishlistItemWithListing[]> {
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  const { data, error } = await supabase
    .from("wishlists")
    .select(`
      id,
      user_id,
      listing_id,
      created_at,
      listing:listings (
        id,
        title,
        price,
        price_unit,
        status,
        deleted_at,
        type,
        category:categories ( name ),
        images:listing_images ( path, alt_text, order_no )
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch wishlist: ${error.message}`);
  }

  return ((data ?? []) as unknown as WishlistRow[]).map(mapRow);
}

// Check whether a listing is in the user's wishlist.
export async function isWishlisted(userId: string, listingId: string): Promise<boolean> {
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }
  if (!listingId.trim()) {
    throw new Error("Listing ID is required");
  }

  const { data, error } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", userId)
    .eq("listing_id", listingId)
    .limit(1);

  if (error) {
    throw new Error(`Failed to check wishlist: ${error.message}`);
  }

  return (data ?? []).length > 0;
}
