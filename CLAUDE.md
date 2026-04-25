# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# First-time setup (requires nvm)
nvm use                # switches to the pinned Node version from .nvmrc

# Install dependencies and start dev server
npm run setup          # cross-platform (or setup:windows / setup:unix)

# Development
npm run dev            # start frontend (http://localhost:5173)
npm run build          # compile backend + Vite build
npm run lint           # ESLint across all workspaces
npm run typecheck      # TypeScript strict check

# Run commands scoped to a workspace
npm run dev --workspace=apps/web
npm run build --workspace=apps/backend
```

```bash
npm run test               # run backend end-to-end tests against real Supabase (requires .env.local — do not run against production)
npm run test --workspace=apps/backend  # scoped to backend only
```

## Architecture

This is an **npm monorepo** with two workspaces:

```
apps/web/        React 19 + Vite 8 + Tailwind CSS 4 frontend
apps/backend/    TypeScript service layer (compiled to dist/, published as @campus-marketplace/backend)
supabase/        Migrations and Supabase CLI config
```

### Critical Rule: Supabase Access is Backend-Only

The frontend **never** imports `@supabase/supabase-js`. All database/auth calls go through service functions exported from `apps/backend/src/index.ts`.

```
Frontend (apps/web/src/)
  ↓ import { signInWithEmail, getListingById, ... } from "@campus-marketplace/backend"
Backend (apps/backend/src/services/*.ts)
  ↓ supabase-client.ts (the only file that imports @supabase/supabase-js)
Supabase (PostgreSQL + Auth + Storage)
```

Verify no leaks: `grep -r "@supabase/supabase-js" apps/web/src/` must return nothing.

### Backend Service Layer

Services live in `apps/backend/src/services/`:
- `auth.ts` — sign-up, sign-in, session restore, sign-out, password reset (fully implemented)
- `profile.ts` — get/upsert/update profiles, avatar upload (fully implemented)
- `theme.ts` — fetch school branding by school code (fully implemented)
- `listings.ts` — CRUD + search for listings (fully implemented); types in `listings.types.ts`
- `messaging.ts` — conversations, messages, realtime subscriptions (fully implemented)
- `notifications.ts` — fetch and mark notifications read (fully implemented)
- `wishlist.ts` — add/remove/query wishlist entries (fully implemented)

All services are re-exported from `apps/backend/src/index.ts`.

### Frontend Structure

Pages are in `apps/web/src/pages/`. All routes are wrapped in `<SidebarLayout />` (defined in `apps/web/src/App.tsx`). Current routes: `/`, `/listing`, `/listing/:id`, `/messages`, `/profile`, `/login`, `/signup`.

### Theming (CSS Variables)

School branding is stored in the `school_themes` database table and fetched by the backend using `VITE_SCHOOL_CODE`; the frontend applies it as CSS variables at startup:

```
--color-primary, --color-secondary, --color-accent, --font-family, --logo-url, --button-style
```

**Never hardcode hex colors.** Use Tailwind v4 native CSS variable syntax: `className="bg-(--color-primary)"` or `style={{ color: 'var(--color-primary)' }}`. The bracket form `bg-[var(--color-primary)]` still works but `bg-(--color-primary)` is the preferred Tailwind v4 canonical syntax.

Verify: `grep -rE "bg-\[#|text-\[#" apps/web/src/` must return nothing.

## Database

Schema starts in `supabase/migrations/20260315120000_core_tables.sql` — currently **14 active tables** (favorites and school_themes were dropped in migration 20260408120000).

Key tables: `profiles`, `listings`, `item_details`, `service_details`, `listing_images`, `listing_tags`, `categories`, `tags`, `conversations`, `conversation_participants`, `messages`, `notifications`, `reports`, `blocks`, `wishlists`.

All tables use UUIDs. `updated_at` triggers exist on `profiles`, `listings`, `item_details`, `service_details`, `conversations`, and `reports`. Soft deletes (`deleted_at`) are present on `listings`, `item_details`, `service_details`, `listing_images`, `conversations`, `messages`, `categories`, and `tags`.

**Migration rule:** Never edit existing migration files. Create new timestamped files for schema changes.

## Environment Variables

Backend (`apps/backend/.env.local`):
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```

Frontend (`apps/web/.env.local`):
```
VITE_SCHOOL_CODE=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Auth Pattern

Session tokens are stored in `localStorage` and restored on app init via `getSessionFromTokens`. See `docs/AUTH_USAGE.md` for the full integration example.

## Key Docs

- `docs/GIT_WORKFLOW.md` — branch naming, PR process
- `docs/MIGRATIONS.md` — migration management
- `docs/AUTH_USAGE.md` — auth integration examples
- `docs/LISTINGS_USAGE.md` — listings service integration examples
- `docs/PROFILE_USAGE.md` — profile + avatar upload integration examples
- `.github/copilot-instructions.md` — detailed architecture rules
- `.github/instructions/frontend.instructions.md` — frontend-specific rules
- `AGENTS.md` — pre/post-edit verification checklist
