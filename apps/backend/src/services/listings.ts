import { supabase } from "../supabase-client.js";

// enum types for listings found in supabase schema. Keep in sync with DB and frontend types.
export type ListingType = "item" | "service";
export type ListingStatus = "draft" | "active" | "closed" | "sold" | "archived";
export type ItemCondition = "new" | "like_new" | "good" | "fair" | "poor";

// Aligned with public.listings + related joined fields.
export interface Listing {
  id: string;
  user_id: string;
  type: ListingType;
  title: string;
  description: string;
  price: number | null;
  price_unit: string | null;
  category_id: string | null;
  status: ListingStatus;
  location: string | null;
  created_at: string;
  updated_at: string;
}

// Input accepted by createListing.
export interface CreateListingInput {
  user_id: string;
  type?: ListingType; //optional as it defaults to "item"
  title: string;
  description?: string; // optional as it defaults to empty string
  price?: number | null;
  price_unit?: string | null; // optional as it defaults to null
  category_id?: string | null;
  status?: ListingStatus; // optional as it defaults to "active"
  location?: string | null; // optional as it defaults to null
}

// Input accepted by updateListing. All fields optional to allow partial updates.
export interface UpdateListingInput {
  title?: string;
  description?: string;
  price?: number | null;
  price_unit?: string | null;
  category_id?: string | null;
  status?: ListingStatus;
  location?: string | null;
}

//If listing is an item.
export interface ItemDetails {
  condition: ItemCondition;
  quantity: number;
}

// If listing is a service.
export interface ServiceDetails {
  duration_minutes: number | null;
  price_unit: string | null;
  available_from: string | null; // "HH:MM:SS"
  available_to: string | null;
}

export interface ListingImage {
  id: string;
  path: string;
  alt_text: string | null;
  order_no: number;
}

export interface ListingTag {
  id: string;
  name: string;
}

// Full listing with all related data — used by detail pages.
export interface ListingWithDetails extends Listing {
  item_details: ItemDetails | null;
  service_details: ServiceDetails | null;
  images: ListingImage[];
  tags: ListingTag[];
  category_name: string | null;
}

// Options for searchListings function.
export interface SearchListingsOptions {
  query?: string; // Full-text search term
  type?: ListingType;
  status?: ListingStatus; // Defaults to "active"
  category_id?: string;
  min_price?: number;
  max_price?: number;
  user_id?: string; // Filter to one user's listings
  limit?: number; // Default 50
  offset?: number; // Default 0
}

// Raw row shape returned from Supabase.
// price may come back as string depending on numeric handling, so we normalize it.
type ListingRow = {
  id: string;
  user_id: string;
  type: ListingType;
  title: string;
  description: string;
  price: number | string | null;
  price_unit: string | null;
  category_id: string | null;
  status: ListingStatus;
  location: string | null;
  created_at: string;
  updated_at: string;
};

// Converts DB row values to app-facing Listing shape.
function mapListingRow(row: ListingRow): Listing {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    description: row.description,
    price:
      row.price === null
        ? null
        : typeof row.price === "number"
          ? row.price
          : Number(row.price),
    price_unit: row.price_unit,
    category_id: row.category_id,
    status: row.status,
    location: row.location,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Centralized select list so all queries return a consistent Listing shape.
const listingSelect =
  "id,user_id,type,title,description,price,price_unit,category_id,status,location,created_at,updated_at";

// Select string for getListingWithDetails — fetches all related data in one round-trip.
const detailsSelect = `
  ${listingSelect},
  item_details(condition, quantity),
  service_details(duration_minutes, price_unit, available_from, available_to),
  listing_images(id, path, alt_text, order_no),
  listing_tags(tags(id, name)),
  categories(name)
`;

// Verifies that listingId exists, is not deleted, and belongs to userId.
// Throws if ownership check fails — used before mutating related tables.
async function verifyListingOwnership(listingId: string, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    throw new Error("Listing not found or you do not have permission to modify it");
  }
}

