# Caching — A Full Explanation

This document explains what caching is, why we added it, how it works in this app specifically, and walks through every piece of code that was written to make it work. It is written for someone who understands React but has not worked with caching before.

---

## Part 1 — What is caching and why does it matter here?

Every time a user opens a page in this app, the app asks the Supabase database for data. That round-trip — send a request, wait for the database to respond, receive the answer — takes time. On a fast connection it might be 100–300ms. On a slow one it can be a full second or more.

Before caching was added, this happened on **every single page visit**, even if the data hadn't changed at all. Open the home page — fetch all listings. Click a listing — fetch it again. Go back to the home page — fetch all listings again. None of those previous answers were saved anywhere.

Caching solves this by saving answers on the device after the first fetch. The next time the same data is needed, the saved copy is used instead of going to the database again.

The benefit isn't just speed. The messaging page was also **polling** — asking the database "anything new?" on a repeating timer every 15 seconds. With 10 conversations open, that was 52+ database calls per minute, constantly, whether anything changed or not. Caching combined with real-time updates eliminated that entirely.

---

## Part 2 — The library we used: TanStack Query

We use a library called **TanStack Query** (also called React Query) to manage the cache. You could write your own caching logic with `useState` and `useEffect`, but it would be hundreds of lines of code and easy to get wrong. TanStack Query handles all of it.

Here is what it does automatically:

- Saves the result of any database call in memory after the first fetch
- Serves that saved result instantly on repeat visits (while it's still "fresh")
- Re-fetches in the background when data becomes "stale" (more on stale times below)
- Throws away a saved result when you tell it the data has changed (this is called **invalidation**)
- Deduplicates requests — if two parts of the page ask for the same data at the same time, only one database call is made

### What is a "stale time"?

Every saved result has a freshness window. "Stale time" is how long the saved answer is considered current before the library decides it should ask the database for a newer copy.

When data is within its stale time: serve from cache instantly, no database call.
When data is past its stale time: show the saved copy immediately (no spinner), but also ask the database for fresh data in the background. When the new answer arrives, the page updates quietly.

This means **the user never sees a blank page or a spinner caused by caching** — they always see something immediately.

### What is a "query key"?

Every saved result needs a label so the library can find it later. That label is called a **query key**. It's just an array of values that uniquely describes what was fetched.

For example:
- `["listings", "search", { limit: 12 }]` — the home page listings with no filters
- `["listings", "search", { limit: 12, query: "bike" }]` — listings filtered by "bike"
- `["listings", "detail", "abc-123"]` — the full details for one specific listing
- `["profiles", "user-uuid-here"]` — one user's profile
- `["wishlists", "user-uuid-here"]` — one user's wishlist

Two different filters = two different query keys = two separate saved results. The library knows they're different things.

### What is "invalidation"?

When you do something that changes data — like removing a listing from your wishlist — the saved copy of your wishlist is now wrong. **Invalidation** is how you tell the library "throw away that entry." The next time anything reads that data, it will fetch fresh from the database.

---

## Part 3 — Setup: `apps/web/src/main.tsx`

Before any caching works, TanStack Query needs to be set up once at the top of the app. This is done in `main.tsx`, which is the very first file that runs when the app starts.

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 minutes in milliseconds
      gcTime: 15 * 60 * 1000,    // 15 minutes
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})
```

**What each line means:**

`new QueryClient(...)` — creates the cache itself. Think of this as creating the notepad that all saved results get written to.

`staleTime: 5 * 60 * 1000` — the default freshness window is 5 minutes. Any data fetched will be considered current for 5 minutes before a background re-fetch is triggered. Individual hooks override this where needed (the wishlist uses 3 minutes, profiles use 10 minutes, etc.).

`gcTime: 15 * 60 * 1000` — "gc" stands for garbage collection. This controls how long an unused saved result stays in memory after nothing in the app is reading it anymore. If you leave the messages page and come back 14 minutes later, the conversation list is still in memory and loads instantly. After 15 minutes of not being read, it's cleared out to free up memory.

`refetchOnWindowFocus: true` — if the user switches to a different browser tab and then comes back, the library will quietly re-check any stale data. This is how data stays reasonably current even if someone has the app open in the background for a long time.

`retry: 1` — if a database call fails (network hiccup, temporary error), try once more before giving up.

```tsx
<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

