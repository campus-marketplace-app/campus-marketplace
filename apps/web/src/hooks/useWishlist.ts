import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWishlist, addToWishlist, removeFromWishlist } from '@campus-marketplace/backend'
import type { WishlistItemWithListing } from '@campus-marketplace/backend'

/** 3-minute stale time — user-action driven data. */
const WISHLIST_STALE_TIME = 3 * 60 * 1000

// --- Query key factory ---
export const wishlistKeys = {
  all: ['wishlists'] as const,
  byUser: (userId: string) => ['wishlists', userId] as const,
}

// ---------------------------------------------------------------------------
// useWishlist
// Fetches the full wishlist for a user (with joined listing data).
// ---------------------------------------------------------------------------
export function useWishlist(userId: string | undefined) {
  return useQuery({
    queryKey: wishlistKeys.byUser(userId ?? ''),
    queryFn: () => getWishlist(userId!),
    staleTime: WISHLIST_STALE_TIME,
    enabled: !!userId,
  })
}

// ---------------------------------------------------------------------------
// useIsWishlisted
// Derives a boolean from the cached wishlist — no extra DB call.
// Returns false if the wishlist hasn't loaded yet.
// ---------------------------------------------------------------------------
export function useIsWishlisted(userId: string | undefined, listingId: string | undefined) {
  const { data: wishlist } = useWishlist(userId)
  if (!userId || !listingId || !wishlist) return false
  return wishlist.some((item) => item.listing_id === listingId)
}

// ---------------------------------------------------------------------------
// useAddToWishlist
// Mutation to add a listing to the user's wishlist.
// Invalidates the wishlist cache on success.
// ---------------------------------------------------------------------------
export function useAddToWishlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, listingId }: { userId: string; listingId: string }) =>
      addToWishlist(userId, listingId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.byUser(userId) })
    },
  })
}

// ---------------------------------------------------------------------------
// useRemoveFromWishlist
// Mutation to remove a listing from the user's wishlist.
// Optimistically removes the item from the cache, then invalidates to confirm.
// ---------------------------------------------------------------------------
export function useRemoveFromWishlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, listingId }: { userId: string; listingId: string }) =>
      removeFromWishlist(userId, listingId),
    onMutate: async ({ userId, listingId }) => {
      // Cancel any in-flight refetch so it doesn't overwrite our optimistic update.
      await queryClient.cancelQueries({ queryKey: wishlistKeys.byUser(userId) })

      // Snapshot the current cache value so we can roll back on error.
      const previous = queryClient.getQueryData(wishlistKeys.byUser(userId))

      // Optimistically remove the item from the cache immediately.
      queryClient.setQueryData(wishlistKeys.byUser(userId), (old: WishlistItemWithListing[] | undefined) =>
        old ? old.filter((item) => item.listing_id !== listingId) : old,
      )

      return { previous, userId }
    },
    onError: (_err, _vars, context) => {
      // Roll back the optimistic update if the mutation failed.
      if (context?.previous !== undefined) {
        queryClient.setQueryData(wishlistKeys.byUser(context.userId), context.previous)
      }
    },
    onSettled: (_data, _err, { userId }) => {
      // Always re-sync with the server after mutation completes or fails.
      queryClient.invalidateQueries({ queryKey: wishlistKeys.byUser(userId) })
    },
  })
}
