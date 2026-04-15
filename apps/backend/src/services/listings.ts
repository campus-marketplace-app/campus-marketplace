import { supabase } from "../supabase-client.js";
export * from "./listings.types.js";
import type {
  Listing,
  ListingStatus,
  ListingWithDetails,
  ListingPublishReadiness,
  ItemDetails,
  ServiceDetails,
  ListingImage,
  ListingImageContentType,
  ListingTag,
  CreateListingInput,
  PublishMissingField,
  UpdateListingInput,
  SearchListingsOptions,
  UploadListingImageOptions,
} from "./listings.types.js";

// ---------------------------------------------------------------------------
// Internal helpers — not exported
// ---------------------------------------------------------------------------

/**
 * Raw row shape returned from Supabase for the base `listings` table.
 * `price` may come back as a string depending on numeric handling, so we normalize it
 * in mapListingRow before returning to callers.
 */
type ListingRow = {
  id: string;
  user_id: string;
  type: "item" | "service";
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

type ListingImageRow = ListingImage & {
  deleted_at: string | null;
};

type ListingImageDeleteRow = {
  id: string;
  listing_id: string;
  path: string;
  deleted_at: string | null;
};

const LISTING_IMAGES_BUCKET = "listing-images";
const MAX_LISTING_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const allowedListingImageContentTypes: readonly ListingImageContentType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

/** Converts a raw DB row to the app-facing Listing shape, normalizing the numeric price. */
function mapListingRow(row: ListingRow): Listing {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    description: row.description,
    price: row.price === null ? null : Number(row.price),
    price_unit: row.price_unit,
    category_id: row.category_id,
    status: row.status,
    location: row.location,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Centralized column list so every query returns a consistent Listing shape.
const listingSelect =
  "id,user_id,type,title,description,price,price_unit,category_id,status,location,created_at,updated_at";

// Select string for getListingWithDetails — fetches all related data in one round-trip.
const detailsSelect = `
  ${listingSelect},
  item_details(condition, quantity, expires_at),
  service_details(duration_minutes, price_unit, available_from, available_to),
  listing_images(id, path, alt_text, order_no, deleted_at),
  listing_tags(tags(id, name)),
  categories(name)
`;

function getListingImageExtension(contentType: ListingImageContentType): string {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

function getBinarySize(file: Blob | ArrayBuffer | Uint8Array): number {
  if (file instanceof ArrayBuffer) {
    return file.byteLength;
  }
  if (file instanceof Uint8Array) {
    return file.byteLength;
  }
  return file.size;
}

const publishFieldLabels: Record<PublishMissingField, string> = {
  title: "Title",
  category_id: "Category",
  price: "Price",
  location: "Location",
  images: "At least one image",
  item_condition: "Item condition",
  item_quantity: "Item quantity",
  service_duration_minutes: "Service duration",
};

function getMissingPublishFields(
  listing: ListingWithDetails,
  updates: UpdateListingInput = {},
): PublishMissingField[] {
  const title = updates.title ?? listing.title;
  const categoryId = updates.category_id !== undefined ? updates.category_id : listing.category_id;
  const price = updates.price !== undefined ? updates.price : listing.price;
  const location = updates.location !== undefined ? updates.location : listing.location;

  const missingFields: PublishMissingField[] = [];

  if (!title.trim()) {
    missingFields.push("title");
  }

  if (!categoryId) {
    missingFields.push("category_id");
  }

  if (price === null) {
    missingFields.push("price");
  }

  if (!location || !location.trim()) {
    missingFields.push("location");
  }

  if (listing.images.length < 1) {
    missingFields.push("images");
  }

  if (listing.type === "item") {
    if (!listing.item_details?.condition) {
      missingFields.push("item_condition");
    }
    if (!listing.item_details || listing.item_details.quantity < 1) {
      missingFields.push("item_quantity");
    }
  }

  if (listing.type === "service") {
    if (!listing.service_details || listing.service_details.duration_minutes <= 0) {
      missingFields.push("service_duration_minutes");
    }
  }

  return missingFields;
}

/** Error thrown when attempting to publish an incomplete listing. */
export class ListingPublishValidationError extends Error {
  readonly code = "LISTING_PUBLISH_VALIDATION_FAILED";
  readonly missingFields: PublishMissingField[];

  constructor(missingFields: PublishMissingField[]) {
    const labels = missingFields.map((field) => publishFieldLabels[field]);
    super(`Cannot publish listing. Missing required fields: ${labels.join(", ")}`);
    this.name = "ListingPublishValidationError";
    this.missingFields = missingFields;
  }
}

// Verifies that a listing exists, is not soft-deleted, and belongs to the given user.
async function verifyListingOwnership(listingId: string, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Listing not found or you do not have permission to modify it");
    }
    throw new Error(`Database error while verifying listing ownership: ${error.message}`);
  }
  if (!data) {
    throw new Error("Listing not found or you do not have permission to modify it");
  }
}

// ---------------------------------------------------------------------------
// Exported service functions
// ---------------------------------------------------------------------------

/**
 * Reads a single listing by ID.
 *
 * id - UUID of the listing to fetch.(Not user_id)
 * returns The matching Listing record.
 * throws If the ID is empty, the listing does not exist, or it has been soft-deleted.
 */
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

/**
 * Creates a new listing.
 *
 * param listing - Input fields. user_id and title are required.
 * returns The created Listing record with DB-generated id, created_at, and updated_at.
 * throws If user_id or title is empty, or if the DB insert fails.
 */
export async function createListing(listing: CreateListingInput): Promise<Listing> {
  if (!listing.user_id.trim()) {
    throw new Error("Listing user_id is required");
  }

  if (!listing.title.trim()) {
    throw new Error("Listing title is required");
  }

  if (listing.price !== undefined && listing.price !== null && listing.price < 0) {
    throw new Error("Listing price cannot be negative");
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

/**
 * Updates an existing listing. Only the listing's owner may update it.
 *
 * param id - UUID of the listing to update.
 * param userId - UUID of the authenticated user performing the update.
 * param updates - Partial set of fields to change. Omitted fields are left unchanged.
 * returns The updated Listing record.
 * throws If id/userId are empty, no fields are provided, or the listing is not found/owned.
 */
export async function updateListing(id: string, userId: string, updates: UpdateListingInput): Promise<Listing> {
  if (!id.trim()) {
    throw new Error("Listing ID is required");
  }
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }
  if (updates.title !== undefined && !updates.title.trim()) {
    throw new Error("Listing title cannot be empty");
  }

  if (updates.price !== undefined && updates.price !== null && updates.price < 0) {
    throw new Error("Listing price cannot be negative");
  }

  // Build a partial update payload with only the fields that were provided, keeping the DB values unchanged for omitted fields.
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

  if (updates.status === "active") {
    const readiness = await getListingPublishReadiness(id, userId, updates);
    if (!readiness.isPublishable) {
      throw new ListingPublishValidationError(readiness.missingFields);
    }
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

/**
 * Checks whether a listing is complete enough to be published.
 *
 * param id - UUID of the listing to evaluate.
 * param userId - UUID of the authenticated user who must own the listing.
 * param updates - Optional partial listing updates to include in the readiness evaluation.
 */
export async function getListingPublishReadiness(
  id: string,
  userId: string,
  updates: UpdateListingInput = {},
): Promise<ListingPublishReadiness> {
  if (!id.trim()) {
    throw new Error("Listing ID is required");
  }
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  const listing = await getListingWithDetails(id);

  if (listing.user_id !== userId) {
    throw new Error("Listing not found or you do not have permission to update it");
  }

  const missingFields = getMissingPublishFields(listing, updates);

  return {
    isPublishable: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Publishes a listing by setting status to active after readiness validation.
 */
export async function publishListing(id: string, userId: string): Promise<Listing> {
  return updateListing(id, userId, { status: "active" });
}

/**
 * Unpublishes a listing by setting status back to draft.
 */
export async function unpublishListing(id: string, userId: string): Promise<Listing> {
  return updateListing(id, userId, { status: "draft" });
}

/**
 * Soft-deletes a listing by setting `deleted_at`. Only the listing's owner may delete it.
 *
 * param id - UUID of the listing to delete.
 * param userId - UUID of the authenticated user performing the delete.
 * throws If id/userId are empty, or the listing is not found/owned.
 */
export async function deleteListing(id: string, userId: string): Promise<void> {
  if (!id.trim()) {
    throw new Error("Listing ID is required");
  }
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  const { data, error } = await supabase
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

  if (!data) {
    throw new Error("Listing not found or you do not have permission to delete it");
  }
}

/**
 * Uploads an image object to Supabase Storage and creates a listing_images metadata row.
 * Only the listing owner may upload images.
 */
export async function uploadListingImage(
  listingId: string,
  userId: string,
  file: Blob | ArrayBuffer | Uint8Array,
  contentType: string,
  options: UploadListingImageOptions = {},
): Promise<ListingImage> {
  if (!listingId.trim()) {
    throw new Error("Listing ID is required");
  }
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  if (!allowedListingImageContentTypes.includes(contentType as ListingImageContentType)) {
    throw new Error("Unsupported image content type. Allowed types: image/jpeg, image/png, image/webp");
  }

  const fileSize = getBinarySize(file);
  if (fileSize > MAX_LISTING_IMAGE_SIZE_BYTES) {
    throw new Error("Listing image exceeds max size of 5 MB");
  }

  if (options.order_no !== undefined && (!Number.isInteger(options.order_no) || options.order_no < 0)) {
    throw new Error("Listing image order_no must be a non-negative integer");
  }

  await verifyListingOwnership(listingId, userId);

  let orderNo = options.order_no;
  if (orderNo === undefined) {
    const { data: lastImage, error: orderError } = await supabase
      .from("listing_images")
      .select("order_no")
      .eq("listing_id", listingId)
      .is("deleted_at", null)
      .order("order_no", { ascending: false })
      .limit(1)
      .maybeSingle<{ order_no: number }>();

    if (orderError) {
      throw new Error(`Failed to determine listing image order: ${orderError.message}`);
    }

    orderNo = (lastImage?.order_no ?? -1) + 1;
  }

  const extension = getListingImageExtension(contentType as ListingImageContentType);
  const filenamePrefix = options.filename?.trim() ? options.filename.trim().replace(/\.[^/.]+$/, "") : "image";
  const storagePath = `${listingId}/${filenamePrefix}-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(LISTING_IMAGES_BUCKET)
    .upload(storagePath, file, { contentType, upsert: false });

  if (uploadError) {
    throw new Error(`Failed to upload listing image: ${uploadError.message}`);
  }

  const { data, error } = await supabase
    .from("listing_images")
    .insert({
      listing_id: listingId,
      path: storagePath,
      alt_text: options.alt_text ?? null,
      order_no: orderNo,
    })
    .select("id,path,alt_text,order_no")
    .single<ListingImage>();

  if (error) {
    await supabase.storage.from(LISTING_IMAGES_BUCKET).remove([storagePath]);
    throw new Error(`Failed to save listing image metadata: ${error.message}`);
  }

  if (!data) {
    await supabase.storage.from(LISTING_IMAGES_BUCKET).remove([storagePath]);
    throw new Error("Listing image upload did not return metadata");
  }

  return data;
}

/**
 * Deletes listing image metadata and removes the underlying storage object.
 * Only the listing owner may delete images.
 */
export async function deleteListingImage(imageId: string, userId: string): Promise<void> {
  if (!imageId.trim()) {
    throw new Error("Listing image ID is required");
  }
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  const { data: imageRow, error: imageLookupError } = await supabase
    .from("listing_images")
    .select("id,listing_id,path,deleted_at")
    .eq("id", imageId)
    .single<ListingImageDeleteRow>();

  if (imageLookupError) {
    if (imageLookupError.code === "PGRST116") {
      throw new Error("Listing image not found or you do not have permission to delete it");
    }
    throw new Error(`Failed to fetch listing image: ${imageLookupError.message}`);
  }

  if (!imageRow || imageRow.deleted_at) {
    throw new Error("Listing image not found or you do not have permission to delete it");
  }

  await verifyListingOwnership(imageRow.listing_id, userId);

  const { error: removeError } = await supabase.storage
    .from(LISTING_IMAGES_BUCKET)
    .remove([imageRow.path]);

  if (removeError) {
    throw new Error(`Failed to delete listing image object: ${removeError.message}`);
  }

  const { error } = await supabase
    .from("listing_images")
    .delete()
    .eq("id", imageId)
    .is("deleted_at", null);

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Listing image not found or you do not have permission to delete it");
    }
    throw new Error(`Failed to delete listing image metadata: ${error.message}`);
  }

}

/**
 * Returns a public URL for a listing image path.
 */
export function getListingImageUrl(imagePath: string): string {
  const { data } = supabase.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(imagePath);
  return data.publicUrl;
}

/**
 * Returns all listings for a given user, sorted newest-first.
 *
 * param userId - UUID of the user whose listings to fetch.
 * param status - Optional status filter. Omit to return all statuses.
 * returns Array of Listing records (may be empty).
 * throws If userId is empty or the DB query fails.
 */
export async function getListingsByUser(userId: string, status?: ListingStatus): Promise<Listing[]> {
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  let query = supabase
    .from("listings")
    .select(listingSelect)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query.returns<ListingRow[]>();

  if (error) {
    throw new Error(`Failed to fetch listings for user: ${error.message}`);
  }

  const rows = data ?? [];
  return rows.map(mapListingRow);
}

/**
 * Fetches a single listing with all related data (item/service details, images, tags).
 * Use this for detail pages; use getListingById for list views.
 *
 * param id - UUID of the listing to fetch.
 * returns ListingWithDetails including joined item_details, service_details, images, and tags.
 * throws If the listing is not found or the DB query fails.
 */
export async function getListingWithDetails(id: string): Promise<ListingWithDetails> {
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

  // listing_tags is a junction table, so Supabase returns it as:
  //   [{ tags: { id, name } }, { tags: { id, name } }, ...]
  // We flatten that into a simple array of tag objects.
  // Why the Array.isArray guard: the shape of `lt.tags` can vary across Supabase client versions.
  const rawTags = (data.listing_tags ?? []) as Array<{ tags: unknown }>;
  const tags: ListingTag[] = rawTags.flatMap((lt) => {
    if (!lt.tags) return [];
    const items = Array.isArray(lt.tags) ? (lt.tags as ListingTag[]) : [lt.tags as ListingTag];
    return items.filter((t) => t && t.id && t.name);
  });

  // Supabase returns images in DB insertion order — sort by order_no so the display order is correct.
  const rawImages = (data.listing_images ?? []) as ListingImageRow[];
  const images: ListingImage[] = rawImages
    .filter((image) => image.deleted_at === null)
    .sort((a, b) => a.order_no - b.order_no)
    .map(({ id, path, alt_text, order_no }) => ({ id, path, alt_text, order_no }));

  // Supabase returns the joined category as { name: "Books" }.
  // We pull out just the name string (or null if no category is set).
  const categoryRow = data.categories as unknown as { name: string } | null;
  const category_name = categoryRow?.name ?? null;

  return {
    ...mapListingRow(data as unknown as ListingRow),
    item_details: (data.item_details as unknown as ItemDetails) ?? null,
    service_details: (data.service_details as unknown as ServiceDetails) ?? null,
    images,
    tags,
    category_name,
  };
}

/**
 * Upserts item details for a listing. Only the listing's owner may call this.
 *
 * param listingId - UUID of the listing.
 * param userId - UUID of the authenticated user (must own the listing).
 * param details - Item condition, quantity, and optional expiry timestamp.
 * returns The upserted ItemDetails record.
 * throws If required fields are missing, ownership fails, or the DB upsert fails.
 */
export async function upsertItemDetails(listingId: string, userId: string, details: ItemDetails): Promise<ItemDetails> {
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

  // Verify that the listing exists and belongs to the user before upserting details.
  await verifyListingOwnership(listingId, userId);

  const { data, error } = await supabase
    .from("item_details")
    .upsert(
      {
        listing_id: listingId,
        condition: details.condition,
        quantity: details.quantity,
        expires_at: details.expires_at ?? null,
      },
      { onConflict: "listing_id" },
    )
    .select("condition,quantity,expires_at")
    .single();

  if (error) {
    throw new Error(`Failed to upsert item details: ${error.message}`);
  }

  if (!data) {
    throw new Error("Item details upsert did not return data");
  }

  return data as ItemDetails;
}

/**
 * Upserts service details for a listing. Only the listing's owner may call this.
 *
 * param listingId - UUID of the listing.
 * param userId - UUID of the authenticated user (must own the listing).
 * param details - Service duration, price unit, and availability window.
 * returns The upserted ServiceDetails record.
 * throws If required fields are missing, ownership fails, or the DB upsert fails.
 */
export async function upsertServiceDetails(listingId: string, userId: string, details: ServiceDetails): Promise<ServiceDetails> {
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

  if (!data) {
    throw new Error("Service details upsert did not return data");
  }

  return data as ServiceDetails;
}

/**
 * Filterable listing search with full-text support and pagination.
 *
 * param options - Optional filters, pagination, and search term.
 * returns Array of Listing records matching the filters (may be empty).
 * throws If the DB query fails.
 */
export async function searchListings(options: SearchListingsOptions = {}): Promise<Listing[]> {
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

  // Prefix full-text search via GIN-indexed tsvector column.
  // Each word gets :* appended so "boo" matches "book", "calc" matches "calculus", etc.
  // Omitting `type` makes Supabase use to_tsquery, which supports the :* prefix syntax.
  if (query?.trim()) {
    const prefixQuery = query
      .trim()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""))
      .filter(Boolean)
      .map((w) => `${w}:*`)
      .join(" & ");

    if (prefixQuery) {
      // config: "simple" skips dictionary stemming so short prefixes like "t" aren't dropped.
      queryBuilder = queryBuilder.textSearch("tsv", prefixQuery, { config: "simple" });
    }
  }

  // Optional filters.
  if (type) queryBuilder = queryBuilder.eq("type", type);
  if (category_id) queryBuilder = queryBuilder.eq("category_id", category_id);
  if (min_price !== undefined) queryBuilder = queryBuilder.gte("price", min_price);
  if (max_price !== undefined) queryBuilder = queryBuilder.lte("price", max_price);
  if (user_id) queryBuilder = queryBuilder.eq("user_id", user_id);

  // Why we default to status="active" only when no user_id is given:
  // public browsing should only surface available listings, but a seller's own dashboard
  // needs to see all of their listings regardless of status.
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
