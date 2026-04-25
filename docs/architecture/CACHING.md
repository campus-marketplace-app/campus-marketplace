# Caching System

This document explains how the app caches data, which parts of the app are affected, and how to work with the cache when adding new features.

---

## Overview

The app uses **TanStack Query v5** (also known as React Query) as its caching layer. It runs entirely in the browser — the backend service layer is unchanged.

TanStack Query wraps the existing async service functions and automatically:
- Stores the result in memory after the first fetch
- Serves that stored result instantly on repeat visits (while still "fresh")
- Re-fetches in the background when data becomes "stale"
- Invalidates (clears) entries when a mutation changes the data
- Deduplicates requests — if two components ask for the same data at the same time, only one network call is made

For the Messages page, polling every 15 seconds has been replaced with a **Supabase Realtime subscription** on the conversations table. When a conversation is updated, the cache is invalidated immediately instead of waiting for the next poll.

---

## How the Cache Lifecycle Works

```
First visit to a page:
  → fetch from Supabase → store in cache → show to user

Revisit within the stale window:
  → serve from cache instantly (no network request)

Revisit after the stale window:
  → show cached data immediately (no spinner)
  → fetch fresh data in background
  → silently update the UI when fresh data arrives

User takes a write action (add, edit, delete):
  → write goes directly to Supabase
  → on success, invalidate the relevant cache entry
  → cache refetches and UI updates
```

**The cache lives in browser memory only.** A full page refresh (F5) clears it. This is intentional — a hard refresh means the user wants fresh data.

---

## Stale Times

"Stale time" is how long a cached result is considered fresh before a background refetch is triggered.

| Data | Stale Time | Reason |
|---|---|---|
| Browse listings (search results) | 5 min | Sellers don't update listings every few minutes |
| My listings (own listings list) | 5 min | Only changes on create/publish/delete — cache is invalidated on those actions |
| Listing detail (single listing page) | 5 min | Price/description edits are infrequent |
| Own user profile | 10 min | Rarely changes mid-session |
| Other user profiles (seller names on listing pages) | 10 min | Display names essentially never change |
| Wishlist | 3 min | User-action driven; shorter window to feel responsive |
| Conversations list (Messages sidebar) | 30 sec | Safety net only — Realtime subscription handles most updates instantly |
| Messages (individual conversation) | 0 (always stale) | Realtime subscription keeps these live |
| Categories | `Infinity` | Never changes (currently hardcoded anyway) |

The app-wide default is **5 minutes** (set in `apps/web/src/main.tsx`). Each hook overrides this where needed.

---

## Query Key Conventions

Every cached entry is identified by a **query key** — an array that uniquely names that data. This is how TanStack Query knows when two components want the same data, and what to invalidate after a mutation.

```ts
// Listings
['listings', 'search', { query: 'bike', category_id: '...', limit: 12, offset: 0 }]
['listings', 'detail', 'listing-uuid']
['listings', 'byUser', 'user-uuid']

// Profiles
['profiles', 'user-uuid']

// Wishlist
['wishlists', 'user-uuid']

// Conversations and messages
['conversations', 'byUser', 'user-uuid']
['conversations', 'messages', 'conversation-uuid']
```

The key factories are defined in each hook file:
- `listingKeys` → `apps/web/src/hooks/useListings.ts`
- `profileKeys` → `apps/web/src/hooks/useProfile.ts`
- `wishlistKeys` → `apps/web/src/hooks/useWishlist.ts`
- `conversationKeys` → `apps/web/src/hooks/useConversations.ts`

---

## Hook Reference

### `useListings.ts`
| Hook | What it fetches | Used in |
|---|---|---|
| `useSearchListings(filters)` | Paginated search results with full details | `index.tsx` |
| `useListingDetail(id)` | Full details for one listing | `listing.tsx` |
| `useListingsByUser(userId)` | All listings owned by a user (with details) | `my-listings.tsx` |
| `useInvalidateListings()` | Returns helpers to invalidate listing caches | `listing.tsx` |

