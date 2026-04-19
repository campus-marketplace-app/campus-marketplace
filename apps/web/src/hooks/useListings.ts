import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { searchListings, getListingWithDetails, getListingsByUser } from '@campus-marketplace/backend'

/** 5-minute stale time for all listing data. */
const LISTINGS_STALE_TIME = 5 * 60 * 1000

// --- Query key factories ---
// Centralised here so pages and mutations can reference the same keys.
export const listingKeys = {
  /** All listing-related cache entries. */
  all: ['listings'] as const,
  /** A search result page for a specific set of filters + offset. */
  search: (filters: object) => ['listings', 'search', filters] as const,
  /** The full details for a single listing by ID. */
  detail: (id: string) => ['listings', 'detail', id] as const,
  /** All listings owned by a user. */
  byUser: (userId: string) => ['listings', 'byUser', userId] as const,
}

// ---------------------------------------------------------------------------
// useSearchListings
// Fetches listings with infinite scroll support using useInfiniteQuery.
// All pages for a given set of filters are cached together under one key,
// so navigating away and back shows the cached pages instantly.
//
// filters: everything except offset — the query manages page offsets itself.
// ---------------------------------------------------------------------------
export function useSearchListings(filters: {
  query?: string
  category_id?: string
  type?: 'item' | 'service'
  min_price?: number
  max_price?: number
  limit: number
}) {
  return useInfiniteQuery({
    queryKey: listingKeys.search(filters),
    queryFn: async ({ pageParam }) => {
      const results = await searchListings({ ...filters, offset: pageParam as number })
      const detailed = await Promise.all(
        results.map((listing) => getListingWithDetails(listing.id)),
      )
      return { listings: detailed, hasMore: results.length === filters.limit }
    },
    initialPageParam: 0,
    // Return the next offset if there are more results, or undefined to stop.
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length * filters.limit : undefined,
    staleTime: LISTINGS_STALE_TIME,
  })
}

// ---------------------------------------------------------------------------
// useListingDetail
// Fetches full details for a single listing by ID.
// ---------------------------------------------------------------------------
export function useListingDetail(id: string | undefined) {
  return useQuery({
    queryKey: listingKeys.detail(id ?? ''),
    queryFn: () => getListingWithDetails(id!),
    staleTime: LISTINGS_STALE_TIME,
    enabled: !!id,
  })
}

// ---------------------------------------------------------------------------
// useListingsByUser
// Fetches all listings (basic + details) owned by a given user.
// ---------------------------------------------------------------------------
export function useListingsByUser(userId: string | undefined) {
  return useQuery({
    queryKey: listingKeys.byUser(userId ?? ''),
    queryFn: async () => {
      const listings = await getListingsByUser(userId!)
      const detailed = await Promise.all(
        listings.map((listing) => getListingWithDetails(listing.id)),
      )
      return detailed
    },
    staleTime: LISTINGS_STALE_TIME,
    enabled: !!userId,
  })
}

// ---------------------------------------------------------------------------
// useInvalidateListings
// Returns helpers to invalidate listing caches after mutations.
// Call invalidateAll() after creating/deleting a listing.
// Call invalidateDetail(id) after publishing/unpublishing/editing a listing.
// ---------------------------------------------------------------------------
export function useInvalidateListings() {
  const queryClient = useQueryClient()
  return {
    /** Invalidate every listing query (search, detail, byUser). */
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: listingKeys.all }),
    /** Invalidate the detail cache for one listing. */
    invalidateDetail: (id: string) =>
      queryClient.invalidateQueries({ queryKey: listingKeys.detail(id) }),
    /** Invalidate a user's own listings list. */
    invalidateByUser: (userId: string) =>
      queryClient.invalidateQueries({ queryKey: listingKeys.byUser(userId) }),
  }
}
