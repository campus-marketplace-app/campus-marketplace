## Summary

This PR merges the latest `develop` branch into `feat/overhaul` and includes a
large set of new features: a full theme customization system, a notification
bell with real-time alerts, a redesigned top navigation bar, a major overhaul
of the messages/conversations UI, a new Wishlist page, custom confirmation
dialogs, and several bug fixes.

---

## What was merged in from `develop`

| File | Change |
|---|---|
| `apps/web/src/pages/wishlist.tsx` | New Wishlist page added |
| `apps/web/src/pages/listing.tsx` | Listing page now caches data to prevent flickering on load |
| `apps/web/src/pages/messages.tsx` | Scroll fix + conversations now re-sort to top when a new message arrives |
| `apps/web/src/components/ChatPanel.tsx` | Scroll fix so the message area scrolls correctly |
| `apps/web/src/App.tsx` | Added the `/wishlist` route |

### Database / Migrations

| File | Change |
|---|---|
| `20260407120000_add_rls_for_remaining_existing_tables.sql` | Added missing access control rules to several database tables |
| `20260408120000_drop_favorites_and_school_themes.sql` | Removed two old tables (`favorites`, `school_themes`) that are no longer used |
| `20260329154605_theme_email_domain_and_cleanup.sql` | Renamed to match the timestamp already applied on the server (no content change) |
| `20260329154611_theme_assets_bucket.sql` | Same — renamed to match server |
| `20260329204211_theme_page_backgrounds.sql` | Same — renamed to match server |
| `20260409192045_notifications_trigger.sql` | Database trigger that creates a notification whenever a new message is sent |

---

## New features on this branch

### Theme Customization System

A full in-app theme editor that lets users pick a color preset, corner
roundness, and font. Settings are saved locally and persist across sessions.

| File | Change |
|---|---|
| `apps/web/src/features/theme-customizer/index.tsx` | NEW — The slide-out theme customizer panel |
| `apps/web/src/features/theme-customizer/PresetGrid.tsx` | NEW — Grid of color preset options (e.g. NJIT Red, Ocean, Forest) |
| `apps/web/src/features/theme-customizer/RadiusPicker.tsx` | NEW — Picker for corner roundness (sharp / soft / rounded) |
| `apps/web/src/features/theme-customizer/FontPicker.tsx` | NEW — Font selector with preview |
| `apps/web/src/config/presets.ts` | NEW — Defines all available color presets, fonts, and radius options |
| `apps/web/src/lib/color-utils.ts` | NEW — Helper functions for adjusting colors (lightness, blending, desaturation) |
| `apps/web/src/lib/theme-storage.ts` | NEW — Handles saving and loading the user's theme preferences in local storage |
| `apps/web/src/contexts/ThemeContext.tsx` | MODIFIED — Fully rewritten to support presets, fonts, and radius instead of just school colors |
| `apps/web/src/features/theme-mode-toggle.tsx` | MODIFIED — Updated to work with the new theme system |
| `apps/web/src/index.css` | MODIFIED — Updated CSS variables to support the new theme options |
| `apps/web/src/features/navbar.tsx` | MODIFIED — Added a button to open the theme customizer panel |
| `apps/web/src/layouts/sidebar-layout.tsx` | MODIFIED — Wires up the theme customizer panel open/close state |

---

### Notification Bell

Users now see a bell icon in the top bar that lights up when they have unread
message notifications. Notifications arrive in real time without needing to
refresh the page.

| File | Change |
|---|---|
| `apps/web/src/features/notification-bell.tsx` | NEW — Bell icon with unread count badge, dropdown list of notifications |
| `apps/backend/src/services/notifications.ts` | MODIFIED — Added a function to subscribe to live notification updates via Supabase Realtime |
| `apps/web/src/features/page-header.tsx` | MODIFIED — Bell is mounted in the top bar for logged-in users |
| `apps/web/src/layouts/sidebar-layout.tsx` | MODIFIED — Loads notifications on login and passes them down; subscribes to real-time updates |

---

### Redesigned Top Navigation Bar

The header is now more compact and better organized. The search bar only shows
on the homepage. A wishlist bookmark icon was also added.

| File | Change |
|---|---|
| `apps/web/src/features/page-header.tsx` | MODIFIED — Compact layout, logo resized, search bar hidden on non-home pages, wishlist icon added, avatar style updated |
| `apps/web/src/layouts/sidebar-layout.tsx` | MODIFIED — Passes `showSearch` flag so the search bar only appears on the homepage |
| `apps/web/src/pages/index.tsx` | MODIFIED — Search bar is now controlled from the header on the homepage |

---

### Conversations UI Overhaul

The messages sidebar was rebuilt from scratch to support grouped contacts,
avatars, and archiving.

| File | Change |
|---|---|
| `apps/web/src/components/ConversationList.tsx` | MODIFIED — Conversations with the same person are grouped under one contact entry that can be expanded; each contact shows a profile photo or initials; archive button appears on hover; search bar has a search icon |
| `apps/backend/src/services/messaging.ts` | MODIFIED — Each conversation now returns the other user's avatar path, the linked listing title, and whether the current user is the buyer or seller; added `archiveConversation` function |

---

### Custom Confirmation Dialogs

Browser default "are you sure?" alerts replaced with a styled modal that
matches the app's look and feel.

| File | Change |
|---|---|
| `apps/web/src/components/ConfirmModal.tsx` | NEW — The modal dialog component |
| `apps/web/src/contexts/ConfirmContext.tsx` | NEW — Makes the confirm dialog available anywhere in the app without passing props through every component |
| `apps/web/src/main.tsx` | MODIFIED — Wraps the app in the confirm context so it's globally available |

---

### Profile: First Name + Last Name

| File | Change |
|---|---|
| `apps/web/src/pages/profile.tsx` | MODIFIED — Profile page now shows and edits first name and last name as separate fields instead of a single display name |

---

### Reset Password Bug Fix

| File | Change |
|---|---|
| `apps/backend/src/services/auth.ts` | MODIFIED — When a reset-password link is expired or invalid, the app now shows the actual error reason instead of a generic message |
| `apps/web/src/pages/reset-password.tsx` | MODIFIED — Handles the improved error message from the backend and shows it to the user |
| `apps/web/src/pages/login.tsx` | MODIFIED — Minor UI polish on the login page |

---

### Docs

| File | Change |
|---|---|
| `docs/THEME_CONTEXT_EXPLAINED.md` | NEW — Written by a teammate, explains how the theme context works for the rest of the team |

---

## How to test

1. Log in and check the notification bell in the top bar — send yourself a
   message from another account and confirm the bell updates without refreshing.
2. Open the theme customizer from the sidebar — try changing the color preset,
   font, and corner roundness and confirm they apply immediately and persist
   after a page refresh.
3. Go to the Messages page — confirm contacts with multiple conversations are
   grouped, avatars show, and the archive button appears on hover.
4. Visit `/wishlist` and confirm the sidebar and header are visible.
5. Trigger a password reset with an expired link and confirm a clear error
   message is shown.