`QueryClientProvider` wraps the entire app so that every component inside it can access the cache. This is the same pattern React uses for themes and authentication — a "provider" makes something available to the whole tree.

`ReactQueryDevtools` adds the floating panel in the bottom-right corner of the app (development only). It shows every saved result, its label, its current status (fresh / stale / loading / error), and the actual data inside it. This is the fastest way to confirm caching is working.

---

## Part 4 — The hook files

A **hook** in React is a function whose name starts with `use`. Hooks let components access shared logic and state. We created four hook files, one per area of the app. Each file contains:

1. A **query key factory** — a consistent way to generate the label for that type of data
2. One or more **read hooks** (`useQuery` or `useInfiniteQuery`) — these fetch and cache data
3. Zero or more **mutation hooks** (`useMutation`) — these write data and then invalidate the relevant cache entries

---

### `apps/web/src/hooks/useListings.ts`

This file handles everything related to listings.

#### Query key factory

```ts
export const listingKeys = {
  all: ['listings'] as const,
  search: (filters: object) => ['listings', 'search', filters] as const,
  detail: (id: string) => ['listings', 'detail', id] as const,
  byUser: (userId: string) => ['listings', 'byUser', userId] as const,
}
```

`listingKeys.all` — a label that covers every listing-related cache entry. Invalidating this throws away all saved listing data at once (used when deleting a listing, since it could affect any search result page).

`listingKeys.search(filters)` — a label for one specific set of search results. If filters change, the label changes, and the library knows to fetch new results rather than serve the old ones.

`listingKeys.detail(id)` — a label for one specific listing's full details. Each listing gets its own entry.

`listingKeys.byUser(userId)` — a label for all listings owned by one user.

The reason this is a centralized factory (instead of just writing the arrays directly in each hook) is so that when a mutation needs to invalidate a cache entry, it uses the exact same label the read hook used. If they don't match perfectly, the invalidation silently does nothing.

#### `useSearchListings` — the home page listings

```ts
export function useSearchListings(filters: {
  query?: string
  category_id?: string
  type?: 'item' | 'service'
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
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length * filters.limit : undefined,
    staleTime: LISTINGS_STALE_TIME,
  })
}
```

This uses `useInfiniteQuery` instead of the regular `useQuery`. The difference:

- `useQuery` — fetches one page of results and caches it
- `useInfiniteQuery` — fetches results in pages and caches **all pages together** under one label

This matters for the home page infinite scroll. When the user scrolls down and loads page 2, page 3, etc., those all get stored alongside page 1. If they navigate to the messages page and come back, all the pages they had already loaded are still there — they don't have to re-scroll to reload them.

`pageParam` is a number that starts at 0 and increases by `limit` (12) each page. The library manages this automatically.

`getNextPageParam` — after each page loads, this function decides what the next page offset should be. If the last page returned 12 results (a full page), there's probably more — return the next offset. If it returned fewer than 12, we're at the end — return `undefined` to stop.

`hasMore: results.length === filters.limit` — a simple way to detect "are there more pages?" If we asked for 12 and got 12, there might be more. If we got 11 or fewer, we've hit the end.

#### `useListingDetail` — a single listing page

```ts
export function useListingDetail(id: string | undefined) {
  return useQuery({
    queryKey: listingKeys.detail(id ?? ''),
    queryFn: () => getListingWithDetails(id!),
    staleTime: LISTINGS_STALE_TIME,
    enabled: !!id,
  })
}
```

`enabled: !!id` — this prevents the hook from running if `id` is undefined or an empty string. The `!!` converts a value to `true` or `false` (two exclamation marks = double negative = "is this truthy?"). Without this guard, the hook would try to fetch a listing with no ID the moment the component mounts, before the URL parameter is available.

#### `useInvalidateListings` — helpers to throw away cached listings