// Reads a single listing by ID.
export async function getListingById(id: string): Promise<Listing> {
  if (!id.trim()) {
    throw new Error("Listing ID is required");
  }

  // Excludes soft-deleted rows.
  const { data, error } = await supabase
    .from("listings")
    .select(listingSelect)
    .eq("id", id)
    .is("deleted_at", null)
    .single<ListingRow>();

  if (error) {
    throw new Error(`Failed to fetch listing: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Listing not found for ID: ${id}`);
  }

  return mapListingRow(data);
}

// Creates a new listing.
export async function createListing(
  listing: CreateListingInput,
): Promise<Listing> {
  if (!listing.user_id.trim()) {
    throw new Error("Listing user_id is required");
  }

  if (!listing.title.trim()) {
    throw new Error("Listing title is required");
  }

  const payload = {
    user_id: listing.user_id,
    type: listing.type ?? "item",
    title: listing.title,
    description: listing.description ?? "",
    price: listing.price ?? null,
    price_unit: listing.price_unit ?? null,
    category_id: listing.category_id ?? null,
    status: listing.status ?? "draft",
    location: listing.location ?? null,
  };

  const { data, error } = await supabase
    .from("listings")
    .insert(payload)
    .select(listingSelect)
    .single<ListingRow>();

  if (error) {
    throw new Error(`Failed to create listing: ${error.message}`);
  }

  if (!data) {
    throw new Error("Listing creation did not return data");
  }

  return mapListingRow(data);
}

// Updates an existing listing. Ownership-checked: only the listing's owner can update.
export async function updateListing(
  id: string,
  userId: string,
  updates: UpdateListingInput,
): Promise<Listing> {
  if (!id.trim()) {
    throw new Error("Listing ID is required");
  }
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }
  if (updates.title !== undefined && !updates.title.trim()) {
    throw new Error("Listing title cannot be empty");
  }

  // Build payload with only defined fields to allow partial updates.
  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.price !== undefined) payload.price = updates.price;
  if (updates.price_unit !== undefined) payload.price_unit = updates.price_unit;
  if (updates.category_id !== undefined) payload.category_id = updates.category_id;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.location !== undefined) payload.location = updates.location;

  if (Object.keys(payload).length === 0) {
    throw new Error("No fields provided to update");
  }

  const { data, error } = await supabase
    .from("listings")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select(listingSelect)
    .single<ListingRow>();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Listing not found or you do not have permission to update it");
    }
    throw new Error(`Failed to update listing: ${error.message}`);
  }

  if (!data) {
    throw new Error("Listing not found or you do not have permission to update it");
  }

  return mapListingRow(data);
}

// Soft-deletes a listing. Ownership-checked: only the listing's owner can delete.
export async function deleteListing(id: string, userId: string): Promise<void> {
  if (!id.trim()) {
    throw new Error("Listing ID is required");
  }
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  const { error } = await supabase
    .from("listings")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Listing not found or you do not have permission to delete it");
    }
    throw new Error(`Failed to delete listing: ${error.message}`);
  }
}

// Returns all listings for a given user, optionally filtered by status.
export async function getListingsByUser(
  userId: string,
  status?: ListingStatus,
): Promise<Listing[]> {
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  let queryBuilder = supabase
    .from("listings")
    .select(listingSelect)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (status) {
    queryBuilder = queryBuilder.eq("status", status);
  }

  const { data, error } = await queryBuilder.returns<ListingRow[]>();

  if (error) {
    throw new Error(`Failed to fetch listings for user: ${error.message}`);
  }

  return (data ?? []).map(mapListingRow);
}

