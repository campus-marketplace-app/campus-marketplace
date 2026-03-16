// Listings service module.
// Frontend calls these functions through @campus-marketplace/backend.
// Each function should eventually query Supabase via the shared backend client.

import { supabase } from "../supabase-client.js";

// These mirror enum values in the database migration.
export type ListingType = "item" | "service";
export type ListingStatus = "draft" | "active" | "closed" | "sold" | "archived";

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
// Most fields are optional because defaults are applied server-side here.
export interface CreateListingInput {
  user_id: string;
  type?: ListingType;
  title: string;
  description?: string;
  price?: number | null;
  price_unit?: string | null;
  category_id?: string | null;
  status?: ListingStatus;
  location?: string | null;
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

// Reads a single listing by ID.
// Planned query flow: select from public.listings where id = _id.
export async function getListingById(_id: string): Promise<Listing> {
  // Guard clause to avoid unnecessary DB call and clearer caller errors.
  if (!_id.trim()) {
    throw new Error("Listing ID is required");
  }

  // Excludes soft-deleted rows.
  const { data, error } = await supabase
    .from("listings")
    .select(listingSelect)
    .eq("id", _id)
    .is("deleted_at", null)
    .single<ListingRow>();

  if (error) {
    // Re-throw with service-level context for easier debugging.
    throw new Error(`Failed to fetch listing: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Listing not found for ID: ${_id}`);
  }

  return mapListingRow(data);
}

// Creates a new listing.
// Planned query flow: insert into public.listings and return created row.
export async function createListing(
  _listing: CreateListingInput,
): Promise<Listing> {
  // Required by schema: listings.user_id is not null.
  if (!_listing.user_id.trim()) {
    throw new Error("Listing user_id is required");
  }

  // Required by schema: listings.title is not null.
  if (!_listing.title.trim()) {
    throw new Error("Listing title is required");
  }

  // Applies predictable defaults so frontend can send minimal payloads.
  const payload = {
    user_id: _listing.user_id,
    type: _listing.type ?? "item",
    title: _listing.title,
    description: _listing.description ?? "",
    price: _listing.price ?? null,
    price_unit: _listing.price_unit ?? null,
    category_id: _listing.category_id ?? null,
    status: _listing.status ?? "draft",
    location: _listing.location ?? null,
  };

  // Insert and immediately select the created row in one round-trip.
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

// Simple listing search by text query.
// Planned query flow: filter title/description or use tsvector search.
export async function searchListings(_query: string): Promise<Listing[]> {
  // Trimming avoids accidental "space-only" searches.
  const normalizedQuery = _query.trim();

  // Base query: active (not soft-deleted) listings, newest first.
  let queryBuilder = supabase
    .from("listings")
    .select(listingSelect)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Add case-insensitive text search only when a query is provided.
  if (normalizedQuery) {
    queryBuilder = queryBuilder.or(
      `title.ilike.%${normalizedQuery}%,description.ilike.%${normalizedQuery}%`,
    );
  }

  // returns<ListingRow[]>() keeps result typing explicit for TS.
  const { data, error } = await queryBuilder.returns<ListingRow[]>();

  if (error) {
    throw new Error(`Failed to search listings: ${error.message}`);
  }

  return (data ?? []).map(mapListingRow);
}
