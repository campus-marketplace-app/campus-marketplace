# Instructions for AI Coding Agents — Campus Marketplace

## Critical Architecture Constraints

1. **Frontend never imports `@supabase/supabase-js`** — only `apps/backend/` touches Supabase SDK
2. **Frontend imports service functions from `apps/backend`** — direct TypeScript imports, not HTTP API
3. **Colors never hardcoded in components** — use theme CSS variables from `school_themes` table
4. **Theme fetched server-side** — backend fetches, frontend applies via CSS variables

---

## Pre-Edit Inspection Checklist

### 1. Understand the Current State

- [ ] Read task description
- [ ] Identify which files will be touched (pages, components, forms, migrations, backend service)
- [ ] Determine if task requires backend service (likely: YES if querying data)
- [ ] Check if task involves theming (colors, fonts, logos)

### 2. Verify Environment & Dependencies

- [ ] If frontend task: run `npm run lint` in `apps/web/` (fail early if broken)
- [ ] If backend task: run `npm run lint` in `apps/backend/` (fail early if broken)
- [ ] If database task: read latest migration files in `supabase/migrations/` (esp. `20260315120000_core_tables.sql` and any newer files)
- [ ] If backend theme task: confirm service is exported from `apps/backend/src/services/theme.ts`
- [ ] If frontend styling: confirm no hardcoded colors; CSS variables only

### 3. Check Related Code

- [ ] If styling: look for CSS variable usage (check `src/theme/` if exists)
- [ ] If adding colors: ensure they come from theme, not hardcoded
- [ ] If building data-driven component: wait for or mock backend service
- [ ] If adding route: ensure registered in `App.tsx`

### 4. Frontend-Only Constraint

- [ ] Confirm this is frontend code in `apps/web/src/`
- [ ] Confirm no `@supabase/supabase-js` imports
- [ ] Confirm no hardcoded colors

---

## Post-Implementation Verification

### Before Declaring Work Complete

#### 1. Code Quality

- [ ] `npm run lint` passes (no ESLint errors)
- [ ] `npm run build` succeeds (TypeScript compilation)
- [ ] No unused imports or variables (strict mode)
- [ ] **No hardcoded color values** (check for `#` hex codes in JSX/CSS)
- [ ] Component props typed (`interface Props`)

#### 2. Architecture Compliance

- [ ] **If frontend code:** No `@supabase/supabase-js` imports (grep confirms: `grep -r "@supabase" apps/web/src/`)
- [ ] **If frontend code:** All data imports from `@campus-marketplace/backend` (direct function calls, not HTTP)
- [ ] **If frontend styling:** No hardcoded colors; uses CSS variables only (e.g., `var(--color-primary)`)
- [ ] **If backend code:** Only `apps/backend/` imports Supabase SDK and queries database
- [ ] **If backend adds feature:** Service function is exported from `apps/backend/src/index.ts` for frontend use

#### 3. No Silent Failures

- [ ] Forms have submit handlers calling backend services
- [ ] Error handling in place (try/catch or .catch())
- [ ] Loading states visible during async operations

#### 4. Git Compliance

- [ ] Branch name follows pattern: `feat/`, `fix/`, `chore/`, `docs/`
- [ ] No .env files in commit
- [ ] No console.log() in production code
- [ ] Clear commit message

#### 5. Database Safety (if schema changes)

- [ ] Changes are in a new timestamped migration file (never edit existing applied migration files)
- [ ] Backward-compatible or includes rollback
- [ ] Triggers for updated_at added (if new tables)
- [ ] RLS policies defined

---

## Safety Rules for Sensitive Operations

### ⛔ No Frontend Supabase Access

**Rule:** Frontend code must never import `@supabase/supabase-js`. Only `apps/backend/` accesses Supabase.

- **Check:** `grep -r "@supabase/supabase-js" apps/web/src/`
- **Expected:** No matches (only `apps/backend/` should have Supabase imports)
- **If found:** Remove import and import service function from `apps/backend` instead

