# Backend Service Coverage

All 16 tables in `public` are mapped to a service file in `apps/backend/src/services/`.
The frontend imports everything via `@campus-marketplace/backend`.

Legend: **done** = fully implemented · **deferred** = planned but waiting on teammate

---

## profiles
**Service:** `profile.ts` · **Docs:** `PROFILE_USAGE.md`

| Function | Status |
|---|---|
| `getProfile(userId)` | done |
| `upsertProfile(input)` | done |
| `updateProfile(userId, updates)` | done |
| `uploadAvatar(userId, file, contentType)` | done |
| `getAvatarUrl(avatarPath)` | done |

---

## listings
**Service:** `listings.ts` · **Docs:** `LISTINGS_USAGE.md`

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
| `uploadListingImage(listingId, userId, file, contentType, options?)` | done |
| `deleteListingImage(imageId, userId)` | done |
| `getListingImageUrl(imagePath)` | done |

> Storage bucket and RLS are set up via migration `20260325090000_listing_images_storage_and_rls.sql`.

---

## listing_tags
**Service:** `listings.ts` (read via `getListingWithDetails`)

| Function | Status |
|---|---|
| Read (via `getListingWithDetails`) | done |
| `setListingTags(listingId, userId, tagIds)` | deferred |

---

## categories
**Service:** `categories.ts` · **Docs:** `CATEGORIES_USAGE.md`

| Function | Status |
|---|---|
| `getCategories()` | done |
| `getCategoryById(id)` | done |

---

## tags
**Service:** `categories.ts` · **Docs:** `CATEGORIES_USAGE.md`

| Function | Status |
|---|---|
| `getTags()` | done |

---

## conversations
**Service:** `messaging.ts` · **Docs:** `MESSAGING_USAGE.md`

| Function | Status |
|---|---|
| `createConversation(userId, participantId, listingId?)` | done |
| `getConversationsByUser(userId)` | done |
| `getConversation(conversationId, userId)` | done |

---

## conversation_participants
**Service:** `messaging.ts` (managed inside `createConversation`)

| Function | Status |
|---|---|
| Managed by `createConversation` | done |

---

## messages
**Service:** `messaging.ts` · **Docs:** `MESSAGING_USAGE.md`

| Function | Status |
|---|---|
| `getMessages(conversationId)` | done |
| `sendMessage(conversationId, senderId, content)` | done |
| `markMessagesRead(conversationId, userId)` | done |
| `subscribeToMessages(conversationId, onMessage)` | done |

Validation status: **CM-US-047 complete** for schema + RLS smoke checks.
- See `apps/backend/src/services/__tests__/messages.smoke.test.ts` for acceptance coverage:
	- messaging tables/constraints exist and enforce integrity
	- participant-only message read/insert behavior
	- spoofed `sender_id` insert rejection
- See `docs/usage/MESSAGING_USAGE.md` for policy behavior and smoke-check mapping.

---

## notifications
**Service:** `notifications.ts` · **Docs:** `NOTIFICATIONS_USAGE.md`

| Function | Status |
|---|---|
| `getNotifications(userId)` | done |
| `markNotificationRead(notificationId, userId)` | done |
| `markAllNotificationsRead(userId)` | done |
| `deleteNotification(notificationId, userId)` | done |

---

## favorites
**Service:** `favorites.ts` · **Docs:** `FAVORITES_USAGE.md`

| Function | Status |
|---|---|
| `addFavorite(userId, listingId)` | done |
| `removeFavorite(userId, listingId)` | done |
| `getFavoritesByUser(userId)` | done |
| `isFavorited(userId, listingId)` | done |

---

## reports
**Service:** `reports.ts` · **Docs:** `REPORTS_USAGE.md`

| Function | Status |
|---|---|
| `createReport(reporterId, reportedListingId, reportedUserId, reason, details?)` | done |

---

## blocks
**Service:** `blocks.ts` · **Docs:** `BLOCKS_USAGE.md`

| Function | Status |
|---|---|
| `blockUser(userId, blockedUserId)` | done |
| `unblockUser(userId, blockedUserId)` | done |
| `getBlockedUsers(userId)` | done |
| `isBlocked(userId, targetUserId)` | done |

---

## school_themes
**Service:** `theme.ts`

| Function | Status |
|---|---|
| `getThemeBySchoolCode(schoolCode)` | done |

---

## auth (auth.users — Supabase managed)
**Service:** `auth.ts` · **Docs:** `AUTH_USAGE.md`

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

## Summary

| Status | Count |
|---|---|
| Fully implemented | 11 services — auth, profile, theme, listings, categories, messaging, notifications, favorites, blocks, reports, tags |
| Deferred (teammate) | listing tag write, publish validation |
| Removed | `search.ts` — was redundant, `searchListings` in listings.ts covers all search needs |

**Total functions:** 48 implemented, 1 deferred.