// Fetches a single listing with all related data (item/service details, images, tags).
export async function getListingWithDetails(
  id: string,
): Promise<ListingWithDetails> {
  if (!id.trim()) {
    throw new Error("Listing ID is required");
  }

  const { data, error } = await supabase
    .from("listings")
    .select(detailsSelect)
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error(`Listing not found for ID: ${id}`);
    }
    throw new Error(`Failed to fetch listing details: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Listing not found for ID: ${id}`);
  }

  // Flatten listing_tags[].tags → ListingTag[].
  // Supabase infers nested relations as arrays without generated types, so handle both shapes.
  const tags: ListingTag[] = ((data.listing_tags ?? []) as Array<{ tags: unknown }>).flatMap(
    (lt) => {
      if (!lt.tags) return [];
      const items = Array.isArray(lt.tags) ? (lt.tags as ListingTag[]) : [lt.tags as ListingTag];
      return items.filter((t) => t && t.id && t.name);
    },
  );

  // Sort images by order_no ascending.
  const images: ListingImage[] = [...(data.listing_images ?? [])].sort(
    (a: ListingImage, b: ListingImage) => a.order_no - b.order_no,
  );

  // Lift categories.name → category_name.
  const category_name =
    data.categories && typeof data.categories === "object" && "name" in data.categories
      ? (data.categories as { name: string }).name
      : null;

  return {
    ...mapListingRow(data as unknown as ListingRow),
    item_details: (data.item_details as unknown as ItemDetails) ?? null,
    service_details: (data.service_details as unknown as ServiceDetails) ?? null,
    images,
    tags,
    category_name,
  };
}

// Upserts item details for a listing. Ownership-checked via user_id join.
export async function upsertItemDetails(
  listingId: string,
  userId: string,
  details: ItemDetails,
): Promise<ItemDetails> {
  if (!listingId.trim()) {
    throw new Error("Listing ID is required");
  }
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }
  if (!details.condition) {
    throw new Error("Item condition is required");
  }
  if (details.quantity < 1) {
    throw new Error("Item quantity must be at least 1");
  }

  await verifyListingOwnership(listingId, userId);

  const { data, error } = await supabase
    .from("item_details")
    .upsert(
      { listing_id: listingId, condition: details.condition, quantity: details.quantity },
      { onConflict: "listing_id" },
    )
    .select("condition,quantity")
    .single();

  if (error) {
    throw new Error(`Failed to upsert item details: ${error.message}`);
  }

  return data as ItemDetails;
}

// Upserts service details for a listing. Ownership-checked via user_id join.
export async function upsertServiceDetails(
  listingId: string,
  userId: string,
  details: ServiceDetails,
): Promise<ServiceDetails> {
  if (!listingId.trim()) {
    throw new Error("Listing ID is required");
  }
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  await verifyListingOwnership(listingId, userId);

  const { data, error } = await supabase
    .from("service_details")
    .upsert(
      {
        listing_id: listingId,
        duration_minutes: details.duration_minutes,
        price_unit: details.price_unit,
        available_from: details.available_from,
        available_to: details.available_to,
      },
      { onConflict: "listing_id" },
    )
    .select("duration_minutes,price_unit,available_from,available_to")
    .single();

  if (error) {
    throw new Error(`Failed to upsert service details: ${error.message}`);
  }

  return data as ServiceDetails;
}

// Filterable listing search with full-text support and pagination.
export async function searchListings(
  options: SearchListingsOptions = {},
): Promise<Listing[]> {
  const {
    query,
    type,
    status,
    category_id,
    min_price,
    max_price,
    user_id,
    limit = 50,
    offset = 0,
  } = options;

  let queryBuilder = supabase
    .from("listings")
    .select(listingSelect)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Full-text search via GIN-indexed tsvector column.
  if (query?.trim()) {
    queryBuilder = queryBuilder.textSearch("tsv", query.trim(), {
      type: "websearch",
    });
  }

  // Optional filters.
  if (type) queryBuilder = queryBuilder.eq("type", type);
  if (category_id) queryBuilder = queryBuilder.eq("category_id", category_id);
  if (min_price !== undefined) queryBuilder = queryBuilder.gte("price", min_price);
  if (max_price !== undefined) queryBuilder = queryBuilder.lte("price", max_price);
  if (user_id) queryBuilder = queryBuilder.eq("user_id", user_id);

  // Default to active listings unless caller explicitly requests a status or scopes by user.
  if (status) {
    queryBuilder = queryBuilder.eq("status", status);
  } else if (!user_id) {
    queryBuilder = queryBuilder.eq("status", "active");
  }

  // Pagination.
  queryBuilder = queryBuilder.range(offset, offset + limit - 1);

  const { data, error } = await queryBuilder.returns<ListingRow[]>();

  if (error) {
    throw new Error(`Failed to search listings: ${error.message}`);
  }

  return (data ?? []).map(mapListingRow);
}