### `useProfile.ts`
| Hook | What it fetches | Used in |
|---|---|---|
| `useProfile(userId)` | Profile for any user (own or another user's) | `sidebar-layout.tsx`, `profile.tsx`, `my-listings.tsx`, `listing.tsx` |
| `useUpdateProfile()` | Mutation: update profile fields | `profile.tsx` |
| `useUploadAvatar()` | Mutation: upload a new avatar image | `profile.tsx` |

### `useWishlist.ts`
| Hook | What it fetches | Used in |
|---|---|---|
| `useWishlist(userId)` | Full wishlist with joined listing data | `wishlist.tsx`, `listing.tsx` |
| `useIsWishlisted(userId, listingId)` | Boolean derived from wishlist cache — no extra DB call | `listing.tsx` |
| `useAddToWishlist()` | Mutation: add listing to wishlist | `listing.tsx` |
| `useRemoveFromWishlist()` | Mutation: remove listing from wishlist (optimistic) | `wishlist.tsx` |

### `useConversations.ts`
| Hook | What it fetches | Used in |
|---|---|---|
| `useConversations(userId)` | All conversations for a user | `messages.tsx` |
| `useMessages(conversationId)` | Messages in one conversation | (available, currently kept as manual fetch in messages.tsx to preserve realtime integration) |
| `useInvalidateConversations()` | Returns helper to invalidate conversation cache | `messages.tsx` |

---

## Cache Invalidation Rules

After a mutation, the relevant cache entries are invalidated so the UI shows fresh data.

| Action | What gets invalidated |
|---|---|
| Publish / unpublish a listing | `listingKeys.detail(id)`, `listingKeys.byUser(userId)` |
| Delete a listing | `listingKeys.detail(id)`, `listingKeys.byUser(userId)`, `listingKeys.all` |
| Add to wishlist | `wishlistKeys.byUser(userId)` |
| Remove from wishlist | `wishlistKeys.byUser(userId)` (optimistic update applied first) |
| Update profile | `profileKeys.detail(userId)` |
| Upload avatar | `profileKeys.detail(userId)` |
| Send message | `conversationKeys.byUser(userId)` |
| Archive conversation | `conversationKeys.byUser(userId)` |
| Conversation updated via Realtime | `conversationKeys.byUser(userId)` |

---

## Realtime + Cache Interaction

The Messages page previously polled `getConversationsByUser()` every 15 seconds. At 10 conversations, that was 52+ database queries per poll.

This has been replaced with a **Supabase Realtime subscription** (`subscribeToConversations` in `apps/backend/src/services/messaging.ts`). When any conversation the user is in is updated (new message sent, read status changed), the subscription fires and calls `invalidateConversations(userId)`, which triggers TanStack Query to refetch the conversation list.

Individual message content (inside an open conversation) still uses the existing realtime subscription (`subscribeToMessages`) — unchanged.

---

## Adding a New Cached Query

Follow this pattern to add caching to a new data type:

**1. Create a hook file** in `apps/web/src/hooks/`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMyData, updateMyData } from '@campus-marketplace/backend'

// Centralised key factory so mutations can reference the same key.
export const myDataKeys = {
  all: ['myData'] as const,
  detail: (id: string) => ['myData', id] as const,
}

// Read hook
export function useMyData(id: string | undefined) {
  return useQuery({
    queryKey: myDataKeys.detail(id ?? ''),
    queryFn: () => getMyData(id!),
    staleTime: 5 * 60 * 1000, // choose based on how often data changes
    enabled: !!id,
  })
}

// Write hook
export function useUpdateMyData() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: object }) =>
      updateMyData(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: myDataKeys.detail(id) })
    },
  })
}
```

**2. Use it in your page** instead of a manual `useEffect`:

```tsx
// Before (no cache)
const [data, setData] = useState(null)
useEffect(() => {
  getData(id).then(setData)
}, [id])

// After (cached)
const { data, isLoading } = useMyData(id)
```

**3. Add the query key to this doc** so future devs know what keys exist.

---

## DevTools

In development mode, a TanStack Query DevTools panel appears in the bottom-right corner of the app. Click it to see:
- All active cache entries and their keys
- Status of each query: `fresh`, `stale`, `fetching`, `error`
- The cached data itself
- When each entry was last fetched

This is the fastest way to verify caching is working correctly.
