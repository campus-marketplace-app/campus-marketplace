// Favorites service module.
// Manages rows in public.favorites (user ↔ listing many-to-many).

import { supabase } from "../supabase-client.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Favorite {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
  listing_title?: string; // Joined listing data so the frontend doesn't need extra calls.
  listing_price?: number | null;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

// Add a listing to the user's favorites.
// If already favorited, returns the existing row instead of throwing.
export async function addFavorite(userId: string, listingId: string): Promise<Favorite> {

  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  if (!listingId.trim()) {
    throw new Error("Listing ID is required");
  }

  // Check listing exists and isn't deleted.
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .is("deleted_at", null)
    .single();

  if (listingError || !listing) {
    throw new Error("Listing not found or has been deleted");
  }

  // Upsert so re-favoriting is a no-op that returns the existing row.
  const { data, error } = await supabase
    .from("favorites")
    .upsert(
      { user_id: userId, listing_id: listingId },
      { onConflict: "user_id,listing_id" },
    )
    .select("id,user_id,listing_id,created_at")
    .single<Favorite>();

  if (error) {
    throw new Error(`Failed to add favorite: ${error.message}`);
  }

  if (!data) {
    throw new Error("Add favorite did not return data");
  }

  return data; // The newly created or existing favorite row.
}

// Remove a listing from the user's favorites.
// Does nothing if the favorite doesn't exist (idempotent).
export async function removeFavorite(userId: string,listingId: string): Promise<void> {

  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  if (!listingId.trim()) {
    throw new Error("Listing ID is required");
  }

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("listing_id", listingId);

  if (error) {
    throw new Error(`Failed to remove favorite: ${error.message}`);
  }
}

// Get all favorited listings for a user, sorted newest-first.
// Joins listing title and price so the frontend can render the list without extra calls.
export async function getFavoritesByUser(userId: string): Promise<Favorite[]> {

  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  const { data, error } = await supabase
    .from("favorites")
    .select("id,user_id,listing_id,created_at,listings(title,price)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch favorites: ${error.message}`);
  }

  // Flatten the joined listing data into the Favorite shape.
  const favorites: Favorite[] = (data ?? []).map((row: Record<string, unknown>) => {
    const listing = row.listings as { title?: string; price?: number | null } | null;
    return {
      id: row.id as string,
      user_id: row.user_id as string,
      listing_id: row.listing_id as string,
      created_at: row.created_at as string,
      listing_title: listing?.title,
      listing_price: listing?.price ?? null,
    };
  });

  return favorites; //Returns an array of the user's favorites, with listing title and price included. Empty array if none found.
}

// Check whether a user has favorited a specific listing.
export async function isFavorited(userId: string,listingId: string): Promise<boolean> {

  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  if (!listingId.trim()) {
    throw new Error("Listing ID is required");
  }

  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("listing_id", listingId)
    .limit(1);

  if (error) {
    throw new Error(`Failed to check favorite: ${error.message}`);
  }

  return (data ?? []).length > 0; // True if a favorite row exists, false otherwise.
}