### ⛔ No Hardcoded Colors

**Rule:** Components must never hardcode color hex values.

- **Check:** `grep -rE "bg-\[#|text-\[#" apps/web/src/` (Tailwind hex syntax)
- **Also check:** `color:\s*['"]?#[0-9A-Fa-f]{6}` (CSS inline)
- **Expected:** No matches
- **If found:** Replace with CSS variable: `style={{ color: 'var(--color-primary)' }}`

### ⛔ Theme Consistency

**Rule:** All color values must come from `school_themes` table via backend service.

- Backend fetches: `primary_color`, `secondary_color`, `accent_color`, `logo_url`, `font_family`, `button_style`
- Frontend applies via CSS variables set on document root
- **If adding color logic:** Document which theme field it maps to

### ⛔ Migrations

- **Rule:** Never edit existing migration files directly
- **Action:** Create new file: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
- **Check:** `supabase db push` to test locally

### ⛔ RLS Policies

- **Rule:** All user-scoped tables must have RLS policy
- **Check:** Database schema includes policy definitions (backend responsibility)

### ⛔ Environment Variables

- **Rule:** Never commit .env or .env.local
- **Action:** Document in .env.example

### ⛔ Secrets

- **Rule:** Never commit Supabase keys, tokens, or API secrets
- **Check:** All secrets from environment variables only

### ⛔ Form Handlers

- **Rule:** Every form must have submit handler calling backend service
- **Action:** If handler not ready, add TODO (not silent fail)

---

## Patterns to Follow

### Theme Service Pattern (Backend)

**In `apps/backend/src/services/theme.ts`:**

```typescript
import { supabase } from "../supabase-client";

export interface Theme {
  theme_id: string;
  school_name: string;
  primary_color: string; // e.g., "#a50f1a"
  secondary_color: string;
  accent_color?: string;
  logo_url?: string;
  font_family?: string;
  button_style?: string;
}

export async function getThemeBySchoolCode(schoolCode: string): Promise<Theme> {
  const { data, error } = await supabase
    .from("school_themes")
    .select("*")
    .eq("school_code", schoolCode)
    .single();

  if (error) throw new Error(`Failed to fetch theme: ${error.message}`);
  return data;
}
```

**Exported from `apps/backend/src/index.ts`:**

```typescript
export * from "./services/theme";
export * from "./services/listings";
// ... other services
```

### Frontend Theme Application (New)

Frontend applies theme on app init:

```typescript
// src/App.tsx or root component
import { getThemeBySchool } from '@/services/theme';

export function App() {
  useEffect(() => {
    const load = async () => {
      const schoolCode = getSchoolCode(); // from URL, session, etc.
      const theme = await getThemeBySchool(schoolCode);
      applyTheme(theme);
    };
    load();
  }, []);

  return <Router>...</Router>;
}

// src/theme/applyTheme.ts
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.primary_color);
  root.style.setProperty('--color-secondary', theme.secondary_color);
  if (theme.accent_color)
    root.style.setProperty('--color-accent', theme.accent_color);
  if (theme.font_family)
    root.style.setProperty('--font-family', theme.font_family);
  if (theme.logo_url)
    root.style.setProperty('--logo-url', `url(${theme.logo_url})`);
}
```

### Component Usage of Theme Colors (New)

Components use CSS variables, not hardcoded colors:

```typescript
// ✅ Correct
export function Button() {
  return (
    <button style={{ backgroundColor: 'var(--color-primary)' }}>
      Click me
    </button>
  );
}

// Or with Tailwind + CSS variables
export function ButtonTailwind() {
  return (
    <button className="bg-[var(--color-primary)] text-white px-4 py-2">
      Click me
    </button>
  );
}

// ❌ Wrong (hardcoded)
// <button style={{ backgroundColor: '#a50f1a' }}>
```

### Backend Service Pattern (For Backend Team)

Services export domain functions:

```typescript
export async function getListingById(id: string) {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(`Failed to fetch listing: ${error.message}`);
  return data;
}
```

