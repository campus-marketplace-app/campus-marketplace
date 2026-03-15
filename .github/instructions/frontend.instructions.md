# Frontend Development Instructions — Campus Marketplace

## Critical Rules

1. **Do NOT import `@supabase/supabase-js`** — not even once; all Supabase access through `@campus-marketplace/backend`
2. **Do NOT hardcode color hex values** — use theme CSS variables from `school_themes` table
3. **All colors read from backend theme service** — applied as CSS variables on app init

## Scope

Rules specific to `apps/web/src/` and frontend components.

## Theme System Architecture

**How theming works:**

1. Backend service fetches from `school_themes` table by school code
2. Backend returns: `{ primary_color, secondary_color, accent_color, logo_url, font_family, button_style, ... }`
3. Frontend applies theme to document root as CSS variables
4. Components use CSS variables in styles

**CSS Variables to expect:**

```
--color-primary       (e.g., #a50f1a)
--color-secondary     (e.g., #f1b7be)
--color-accent        (e.g., #c41e3a)
--font-family         (e.g., Arial)
--logo-url            (e.g., url(https://...))
--button-style        (e.g., "rounded" | "sharp")
```

---

## Component Requirements

### Props Must Be Typed

```typescript
interface Props {
  title: string;
  onClose: () => void;
  isLoading?: boolean;
}

export function Modal({ title, onClose, isLoading = false }: Props) { ... }
```

### Use React Hooks Correctly

- `useState` for local state
- `useEffect` for side effects (with correct dependencies)
- `useMemo` for expensive computations
- `useCallback` for stable function references

Avoid:

- Setting state in render (infinite loop)
- Omitted dependencies in useEffect
- Calling hooks conditionally

### Styling: Use Tailwind + CSS Variables (New)

**Rule:** Never hardcode color hex values. Use CSS variables from theme.

#### Pattern 1: CSS Variables with Inline Styles

```typescript
// ✅ Correct
export function Header() {
  return (
    <header style={{ backgroundColor: 'var(--color-primary)' }} className="p-4">
      <h1 style={{ color: 'white' }}>Campus Marketplace</h1>
    </header>
  );
}
```

#### Pattern 2: CSS Variables with Tailwind

```typescript
// ✅ Correct (requires tailwind config to allow arbitrary values)
export function Button() {
  return (
    <button className="bg-[var(--color-primary)] text-white px-4 py-2 rounded">
      Submit
    </button>
  );
}
```

#### Pattern 3: CSS File with Theme Variables

```css
/* src/index.css or component.css */
.primary-button {
  background-color: var(--color-primary);
  color: white;
  padding: 0.5rem 1rem;
}
```

```typescript
export function Button() {
  return <button className="primary-button">Submit</button>;
}
```

**What NOT to do:**

```typescript
// ❌ Wrong — hardcoded colors
export function BadButton() {
  return (
    <button style={{ backgroundColor: '#a50f1a' }}>Submit</button>
  );
}

// ❌ Wrong — hardcoded in Tailwind arbitrary value
export function BadButton2() {
  return <button className="bg-[#a50f1a]">Submit</button>;
}
```

### Forms: Always Add Handler

Every form must submit to a backend service:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    await listingsService.createListing({
      title: formData.title,
      price: formData.price,
    });
    navigate('/');
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

<form onSubmit={handleSubmit}>...</form>
```

**Current incomplete forms:** `src/pages/login.tsx`, `src/pages/signup.tsx`, `src/layouts/sidebar-layout.tsx` listing form

### Backend Service Integration

Frontend imports services directly from `@campus-marketplace/backend` (monorepo package):

```typescript
// ✅ Correct
import {
  getThemeBySchoolCode,
  getListingById,
  createListing,
  getProfile,
  sendMessage,
} from "@campus-marketplace/backend";

const theme = await getThemeBySchoolCode("njit");
const listing = await getListingById(id);

// ❌ Wrong — never happen
import { supabase } from "@supabase/supabase-js";
import { supabase } from "apps/backend/src/supabase-client";
const { data } = await supabase.from("listings").select("*");
```

**Why direct imports?** Monorepo allows frontend to import backend services as a TypeScript package without HTTP overhead.

### Custom Hooks for Backend Services (Recommended)

Wrap backend services in custom hooks for cleaner component code:

```typescript
// src/hooks/useListing.ts
import { getListingById } from "@campus-marketplace/backend";

export function useListing(id: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await getListingById(id);
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  return { data, loading, error };
}

