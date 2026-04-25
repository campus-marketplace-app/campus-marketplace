# Campus Marketplace

A multi-school student marketplace for buying, selling, and offering services
within a single university community. Each school gets its own branded
instance, gated by `.edu` email and a per-school theme.

[![Status](https://img.shields.io/badge/status-feature%20complete%20%E2%80%94%20polishing-green)](#status) ![License](https://img.shields.io/badge/license-MIT-blue)

---

## What it does

- **Listings** — Items (with condition + quantity) and services (with duration
  + availability windows). Drafts, publish guard, soft-delete, sold flag.
- **Image uploads** — Listing photos and avatars stored in Supabase Storage,
  client-side compressed to 1920px JPEG before upload.
- **Search & browse** — Full-text search via Postgres `tsvector`, plus
  category, type, and price-range filters.
- **Wishlist** — Save listings; auto-notify when a wishlisted item is sold.
- **Messaging** — Per-listing conversations with realtime delivery, unread
  counts, archive, and a sold-listing guard (sellers can keep messaging the
  buyer to coordinate; buyers can't initiate after a sale).
- **Notifications** — In-app bell + realtime push on new messages and
  wishlist-sold events.
- **Profiles** — Display name, avatar, bio, listing stats. Self-service
  account deactivation.
- **Reports + blocks** — User-to-user blocking and content reporting.
- **Multi-school theming** — School-specific colors, fonts, and logos via
  CSS variables; light/dark toggle.

---

## Architecture

This is an npm monorepo with two workspaces and a Supabase project.

```
apps/web/        React 19 + Vite 8 + Tailwind v4 frontend
apps/backend/    TypeScript service layer (compiled to dist/, exported as @campus-marketplace/backend)
supabase/        Postgres migrations + Supabase CLI config
```

### One hard rule: Supabase access is backend-only

The frontend never imports `@supabase/supabase-js`. Every database, auth,
storage, and realtime call goes through a service function exported from
`apps/backend/src/index.ts`. The frontend imports those functions like any
other library.

```
React component
  ↓ import { signInWithEmail, getListingById, ... } from "@campus-marketplace/backend"
Backend service (apps/backend/src/services/*.ts)
  ↓ supabase-client.ts     ← the only file that imports @supabase/supabase-js
Supabase (Postgres + Auth + Storage + Realtime)
```

Verify nothing leaks: `grep -r "@supabase/supabase-js" apps/web/src/` must
return nothing.

The same `supabase-client.ts` is reused on the frontend bundle (with the anon
key) so realtime subscriptions and storage uploads share one client. Backend
service functions running in Node use the service-role key.

### Backend services

`apps/backend/src/services/` — each file owns one domain:

| Service | What it covers |
|---|---|
| `auth.ts` | sign-up, sign-in, session restore, password reset, account deactivation |
| `profile.ts` | get/update profile, avatar upload (with orphan cleanup) |
| `listings.ts` | CRUD + search, item/service details, image storage, publish-readiness, mark-sold, wishlist |
| `messaging.ts` | conversations (`find_or_create_conversation` RPC), messages with pagination, realtime subscriptions |
| `notifications.ts` | bell feed with pagination + realtime |
| `theme.ts` | per-school branding fetch |
| `reports.ts` | content reports |
| `blocks.ts` | user blocks |
| `stats.ts` | homepage counters |

All re-exported from `apps/backend/src/index.ts`.

### Database

Schema starts at `supabase/migrations/20260315120000_core_tables.sql`. Currently
14 active tables. Key ones: `profiles`, `listings` + `item_details` /
`service_details`, `listing_images`, `listing_tags`, `categories`, `tags`,
`conversations` + `conversation_participants`, `messages`, `notifications`,
`wishlists`, `reports`, `blocks`. UUID PKs, soft-deletes (`deleted_at`) on most
tables, `updated_at` triggers where appropriate.

Migration rule: **never edit existing migration files** — always add a new
timestamped one.

### Theming

School branding is stored in the `school_themes` table, fetched at app start by
`VITE_SCHOOL_CODE`, and exposed as CSS variables (`--color-primary`,
`--color-surface`, `--color-text`, `--font-family`, `--logo-url`, etc.). Use
the Tailwind v4 form `bg-(--color-primary)` rather than hex literals.

---

## Quick start

### Prerequisites

- Node 18+ (the repo pins a version via `.nvmrc`; `nvm use` will pick it up)
- A Supabase project (or the staging credentials for this one)

### Install + run

```bash
npm install
cp apps/web/.env.example     apps/web/.env.local
cp apps/backend/.env.example apps/backend/.env.local
# fill in the env values — see docs/dev/SUPABASE_CONNECT.md
npm run dev
```

The frontend serves at `http://localhost:5173`. Restart the dev server after
editing `.env.local` so Vite reloads env vars.

### Common scripts

```bash
npm run dev         # frontend dev server
npm run build       # tsc backend + vite build frontend
npm run lint        # ESLint across both workspaces
npm run typecheck   # tsc --noEmit across both workspaces
npm run test        # backend tests (hits a real Supabase — point at staging, never prod)
```

Workspace-scoped variants exist too:

```bash
npm run dev   --workspace=apps/web
npm run build --workspace=apps/backend
npm run test  --workspace=apps/backend
```

---

## Environment variables

`apps/backend/.env.local`:
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```

`apps/web/.env.local`:
```
VITE_SCHOOL_CODE=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Never commit `.env.local`. Templates live in `.env.example`.

---

## Project layout

```
apps/web/                         React frontend
├── src/pages/                    Route components (one per top-level URL)
├── src/features/                 Larger feature widgets (listing form, modals)
├── src/components/               Small reusable bits (Avatar, ListingThumb, …)
├── src/hooks/                    TanStack Query wrappers for backend services
├── src/contexts/                 ThemeContext, ConfirmContext
├── src/layouts/                  SidebarLayout (handles session restore)
├── src/utils/                    compressImage, etc.
└── src/index.css                 Tailwind v4 entrypoint

apps/backend/                     Service layer (compiled, published as @campus-marketplace/backend)
├── src/services/                 Domain modules (auth, listings, messaging, …)
├── src/supabase-client.ts        Single supabase client (anon in browser, service role in node)
└── src/__tests__/                Vitest tests (some hit real Supabase)

supabase/
├── migrations/                   Timestamped SQL migrations (append-only)
└── config.toml                   Supabase CLI config

docs/                             Architecture + per-service usage guides (see docs/README.md)
```

---

## Documentation

A short index lives at [docs/README.md](docs/README.md). Highlights:

- [docs/dev/SETUP.md](docs/dev/SETUP.md) — local environment
- [docs/dev/SUPABASE_CONNECT.md](docs/dev/SUPABASE_CONNECT.md) — how to wire credentials
- [docs/dev/MIGRATIONS.md](docs/dev/MIGRATIONS.md) — adding new migrations
- [docs/dev/GIT_WORKFLOW.md](docs/dev/GIT_WORKFLOW.md) — branches and PRs
- [docs/architecture/CACHING.md](docs/architecture/CACHING.md) — TanStack Query + realtime
- [docs/architecture/THEME_CONTEXT_EXPLAINED.md](docs/architecture/THEME_CONTEXT_EXPLAINED.md) — theming
- [docs/usage/](docs/usage/) — per-service integration examples (auth, listings, messaging, …)

Project-level rules also live in:

- [CLAUDE.md](CLAUDE.md) — assistant-facing rules (apply to humans too)
- [.github/copilot-instructions.md](.github/copilot-instructions.md) — detailed architecture rules
- [.github/instructions/frontend.instructions.md](.github/instructions/frontend.instructions.md) — frontend conventions
- [AGENTS.md](AGENTS.md) — pre/post-edit verification checklist

---

## Status

The app is feature-complete and currently in a polish + bug-fix phase. The
`fix/perf-bugs` branch carries the most recent advisor sweep (RLS hardening,
storage policy cleanup, function `search_path` lock-down, conversation race
fix, listing-image client-side compression, etc.). See `git log` for details.

## License

MIT
