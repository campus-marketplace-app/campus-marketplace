# Theme System Guide

How school-specific branding works in the app, and how to use it when building UI.

---

## How It Works

```
school_themes (Supabase)
  → getThemeBySchoolCode()   [apps/backend/src/services/theme.ts]
  → ThemeContext / ThemeProvider   [apps/web/src/contexts/ThemeContext.tsx]
  → CSS variables on <html>   [applied at runtime]
  → Tailwind classes in components   [bg-[var(--color-primary)], etc.]
```

At app startup, `ThemeProvider` reads `VITE_SCHOOL_CODE` from the environment, fetches the school's row from `school_themes`, and writes all color/font values as CSS variables onto `document.documentElement`. Every component picks those up via Tailwind's arbitrary-value syntax.

The CSS variables in `index.css` are **fallbacks only** — they match NJIT's branding and are overwritten immediately once the fetch completes.

---

## CSS Variables Reference

These are the variables `ThemeContext` sets. Use them in any component.

| Variable | What it's for | NJIT fallback |
|---|---|---|
| `--color-primary` | Main brand color — nav bar, primary buttons, headers | `#B81C24` |
| `--color-secondary` | Secondary brand color | `#FFFFFF` |
| `--color-accent` | Highlight / callout color | `#f1b7be` |
| `--color-background` | Page background | `#ececec` |
| `--color-text-on-primary` | Text that sits **on top of** primary-colored elements | `#FFFFFF` |
| `--color-button-style` | Button outline/style color | `#000000` |
| `--color-primary-hover` | Lighter primary for hover states | `#d42230` |
| `--color-primary-dark` | Darker primary for pressed/active states | `#8c0010` |
| `--color-accent-light` | Very light tint of accent, for tag backgrounds | `#f6d3d6` |
| `--color-accent-muted` | Desaturated accent, for subtle highlights | `#cc7f84` |
| `--color-secondary-muted` | Blend of primary + accent, for secondary text | `#c86d72` |
| `--color-background-alt` | Alternate background — card rows, table stripes | `#dddddd` |
| `--color-border` | Borders, dividers, input outlines | `#b9b9b9` |
| `--color-surface` | Card / panel background | `#d8d8d8` |
| `--color-surface-alt` | Nested card background, sidebar items | `#d0d0d0` |
| `--font-family` | School font stack | `Arial, Helvetica, sans-serif` |

The hover/dark/muted/surface values are **derived automatically** from the base colors using HSL math in `buildCssVars()`. You never set them in the database — they just work.

---

## Using Theme in Components

### Option 1 — Tailwind arbitrary values (current pattern)

```tsx
// Primary button
<button className="bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:bg-[var(--color-primary-hover)]">
  Post Listing
</button>

// Card
<div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
  ...
</div>

// Tag / badge
<span className="bg-[var(--color-accent-light)] text-[var(--color-primary)] text-xs px-2 py-0.5 rounded-full">
  Electronics
</span>
```

### Option 2 — Inline style (for dynamic values or non-Tailwind situations)

```tsx
<div style={{ color: 'var(--color-primary)', borderColor: 'var(--color-border)' }}>
  ...
</div>
```

### Option 3 — `useTheme()` hook (for non-CSS data)

Use this when you need school name, logo, background images, or to control dark mode — not for colors.

```tsx
import { useTheme } from '@/contexts/ThemeContext';

function PageHeader() {
  const { schoolName, logoUrl } = useTheme();
  return (
    <header className="bg-[var(--color-primary)]">
      {logoUrl && <img src={logoUrl} alt={schoolName} />}
      <span className="text-[var(--color-text-on-primary)]">{schoolName}</span>
    </header>
  );
}
```

**Full hook shape:**