// Component
export function ListingPage() {
  const { data: listing, loading, error } = useListing(id);
  // ...
}
```

### Theme Hook (For Colors)

```typescript
// src/hooks/useTheme.ts
import { useEffect, useState } from 'react';
import { getThemeBySchoolCode } from '@campus-marketplace/backend';

export function useTheme(schoolCode: string) {
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    const load = async () => {
      const t = await getThemeBySchoolCode(schoolCode);
      setTheme(t);
    };
    load();
  }, [schoolCode]);

  return theme;
}

// Component
export function ThemedButton() {
  const theme = useTheme('njit');
  return (
    <button style={{ backgroundColor: theme?.primary_color }}>
      Themed Button
    </button>
  );
}
```

### Error Handling

Always wrap async operations with try/catch and display errors:

```typescript
try {
  const data = await backendService.getData();
  setData(data);
} catch (err) {
  console.error("Failed to fetch:", err);
  setError("Could not load data. Please try again."); // user-friendly
}
```

### Navigation Pattern

Use `react-router-dom`:

- `<Link to="/">` for static navigation
- `<NavLink>` for menu items (active class auto-applied)
- `useNavigate()` for programmatic navigation
- `useLocation()` to read path / state

### Modal Pattern

Modals use overlay divs with `backdrop-blur-sm`:

```typescript
{isOpen && (
  <div onClick={onClose} className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm">
    <div onClick={e => e.stopPropagation()} className="bg-white rounded-lg p-6">
      {/* content */}
    </div>
  </div>
)}
```

---

## File Structure Rules

### Pages (`src/pages/`)

- One page component per file
- Named to match route (current examples: `index.tsx`, `listing.tsx`, `profile.tsx`, `messages.tsx`, `login.tsx`, `signup.tsx`)
- Export as default
- Register in `App.tsx`

### Features (`src/features/`)

- Reusable UI pieces (components used in multiple pages)
- Currently: navbar.tsx, page-header.tsx

### Layouts (`src/layouts/`)

- Wrapper components (SidebarLayout, etc.)

### Services (`src/services/`)

- **Frontend data layer:** Custom hooks that wrap backend service imports (e.g., `useListing.ts`)
- **NOT backend services themselves** (those live in `apps/backend/src/services/`)
- Re-export backend functions with custom hooks for cleaner component use
- Example: import `{ getListingById }` from backend, wrap in `useListing()` hook

### Theme (`src/theme/`)

- **NEW:** Theme utilities
- Example: `applyTheme.ts` (sets CSS variables), `useTheme.ts` (custom hook for theme colors)
- Re-exports from `apps/backend` theme service

### Shared (`src/shared/`)

- Utilities, constants, types
- Never add a Supabase client here (only backend uses Supabase SDK)

### Root (`src/`)

- `App.tsx`: route definitions
- `main.tsx`: entry point (do not edit)
- `index.css`: global styles + CSS variable definitions

---

## Tailwind + PostCSS Setup

**Don't change:**

- `tailwind.config.js`
- `postcss.config.js`
- `index.css`

**To support CSS variables in Tailwind arbitrary values:**
Ensure `tailwind.config.js` allows arbitrary values (enabled by default in Tailwind v3+):

```typescript
// tailwind.config.js
export default {
  theme: {
    extend: {},
  },
};
```

Then use:

```typescript
<div className="bg-[var(--color-primary)]">Content</div>
```

---

## CSS Variables in Global Stylesheet

**In `src/index.css` or `src/theme/variables.css`:**

```css
:root {
  /* Theme colors (set by applyTheme function) */
  --color-primary: #a50f1a; /* will be overridden by backend theme */
  --color-secondary: #f1b7be;
  --color-accent: #c41e3a;

  /* Theme fonts */
  --font-family: Arial, sans-serif;

  /* Fallback button style */
  --button-style: rounded;
}
```

**Imported in main.tsx or index.css so variables are available globally.**

---

## Environment Variables for Frontend

**Required in `.env.local`:**

```
VITE_SCHOOL_CODE=njit  # School identifier for theme loading (or pass via URL param)
```

**Access in code:**

```typescript
const schoolCode = import.meta.env.VITE_SCHOOL_CODE || "njit";
```

**Monorepo package:** Frontend imports backend services as `@campus-marketplace/backend` (configured in monorepo setup).

---

## Backend Services (Current State)

**Current state:** Backend service layer exists in `apps/backend/src/services/`, but many functions are scaffolded stubs that currently throw `Not yet implemented`.

**Frontend guidance right now:**

1. Import functions from `@campus-marketplace/backend` directly
2. Use `try/catch` and render loading/error/fallback UI for stubbed endpoints
3. Do not add frontend Supabase clients as a workaround

**Temporary resilient pattern (frontend hook):**

```typescript
import { useEffect, useState } from "react";
import { getThemeBySchoolCode } from "@campus-marketplace/backend";

