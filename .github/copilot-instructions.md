# Campus Marketplace — Copilot Instructions

## Overview

Campus Marketplace is a React 19 + Vite + TypeScript web app backed by Supabase PostgreSQL.
This is a **frontend app** (`apps/web/`) with a **service layer** (`apps/backend/`) that provides domain-oriented TypeScript functions.

Current stage: early prototyping. Database schema is migrated; frontend UI is placeholder-heavy; backend service layer is fully implemented for auth, profile, theme, and listings; messaging and search remain stubs.

## Architecture Pattern: Frontend → Service Functions (TypeScript) → Supabase

```
Frontend (apps/web/)
    ↓ imports directly
Service Functions (apps/backend/src/services/)
    ↓ imports and queries
Supabase Client (apps/backend/src/supabase-client.ts)
    ↓ connects to
Supabase PostgreSQL + Auth + Storage + school_themes table
```

**Key rules:**

1. Frontend **never** imports `@supabase/supabase-js` directly
2. Frontend imports and calls service functions from `apps/backend`
3. Only `apps/backend/` imports and uses Supabase SDK
4. Theme is fetched server-side and applied client-side via CSS variables

## Stack (Verified)

- **Frontend:** React 19.2.0, react-router-dom 7.13.1, TypeScript 5.9.3 (strict)
- **Build:** Vite 8.0.0-beta.13
- **Styling:** Tailwind CSS 4.2.1 (postcss plugin) + CSS variables for dynamic theming
- **Linting:** ESLint 9.39.1 + @typescript-eslint, react-hooks plugin
- **Backend/Database:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **State:** React useState (no Redux/Context/Zustand)
- **Testing:** Vitest (backend integration tests against real Supabase; see `apps/backend/vitest.config.ts`)
- **Deployment:** Unknown

## Git Workflow (from GIT_WORKFLOW.md)

- **Branches:** `main` (prod), `develop` (integration), `feat/*`, `fix/*`, `chore/*`, `docs/*`
- **Naming:** `type/ticket-description` e.g., `feat/CM-123-item-posting`
- **PR Rules:** 1 approval + CI passing; no direct commits to main/develop; squash merge into develop
- **Secrets:** Never commit .env files (use .env.example)
- **Release:** At sprint end, merge `develop` → `main` with PR title `release: Sprint X (YYYY-MM-DD)`

## Commands