```ts
type ThemeContextValue = {
  theme: SchoolTheme | null;     // raw DB row
  loading: boolean;              // true while fetching
  themeModePreference: 'system' | 'light' | 'dark';   // user's stored choice
  resolvedThemeMode: 'light' | 'dark';                 // what's actually applied
  darkModeAvailable: boolean;    // true only if dark colors are in the DB
  setThemeMode: (mode: 'system' | 'light' | 'dark') => void;
  schoolName: string;            // e.g. "New Jersey Institute of Technology"
  logoUrl: string | null;        // school logo URL from Supabase Storage
  loginBgUrl: string | null;     // full-page background for /login
  signupBgUrl: string | null;    // full-page background for /signup
};
```

---

## Dark Mode

The app supports a three-way preference: `'system'`, `'light'`, or `'dark'`.

- Preference is saved to `localStorage` and restored on next visit.
- When `'system'`, the app follows the OS `prefers-color-scheme` setting and updates live if it changes.
- Dark mode only activates if the school's DB row has `primary_color_dark`, `secondary_color_dark`, and `accent_color_dark` set. Check `darkModeAvailable` before showing the toggle.
- When dark mode is active, ThemeContext adds the `dark` class to `<html>`. All CSS variables are re-derived from the dark color set automatically.

**Showing the mode toggle:**

```tsx
const { themeModePreference, setThemeMode, darkModeAvailable } = useTheme();

// Only show toggle if this school has dark colors configured
{darkModeAvailable && (
  <ThemeModeToggle />
)}
```

**Rule:** Never hardcode hex values. Use `var(--color-*)` so dark mode (and other schools) work automatically.

---

## Component Classes

Named component classes are defined in `apps/web/src/index.css` using `@layer components`. They use the CSS variables under the hood, so they automatically pick up the school's colors and dark mode.

**Use these when building new UI or when cleaning up existing components.** Don't repeat the full `bg-[var(--color-primary)] text-[var(--color-text-on-primary)]` chain — just use the class name.

You can also use the short Tailwind color tokens directly in any className (see the [CSS Variables Reference](#css-variables-reference) section — each variable has a matching token like `bg-primary`, `text-on-primary`, `border-border`, etc.).

### Buttons

| Class | When to use |
|---|---|
| `btn-primary` | Main form actions — submit, save, confirm |
| `btn-accent` | Large CTA buttons (contact seller, make offer) |
| `btn-accent-sm` | Small inline action buttons |
| `btn-ghost` | Low-priority or secondary actions |
| `btn-post` | The "Post Listing" navbar button with shadow effect |

### Cards & Containers

| Class | When to use |
|---|---|
| `card-primary` | Modal/panel with primary brand background |
| `card-form` | Auth page card container (signup, login, reset) |
| `card-form-header` | Header bar inside an auth form card |
| `card` | General content card with surface background |

### Navigation

| Class | When to use |
|---|---|
| `nav-link` | Base class for all sidebar/navbar links |
| `nav-link-active` | Add when the link is the active route |
| `nav-link-inactive` | Add when the link is not active |

```tsx
// Example — replaces the current 5x repeated className function in navbar.tsx
<NavLink className={({ isActive }) =>
  `nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`
}>
  Messages
</NavLink>
```

### Labels & Text

| Class | When to use |
|---|---|
| `label-field` | Small uppercase field labels ("PRICE", "CATEGORY", etc.) |

### Page Layout

| Class | When to use |
|---|---|
| `page-bg` | Full-page background wrapper |
| `page-bg-alt` | Full-page wrapper with alternate background color |

---

## Adding a New School

1. Insert a row into the `school_themes` table in Supabase.
   - Required: `school_name`, `school_code` (IPEDS OPE ID), `primary_color`, `secondary_color`.
   - Optional but recommended: `accent_color`, `logo_url`, `font_family`, `email_domain`, `background_color`, `text_on_primary`.
   - Dark mode: add `primary_color_dark`, `secondary_color_dark`, `accent_color_dark` to enable the toggle.
   - Page backgrounds: `login_background_url`, `signup_background_url` for full-page images on auth screens.
2. Set `VITE_SCHOOL_CODE` in `apps/web/.env.local` to that school's IPEDS OPE ID.
3. Logo and background images go in the `theme-assets` Supabase Storage bucket.

