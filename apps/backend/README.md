# Campus Marketplace Backend Service Layer

Backend TypeScript services that wrap Supabase queries. This is the **only place** where the Supabase SDK is imported.

## Architecture

```
Frontend (apps/web/)
    ↓ imports service functions
Backend Services (apps/backend/src/services/)
    ↓ imports Supabase SDK
Supabase PostgreSQL
```

## Setup

1. Install dependencies at project root:

   ```bash
   npm install
   ```

2. Configure environment variables:

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. Build TypeScript:
   ```bash
   npm run build
   ```

## Services

- **theme.ts** — `getThemeBySchoolCode(schoolCode)` — Fetch school branding from `school_themes` table
- **listings.ts** — Listing CRUD operations (getListingById, createListing, searchListings, etc.)
- **profile.ts** — User profile queries (getProfile, updateProfile, etc.)
- **messaging.ts** — Conversation and message queries (getConversation, sendMessage, etc.)
- **search.ts** — Cross-listing search with filters
- **auth.ts** — Auth wrappers (sign up, sign in, sign out, session restore, password reset)

For frontend integration examples, see `AUTH_USAGE.md`.

## Key Rules

1. ✅ Only this package imports `@supabase/supabase-js`
2. ✅ All services export TypeScript functions
3. ✅ Frontend imports service functions (not Supabase client)
4. ✅ Backend services handle all error handling and validation
