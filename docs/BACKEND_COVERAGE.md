# Backend Service Coverage

All 16 tables in `public` are mapped to a service file in `apps/backend/src/services/`.
The frontend imports everything via `@campus-marketplace/backend`.

Legend: **done** = fully implemented · **stub** = function exists, body throws "Not yet implemented"

---

## profiles
**Service:** `profile.ts`

| Function | Status |
|---|---|
| `getProfile(userId)` | done |
| `upsertProfile(input)` | done |
| `updateProfile(userId, updates)` | done |
| `uploadAvatar(userId, file, contentType)` | done |
| `getAvatarUrl(avatarPath)` | done |

---

## listings
**Service:** `listings.ts`

| Function | Status |
|---|---|
| `getListingById(id)` | done |
| `getListingWithDetails(id)` | done |
| `getListingsByUser(userId, status?)` | done |
| `createListing(input)` | done |
| `updateListing(id, userId, updates)` | done |
| `deleteListing(id, userId)` | done |
| `searchListings(options?)` | done |
| `upsertItemDetails(listingId, userId, details)` | done |
| `upsertServiceDetails(listingId, userId, details)` | done |

---

## item_details
**Service:** `listings.ts` (managed alongside listings)

| Function | Status |
|---|---|
| `upsertItemDetails(listingId, userId, details)` | done |

---

## service_details
**Service:** `listings.ts` (managed alongside listings)

| Function | Status |
|---|---|
| `upsertServiceDetails(listingId, userId, details)` | done |

---

## listing_images
**Service:** `listings.ts` (read via `getListingWithDetails`)

| Function | Status |
|---|---|
| Read (via `getListingWithDetails`) | done |
| `uploadListingImage(listingId, userId, file, contentType, altText?)` | stub needed |

> Images are returned in detail queries but there is no dedicated upload/delete function yet. Add these when implementing the listing image upload UI.

---

## listing_tags
**Service:** `listings.ts` (read via `getListingWithDetails`)

| Function | Status |
|---|---|
| Read (via `getListingWithDetails`) | done |
| `setListingTags(listingId, userId, tagIds)` | stub needed |

> Tags are returned in detail queries but writing/replacing tags for a listing has no function yet.

---

## categories
**Service:** `categories.ts`

| Function | Status |
|---|---|
| `getCategories()` | stub |
| `getCategoryById(id)` | stub |

---

## tags
**Service:** `categories.ts`

| Function | Status |
|---|---|
| `getTags()` | stub |

---

## conversations
**Service:** `messaging.ts`

| Function | Status |
|---|---|
| `createConversation(userId, participantId, listingId?)` | stub |
| `getConversationsByUser(userId)` | stub |
| `getConversation(conversationId)` | stub |

---

## conversation_participants
**Service:** `messaging.ts` (managed inside `createConversation`)

| Function | Status |
|---|---|
| Managed by `createConversation` | stub |

---

## messages
**Service:** `messaging.ts`

| Function | Status |
|---|---|
| `getMessages(conversationId)` | stub |
| `sendMessage(conversationId, senderId, content)` | stub |
| `markMessagesRead(conversationId, userId)` | stub |

Validation status: **CM-US-047 complete** for schema + RLS smoke checks.
- See `apps/backend/src/services/__tests__/messages.smoke.test.ts` for acceptance coverage:
	- messaging tables/constraints exist and enforce integrity
	- participant-only message read/insert behavior
	- spoofed `sender_id` insert rejection
- See `docs/MESSAGING_USAGE.md` for policy behavior and smoke-check mapping.

---

## notifications
**Service:** `notifications.ts`

| Function | Status |
|---|---|
| `getNotifications(userId)` | stub |
| `markNotificationRead(notificationId, userId)` | stub |
| `markAllNotificationsRead(userId)` | stub |
| `deleteNotification(notificationId, userId)` | stub |

---

## favorites
**Service:** `favorites.ts`

| Function | Status |
|---|---|
| `addFavorite(userId, listingId)` | stub |
| `removeFavorite(userId, listingId)` | stub |
| `getFavoritesByUser(userId)` | stub |
| `isFavorited(userId, listingId)` | stub |

---

## reports
**Service:** `reports.ts`

| Function | Status |
|---|---|
| `createReport(reporterId, reportedListingId, reportedUserId, reason, details?)` | stub |

---

## blocks
**Service:** `blocks.ts`

| Function | Status |
|---|---|
| `blockUser(userId, blockedUserId)` | stub |
| `unblockUser(userId, blockedUserId)` | stub |
| `getBlockedUsers(userId)` | stub |
| `isBlocked(userId, targetUserId)` | stub |

---

## school_themes
**Service:** `theme.ts`

| Function | Status |
|---|---|
| `getThemeBySchoolCode(schoolCode)` | done |

---

## auth (auth.users — Supabase managed)
**Service:** `auth.ts`

| Function | Status |
|---|---|
| `signUpWithEmail(input)` | done |
| `signInWithEmail(input)` | done |
| `signOutWithTokens(accessToken, refreshToken)` | done |
| `getSessionFromTokens(accessToken, refreshToken)` | done |
| `refreshSession(refreshToken)` | done |
| `updatePassword(accessToken, refreshToken, newPassword)` | done |
| `sendPasswordResetEmail(email, redirectTo?)` | done |
| `completePasswordReset(token, newPassword)` | done |

---

## search (cross-table)
**Service:** `search.ts`

| Function | Status |
|---|---|
| `advancedSearch(filters)` | stub |

> Delegates to `searchListings` in `listings.ts`. Implement by mapping `SearchFilters` onto `SearchListingsOptions`.

---

## Summary

| Status | Count |
|---|---|
| Fully implemented | 6 services (auth, profile, theme, listings, item_details, service_details) |
| Stub — ready to implement | messaging, notifications, favorites, reports, blocks, categories, search |
| Missing functions (no stub yet) | `listing_images` upload/delete · `listing_tags` write |
