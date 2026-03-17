# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
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

No test framework is configured yet.

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
- `profile.ts` — get/upsert/update profiles (fully implemented)
- `theme.ts` — fetch school branding by school code (fully implemented)
- `listings.ts` — CRUD + search for listings (fully implemented)
- `messaging.ts` — stub, not yet implemented
- `search.ts` — stub, not yet implemented

All services are re-exported from `apps/backend/src/index.ts`.

### Frontend Structure

Pages are in `apps/web/src/pages/`. All routes are wrapped in `<SidebarLayout />` (defined in `apps/web/src/App.tsx`). Current routes: `/`, `/listing`, `/listing/:id`, `/messages`, `/profile`, `/login`, `/signup`.

### Theming (CSS Variables)

School-specific branding is stored in the `school_themes` database table. The backend fetches it by `VITE_SCHOOL_CODE`; the frontend applies it as CSS variables at startup:

```
--color-primary, --color-secondary, --color-accent, --font-family, --logo-url, --button-style
```

**Never hardcode hex colors.** Use `className="bg-[var(--color-primary)]"` or `style={{ color: 'var(--color-primary)' }}`.

Verify: `grep -rE "bg-\[#|text-\[#" apps/web/src/` must return nothing.

## Database

Schema: `supabase/migrations/20260315120000_core_tables.sql` — 16 tables.

Key tables: `profiles`, `listings`, `item_details`, `service_details`, `listing_images`, `listing_tags`, `categories`, `tags`, `conversations`, `conversation_participants`, `messages`, `notifications`, `favorites`, `reports`, `blocks`, `school_themes`.

All tables use UUIDs, soft deletes (`deleted_at`), and auto-managed `updated_at` via trigger.

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
```

## Auth Pattern

Session tokens are stored in `localStorage` and restored on app init via `getSessionFromTokens`. See `apps/backend/AUTH_USAGE.md` for the full integration example.

## Key Docs

- `docs/GIT_WORKFLOW.md` — branch naming, PR process
- `docs/MIGRATIONS.md` — migration management
- `apps/backend/AUTH_USAGE.md` — auth integration examples
- `.github/copilot-instructions.md` — detailed architecture rules
- `.github/instructions/frontend.instructions.md` — frontend-specific rules
- `AGENTS.md` — pre/post-edit verification checklist