- `npm run dev` — Start Vite dev server (http://localhost:5173)
- `npm run build` — TypeScript check + Vite build
- `npm run lint` — ESLint check
- `npm run preview` — Preview built app

Run from `apps/web/` directory.

## TypeScript

- **Strict mode enabled:** no unused locals, no unchecked imports, no ambiguous types
- **Target:** ES2022 for app code, ES2023 for build code
- **JSX:** react-jsx transform
- Config: `tsconfig.app.json` (app) + `tsconfig.node.json` (build-time)

## File Naming & Organization

- **Files:** lowercase-with-hyphens.tsx (components), lowercase.ts (utils)
- **Components:** PascalCase default exports
- **Locations:**
  - `src/pages/` — Page-level components (one per route)
  - `src/features/` — Reusable UI pieces
  - `src/layouts/` — Wrappers
  - `src/shared/` — Utilities and types
  - `src/services/` — Hooks/clients for backend service calls
  - `src/theme/` — Theme context + CSS variable utilities

## Styling

- Use **Tailwind CSS classes** + CSS variables for theme-driven colors (no hardcoded hex values in components)
- Configuration in `tailwind.config.js`: targets `src/**/* {js,ts,jsx,tsx}`
- **All colors come from `school_themes` database table** (primary_color, secondary_color, accent_color)
- Frontend fetches theme via backend service on app load
- CSS variables (e.g., `--color-primary`) are set in document root, then used in Tailwind or inline styles
- Responsive use: `sm:`, `md:`, `lg:` prefixes

**Example theme flow:**

1. Backend service fetches `school_themes` by school_code
2. Frontend receives: `{ primary_color: "#a50f1a", secondary_color: "#f1b7be", accent_color: "#c41e3a", ... }`
3. Frontend sets CSS variables: `--color-primary: #a50f1a`
4. Components use Tailwind or CSS vars: `bg-[var(--color-primary)]` or `className="theme-primary"`

## Code Style (Inferred from Linting + Codebase)

- Functional components + React hooks (useState, useEffect, useMemo, useCallback)
- Avoid prop drilling; prop interfaces must be typed
- Inline handlers OK for simple onClick; extract complex handlers
- No custom hooks library yet; create one as needed (src/hooks/)
- No error boundaries yet

## Component Patterns

- Routes use `react-router-dom` (Link, NavLink, useNavigate, useLocation)
- Modals: overlay div with backdrop-blur, click outside to close
- Forms: use useState; handler calls backend service (not Supabase)
- Styling: use CSS variables for theme colors (e.g., `style={{ backgroundColor: 'var(--color-primary)' }}`)

## Backend Service Layer (`apps/backend/`)

Backend services are TypeScript functions exported from `apps/backend/src/services/` that wrap Supabase queries.

**Service structure:**

```
apps/backend/
├── src/
│   ├── services/
│   │   ├── auth.ts           (signUpWithEmail, signInWithEmail, getSessionFromTokens, etc.)
│   │   ├── theme.ts          (getThemeBySchoolCode)
│   │   ├── listings.ts       (getListingById, createListing, updateListing, searchListings, etc.)
│   │   ├── listings.types.ts (shared types for listings service)
│   │   ├── profile.ts        (getProfile, upsertProfile, updateProfile)
│   │   ├── messaging.ts      (stub — getConversation, sendMessage not yet implemented)
│   │   └── search.ts         (stub — advancedSearch not yet implemented)
│   ├── supabase-client.ts    (Supabase SDK initialization — only file that imports supabase-js)
│   └── index.ts              (re-exports all services)
├── package.json
├── tsconfig.json
└── README.md
```

**Frontend calling pattern (direct imports):**

```typescript
// ✅ Correct
import {
  getThemeBySchoolCode,
  getListingById,
  createListing,
} from "@campus-marketplace/backend";

const theme = await getThemeBySchoolCode(schoolCode);
const listing = await getListingById(id);

// ❌ Wrong
import { supabase } from "@campus-marketplace/backend"; // Don't expose supabase client
const { data } = await supabase.from("listings").select("*"); // Don't query directly
```

**Blocking constraint:**

- ❌ `import { supabase }` in frontend — NEVER expose Supabase SDK to frontend
- ✅ `import { getTheme, getListing }` from backend — Only import service functions

## Environment Variables

- **Frontend (`apps/web/.env.local`):**
  - `VITE_SCHOOL_CODE=<integer IPEDS OPE ID>` — School identifier for theme loading
  - Optional: other frontend-specific vars
- **Backend (`apps/backend/.env.local`):**
  - `SUPABASE_URL` — Supabase project URL
  - `SUPABASE_SERVICE_KEY` — Supabase service role key (server-side only)
  - Optional: other backend-specific vars
- **Never commit .env files** (use .env.example to document required vars)

## Database (Supabase)

- Schema in `supabase/migrations/20260315120000_core_tables.sql` (and future timestamped migrations)
- **16 tables** including `school_themes` (primary_color, secondary_color, accent_color, logo_url, font_family, button_style)
- Migrations managed manually; run `supabase db push` to sync
- **Only backend services query this directly.** Frontend does not.
- Tables use UUIDs, `created_at`/`updated_at` timestamps (auto-managed by triggers)
- Enums: `listing_type`, `listing_status`, `item_condition`, `report_status`
- RLS policies implemented (see supabase/migrations/)
- No seed data committed yet

## Critical Incomplete Features

1. **messaging.ts** — `getConversation` and `sendMessage` are stubs, not yet implemented
2. **search.ts** — `advancedSearch` is a stub, not yet implemented
3. **Seed data** — initial categories/tags not yet populated
4. **Messaging UI** — frontend `/messages` route is a placeholder

## What NOT to Do

- ❌ Import from `@supabase/supabase-js` in frontend components
- ❌ Make Supabase queries directly in components
- ❌ Hardcode color values (e.g., `bg-[#a50f1a]`) — use theme CSS variables instead
- ❌ Add form fields without plan for backend service binding
- ❌ Commit .env files or secrets
- ❌ Edit database schema directly; create new migrations

## References

- `docs/dev/GIT_WORKFLOW.md` — Branch & PR strategy
- `supabase/migrations/20260315120000_core_tables.sql` — Initial schema including `school_themes` table
- [Tailwind CSS Docs](https://tailwindcss.com)
- [CSS Variables (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [React Router Docs](https://reactrouter.com)
- [Supabase Docs](https://supabase.com/docs)
