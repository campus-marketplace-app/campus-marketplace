//Shared type definitions for the listings service.

// Enum types — mirror DB CHECK constraints / pg enum values.

/** Whether the listing is a physical item or a service. */
export type ListingType = "item" | "service";

/** Lifecycle state of a listing. */
export type ListingStatus = "draft" | "active" | "closed" | "sold" | "archived";

/** Physical condition of an item listing. */
export type ItemCondition = "new" | "like_new" | "good" | "fair" | "poor";


/**
 * Base listing record, aligned with the `public.listings` table.
 * Returned by getListingById, createListing, updateListing, and searchListings.
 */
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


/**
 * Input accepted by createListing.
 * Only user_id and title are required; all other fields default to safe values.
 */
export interface CreateListingInput {
  user_id: string;
  type?: ListingType; //Defaults to "item" if not provided.
  title: string;
  description?: string;   //Defaults to ""
  price?: number | null;
  price_unit?: string | null;
  category_id?: string | null;
  status?: ListingStatus; //Defaults to "draft" if not provided.
  location?: string | null;
}

/**
 * Input accepted by updateListing. All fields are optional to allow partial updates.
 * Omitting a field leaves the existing DB value unchanged.
 */
export interface UpdateListingInput {
  title?: string;
  description?: string;
  price?: number | null;
  price_unit?: string | null;
  category_id?: string | null;
  status?: ListingStatus;
  location?: string | null;
}

/**
 * Details specific to item-type listings.
 */
export interface ItemDetails {
  condition: ItemCondition;
  quantity: number;
  expires_at?: string | null;
}

/**
 * Details specific to service-type listings.
 */
export interface ServiceDetails {
  duration_minutes: number; // Duration of the service in minutes.
  price_unit: string | null;
  available_from: string | null;
  available_to: string | null;
}

// One image attached to a listing.
export interface ListingImage {
  id: string;
  path: string;
  alt_text: string | null;
  order_no: number;
}

/** A tag associated with a listing via the `listing_tags` junction table. */
export interface ListingTag {
  id: string;
  name: string;
}

/**
 * Full listing with all related data — used by detail pages.
 * Returned by getListingWithDetails.
 */
export interface ListingWithDetails extends Listing {
  item_details: ItemDetails | null;
  service_details: ServiceDetails | null;
  images: ListingImage[];
  tags: ListingTag[];
  category_name: string | null;
}


/**
 * Options for searchListings.
 * Empty object returns all by newst listings.
 * All filters are optional and can be combined as needed.
 */
export interface SearchListingsOptions {
  query?: string;       // Keyword search — matched against title (higher weight) and description (lower weight)
  type?: ListingType;   // Filter to items only or services only; omit to return both
  status?: ListingStatus; // Defaults to "active" when no user_id is given
  category_id?: string; // UUID of the category to filter by
  min_price?: number;   // Only return listings priced at or above this value
  max_price?: number;   // Only return listings priced at or below this value
  user_id?: string;     // Restrict to one seller's listings; also bypasses the default "active" status filter
  limit?: number;       // Max rows to return — defaults to 50
  offset?: number;      // Rows to skip for pagination (e.g. offset 20 + limit 20 = page 2)
}