### Frontend Service Calling Pattern

Frontend imports and calls backend service functions:

```typescript
// ✅ Correct
import { getListingById, createListing } from '@campus-marketplace/backend';

const listing = await getListingById(id);
await createListing({ title, price, ... });

// ❌ Wrong
// import { supabase } from '@supabase/supabase-js';
// import { supabase } from 'apps/backend/src/supabase-client';
// const { data } = await supabase.from('listings').select('*');
```

### Form Submission Pattern

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    await listingsService.createListing(formData);
    navigate("/");
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### Component Prop Typing

```typescript
interface Props {
  title: string;
  onSubmit: (data: FormData) => Promise<void>;
  isLoading?: boolean;
}

export function Form({ title, onSubmit, isLoading = false }: Props) { ... }
```

---

## Verification Commands

After completing work, run:

```bash
# If frontend task (from apps/web/):
npm run lint           # ESLint (expect: no errors)
npm run build          # TypeScript + Vite (expect: success)
npm run dev            # Run locally and test feature

# If backend task (from apps/backend/):
npm run lint           # ESLint (expect: no errors)
npm run build          # TypeScript compilation (expect: success)

# Check frontend never imports Supabase directly (MUST be empty):
grep -r "@supabase/supabase-js" apps/web/src/

# Check frontend has no hardcoded colors (MUST be empty):
grep -rE "bg-\[#|text-\[#|color:\s*['\"]*#[0-9A-Fa-f]" apps/web/src/
```

If working on database:

```bash
# From project root, with Supabase CLI installed
supabase db push       # Sync migrations to dev database
supabase db reset      # Reset to clean state
```

### Successful Completion Criteria

- ✅ All linting/build checks pass
- ✅ Feature works in dev (`npm run dev`)
- ✅ No console errors or warnings
- ✅ Forms trigger handlers through backend services
- ✅ Frontend has no Supabase imports (grep confirms)
- ✅ Frontend has no hardcoded colors (grep confirms)
- ✅ Colors use CSS variables from theme
- ✅ Backend services export domain functions
- ✅ Commit follows git workflow
- ✅ No .env or secrets in changes
- ✅ Code is typed

---

## Common Pitfalls to Avoid

| Pitfall                                     | Why                         | Solution                                  |
| ------------------------------------------- | --------------------------- | ----------------------------------------- |
| Frontend imports supabase directly          | Violates architecture       | Use backend service; grep to verify       |
| Hardcoded color hex in component            | Breaks multi-school theming | Use CSS variable: `var(--color-primary)`  |
| Editing an existing migration file directly | Migration history breaks    | Create a new timestamped `.sql` migration |
| Form with only preventDefault()             | Input goes nowhere          | Add submit handler calling service        |
| Committing .env                             | Exposes secrets             | Use .env.example                          |
| Untyped component props                     | Reduces IDE help            | Always add `interface Props`              |
| Theme colors hardcoded in CSS               | Can't multi-tenant          | Use CSS variables set by theme service    |
| Not registering routes                      | Pages unreachable           | Add to App.tsx                            |
| Waiting for backend to build UI             | Development blocked         | Use mocks/stubs while waiting             |
| Missing RLS on user-scoped tables           | Security breach             | Backend defines RLS in migration          |

---

## When to Block Work

Stop and escalate if:

- `apps/backend/` folder structure not yet created or set up
- Backend service function not exported from `apps/backend/src/index.ts`
- Supabase project credentials missing or .env not configured
- RLS policies not visible in migrations (security gap)
- Frontend tries to import Supabase SDK directly (architecture violation)

---

## References

- `.github/copilot-instructions.md` — Architecture, stack, commands
- `.github/instructions/frontend.instructions.md` — Frontend-specific rules
- `apps/backend/README.md` — Backend service layer setup (TBD—link when created)
- `docs/dev/GIT_WORKFLOW.md` — Branch strategy
- `supabase/migrations/20260315120000_core_tables.sql` — Initial schema, including `school_themes` table
- [CSS Variables (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
