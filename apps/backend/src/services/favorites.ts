// Favorites service module.
// Manages rows in public.favorites (user ↔ listing many-to-many).

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Favorite {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

// Add a listing to the user's favorites.
// If already favorited, returns the existing row instead of throwing.
export async function addFavorite(
  _userId: string,
  _listingId: string,
): Promise<Favorite> {
  void _userId;
  void _listingId;
  throw new Error("Not yet implemented");
}

// Remove a listing from the user's favorites.
export async function removeFavorite(
  _userId: string,
  _listingId: string,
): Promise<void> {
  void _userId;
  void _listingId;
  throw new Error("Not yet implemented");
}

// Get all favorited listings for a user, sorted newest-first.
export async function getFavoritesByUser(
  _userId: string,
): Promise<Favorite[]> {
  void _userId;
  throw new Error("Not yet implemented");
}

// Check whether a user has favorited a specific listing.
export async function isFavorited(
  _userId: string,
  _listingId: string,
): Promise<boolean> {
  void _userId;
  void _listingId;
  throw new Error("Not yet implemented");
}