export function useTheme(schoolCode: string) {
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const loadedTheme = await getThemeBySchoolCode(schoolCode);
        setTheme(loadedTheme);
      } catch (err) {
        setError("Theme service unavailable");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [schoolCode]);

  return { theme, loading, error };
}
```

---

## App Initialization with Theme (New)

**In `src/App.tsx` or root component:**

```typescript
import { useEffect } from 'react';
import { getThemeBySchoolCode } from '@campus-marketplace/backend';
import { applyTheme } from '@/theme/applyTheme';

export function App() {
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const schoolCode = getSchoolCode(); // from URL, env, session, etc.
        const theme = await getThemeBySchoolCode(schoolCode);
        applyTheme(theme);
      } catch (error) {
        console.error('Failed to load theme:', error);
        // fallback to default theme variables
      }
    };

    loadTheme();
  }, []); // run once on app init

  return (
    <BrowserRouter>
      <SidebarLayout>
        <Outlet />
      </SidebarLayout>
    </BrowserRouter>
  );
}

function getSchoolCode(): string {
  // Get from URL, environment, or session
  // Example: from URL query param
  const params = new URLSearchParams(window.location.search);
  return params.get('school') || import.meta.env.VITE_SCHOOL_CODE || 'njit';
}
```

**In `src/theme/applyTheme.ts`:**

```typescript
export interface Theme {
  primary_color: string;
  secondary_color: string;
  accent_color?: string;
  logo_url?: string;
  font_family?: string;
  button_style?: string;
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;

  root.style.setProperty("--color-primary", theme.primary_color);
  root.style.setProperty("--color-secondary", theme.secondary_color);

  if (theme.accent_color) {
    root.style.setProperty("--color-accent", theme.accent_color);
  }

  if (theme.font_family) {
    root.style.setProperty("--font-family", theme.font_family);
  }

  if (theme.logo_url) {
    root.style.setProperty("--logo-url", `url(${theme.logo_url})`);
  }

  if (theme.button_style) {
    root.style.setProperty("--button-style", theme.button_style);
  }
}
```

---

## Authentication (Incomplete — Plan for Implementation)

When backend team implements auth:

1. Backend handles Supabase Auth or custom auth
2. Frontend calls login/signup/logout backend services
3. Frontend stores session token in state or localStorage
4. Create AuthContext or Zustand store for user state
5. Protect routes with `<PrivateRoute />` component

---

## Form Validation (Incomplete — Plan for Implementation)

When adding validation:

1. **Simple:** Manual validation in submit handler
2. **Recommended:** Zod + React Hook Form

---

## Image Uploads (Incomplete — Plan for Implementation)

When implementing:

1. Backend service handles Supabase Storage upload
2. Frontend calls backend service with file
3. Backend returns image URL

---

## Testing (Not Yet Configured)

Add tests when needed: Vitest + React Testing Library.

- Unit tests in `src/components/__tests__/`
- Mock backend services with MSW (Mock Service Worker)

---

## Linting & Type Checking

**Run before committing:**

```bash
cd apps/web
npm run lint   # Fix: npm run lint -- --fix
npm run build  # Includes TypeScript check
```

**Check for forbidden patterns:**

```bash
# Should be COMPLETELY EMPTY (never even try to import supabase):
grep -r "@supabase" apps/web/src/
grep -r "supabase-client" apps/web/src/

# Should be COMPLETELY EMPTY (hardcoded colors only in CSS variables):
grep -rE "bg-\[#|text-\[#|color:\s*['\"]*#[0-9A-Fa-f]" apps/web/src/
```

---

## Performance Considerations

- `useMemo` for expensive selectors (already done in listing.tsx for ID lookup)
- `useCallback` if passing function props to memoized children
- React.memo for expensive component renders
- Code splitting: React Router v7 supports lazy imports

```typescript
const ListingPage = lazy(() => import('@/pages/listing'));

// In routes:
<Route path="/listing/:id" element={<ListingPage />} />
```

---

## References

- Tailwind CSS: https://tailwindcss.com/docs
- CSS Variables (MDN): https://developer.mozilla.org/en-US/docs/Web/CSS/--*
- React: https://react.dev
- React Router: https://reactrouter.com
- React Hook Form: https://react-hook-form.com
- Backend service layer docs: `apps/backend/README.md`