```ts
export function useInvalidateListings() {
  const queryClient = useQueryClient()
  return {
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: listingKeys.all }),
    invalidateDetail: (id: string) =>
      queryClient.invalidateQueries({ queryKey: listingKeys.detail(id) }),
    invalidateByUser: (userId: string) =>
      queryClient.invalidateQueries({ queryKey: listingKeys.byUser(userId) }),
  }
}
```

`useQueryClient()` gives a component access to the cache itself so it can call operations on it directly (like invalidation).

`invalidateQueries` marks a cache entry as stale immediately, which triggers a re-fetch the next time anything reads it. The `queryKey` you pass in acts as a filter — it will invalidate every saved result whose label starts with those values.

---

### `apps/web/src/hooks/useProfile.ts`

```ts
export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: profileKeys.detail(userId ?? ''),
    queryFn: () => getProfile(userId!),
    staleTime: PROFILE_STALE_TIME, // 10 minutes
    enabled: !!userId,
  })
}
```

The key insight here: `useProfile` is called in four separate places — the sidebar (to show the avatar), the profile page, the my-listings page, and the listing detail page (to show the seller's name). Before caching, each of those locations would fire its own separate database call. Now they all use the same label `["profiles", userId]`, so the first one to call it fetches from the database, and the other three read from the saved copy instantly.

#### `useUpdateProfile` and `useUploadAvatar` — write hooks

```ts
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, updates }) => updateProfile(userId, updates),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(userId) })
    },
  })
}
```

`useMutation` is TanStack Query's hook for write operations (creating, updating, deleting). Unlike `useQuery`, it doesn't run automatically — it runs when you call `mutate(...)` or `mutateAsync(...)`.

`mutationFn` — the actual database call to make.

`onSuccess` — runs after the database call succeeds. Here, it invalidates the cached profile for that user, so the sidebar avatar and profile page both re-fetch the updated data automatically.

---

### `apps/web/src/hooks/useWishlist.ts`

#### `useIsWishlisted` — no extra database call

```ts
export function useIsWishlisted(userId: string | undefined, listingId: string | undefined) {
  const { data: wishlist } = useWishlist(userId)
  if (!userId || !listingId || !wishlist) return false
  return wishlist.some((item) => item.listing_id === listingId)
}
```

Before caching, when a user opened a listing page, the app would make a separate database call just to answer the question "is this in their wishlist?" — a single yes/no question that cost a round-trip to the database.

Now, because the wishlist is already cached under `["wishlists", userId]`, this hook just looks through that saved data and returns the answer without touching the database. The wishlist is pre-loaded when the listing page mounts via `useWishlist(user?.id)`.

#### `useRemoveFromWishlist` — optimistic updates

```ts
export function useRemoveFromWishlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, listingId }) => removeFromWishlist(userId, listingId),
    onMutate: async ({ userId, listingId }) => {
      await queryClient.cancelQueries({ queryKey: wishlistKeys.byUser(userId) })
      const previous = queryClient.getQueryData(wishlistKeys.byUser(userId))
      queryClient.setQueryData(wishlistKeys.byUser(userId), (old) =>
        old ? old.filter((item) => item.listing_id !== listingId) : old,
      )
      return { previous, userId }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(wishlistKeys.byUser(context.userId), context.previous)
      }
    },
    onSettled: (_data, _err, { userId }) => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.byUser(userId) })
    },
  })
}
```

This is the most complex piece of code in the caching system. It uses **optimistic updates** — a technique where you update the UI immediately as if the operation succeeded, then confirm with the database in the background.

Step by step:

`onMutate` — runs *before* the database call.
- `cancelQueries` — stops any in-progress fetch for the wishlist. If the cache was in the middle of loading and we didn't stop it, the result that comes back would overwrite the change we're about to make.
- `getQueryData` — reads a snapshot of the current wishlist from the cache. This snapshot is the "rollback point."
- `setQueryData` — directly writes a modified version into the cache. Here, it filters out the item being removed. The wishlist page instantly shows the item as gone.
- `return { previous, userId }` — saves the snapshot so we can use it in case of error.

`onError` — runs if the database call fails.
- `setQueryData` with `context.previous` — puts the original wishlist back into the cache, undoing the change. The item re-appears on the page.

`onSettled` — runs after the database call finishes, whether it succeeded or failed.
- `invalidateQueries` — regardless of what happened, ask the database for the real current state of the wishlist and update the cache with the truth.

The result: clicking "Delete" on a wishlist item feels instant. The item disappears the moment you click. If the network was down and the delete actually failed, it would reappear.

---

### `apps/web/src/hooks/useConversations.ts`

```ts
export function useConversations(userId: string | undefined) {
  return useQuery({
    queryKey: conversationKeys.byUser(userId ?? ''),
    queryFn: () => getConversationsByUser(userId!),
    staleTime: CONVERSATIONS_STALE_TIME, // 30 seconds
    enabled: !!userId,
  })
}
```

The stale time here is only 30 seconds instead of 5 minutes. This is a safety net — the real reason updates are fast is the real-time subscription described below.

#### `useInvalidateConversations`

```ts
export function useInvalidateConversations() {
  const queryClient = useQueryClient()
  return {
    invalidate: (userId: string) =>
      queryClient.invalidateQueries({ queryKey: conversationKeys.byUser(userId) }),
  }
}
```

This is called from the messages page every time something changes — a new message arrives, a message is sent, a conversation is archived. Instead of updating an array in local state manually, it just throws away the cached conversation list and lets TanStack Query re-fetch it cleanly.

---

## Part 5 — How the pages changed

### Home page (`index.tsx`)

Before: a `useEffect` ran on every page visit, set a loading spinner, called the database, and set the results into local state. Every time you left and came back — even if nothing had changed — it started over from zero.

After:

```tsx
const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useSearchListings(filters);
const listingsData = data?.pages.flatMap((page) => page.listings) ?? [];
```

`data?.pages` — TanStack Query stores infinite query results as an array of pages. Each element is one page of listings (up to 12). `flatMap` flattens that into one single array of all listings loaded so far.

`fetchNextPage` — instead of manually tracking an offset number in state and incrementing it, the library manages pagination for you. Calling `fetchNextPage()` fetches the next page and appends it to `data.pages`.

The IntersectionObserver (which watches for the "load more" sentinel element scrolling into view) now calls `fetchNextPage()` instead of incrementing a counter.

---

### Listing page (`listing.tsx`)

Before: one large `useEffect` that called `getListingWithDetails`, `getProfile`, and `isWishlisted` every time the component mounted.

After:

```tsx
const { data: listingData, refetch: refetchListing } = useListingDetail(id);
const { data: sellerProfile } = useProfile(listingData?.user_id);
const isInWishlist = useIsWishlisted(user?.id, listingData?.id);
useWishlist(user?.id); // pre-load the wishlist so useIsWishlisted can read from it
```

`useProfile(listingData?.user_id)` — fetches the seller's profile using the same cache entry that is also used if you visited their profile page. If you had already looked at their profile, this costs zero database calls.

`refetch: refetchListing` — used after publishing or unpublishing a listing to immediately re-fetch the latest status. Combined with invalidation, this ensures the publish button label updates right away.

**Wishlist toggle fix:** The original code called `invalidateAll()` after toggling the wishlist — but `invalidateAll()` only clears listing caches, not the wishlist cache. The heart icon would stay wrong until the 3-minute freshness window expired. Fixed to:

```tsx
void queryClient.invalidateQueries({ queryKey: wishlistKeys.byUser(user.id) });
```

This clears the right cache entry — the wishlist — so the heart icon updates immediately.

---

### Messages page (`messages.tsx`) — replacing polling with real-time

Before: a `setInterval` ran every 15 seconds and called `getConversationsByUser`. With 10 conversations, that function fires 2 + 5×10 = 52 database queries per call. Every 15 seconds. That's over 200 database calls per minute just to check for new messages.

The old code:
```ts
// Called every 15 seconds — very expensive
const interval = setInterval(async () => {
  const updatedConvos = await getConversationsByUser(user.id)
  setConversations(updatedConvos)
}, 15000)
```

After: the polling is completely removed. Instead, the app subscribes to real-time changes directly from Supabase:

```tsx
useEffect(() => {
  if (!user || conversations.length === 0) return;

  const conversationIds = conversations.map((c) => c.id);
  const { unsubscribe } = subscribeToConversations(conversationIds, () => {
    invalidateConversations(user.id);
  });

  return unsubscribe;
}, [user?.id, conversations.length]);
```

`subscribeToConversations` — a function in the backend service layer that opens a persistent connection to Supabase. Supabase sends a notification the moment any of those conversations are updated (new message, read status changed). The callback function `() => invalidateConversations(user.id)` runs immediately when that notification arrives.

`invalidateConversations(user.id)` — throws away the cached conversation list and re-fetches it. One database call, triggered by an actual event, instead of 52 calls every minute on a timer.

`return unsubscribe` — when the user navigates away from the messages page, React runs this cleanup function to close the real-time connection so it doesn't keep running in the background.

---

### Sidebar (`sidebar-layout.tsx`)

Before: a `useEffect` called `getProfile(user.id)` and saved the result in a local `profile` state variable.

After:

```tsx
const { data: profile } = useProfile(user?.id);
```

One line. The sidebar now reads from the same shared cache entry as the profile page and my-listings page. The first one to request it fetches from the database; the rest read instantly from the saved copy.

---

## Part 6 — How all the freshness windows were chosen

| Area | Fresh for | Reasoning |
|---|---|---|
| Home page listings | 5 minutes | Sellers don't post and edit listings every few seconds. A 5-minute window means a user browsing for 10 minutes won't trigger unnecessary re-fetches, but a new listing will show up within a reasonable time. |
| A single listing | 5 minutes | Same reasoning. The cache is also thrown away immediately if the owner edits, publishes, or deletes it. |
| Your own listings | 5 minutes | Cache is invalidated the moment you create, delete, or publish one, so the 5-minute window rarely matters in practice. |
| Your profile | 10 minutes | You're very unlikely to change your name or bio in the middle of a session. 10 minutes is safe and reduces database load on the profile page, sidebar, and my-listings simultaneously. |
| Another user's profile | 10 minutes | Display names essentially never change. Shared with the same `useProfile` hook. |
| Wishlist | 3 minutes | You're actively clicking add/remove, so the freshness window is shorter to keep it feeling responsive. Actions also invalidate the cache immediately, so the window mainly matters for passive viewing. |
| Conversation list | 30 seconds | Short safety net. Real-time updates from Supabase handle instant changes; the 30-second window ensures that if the real-time connection drops for any reason, data is still re-fetched quickly. |
| Individual messages | 0 (never fresh) | Always re-fetched when an active conversation is opened. The real-time subscription (`subscribeToMessages`) handles everything after that. |

---

## Part 7 — The developer tools panel

In development, a small icon appears in the bottom-right corner of the app. Clicking it opens the TanStack Query DevTools panel. This shows:

- Every cache entry and its label (query key)
- Whether it is **fresh** (within the stale time), **stale** (past the stale time but still in memory), **fetching** (a database call is in progress), or **error**
- The actual data saved inside each entry
- How long ago it was last fetched

To verify caching is working: load the home page, open DevTools, confirm `["listings","search",{"limit":12}]` shows as **fresh**. Navigate to Messages and back. If it still shows **fresh** and no new network requests appear in the browser's Network tab, the cache is working correctly.

---

## Part 8 — What did not change

The database layer (`apps/backend/src/services/`) was not touched. The service functions (`getListingWithDetails`, `getProfile`, `getConversationsByUser`, etc.) work exactly as before. The cache sits entirely in the frontend and wraps those existing functions — it doesn't know or care how they work internally.

No database schema changes. No migrations. No new Supabase tables.

The existing real-time subscriptions for individual messages (`subscribeToMessages`) and notifications (`subscribeToNotifications`) were also left untouched.
