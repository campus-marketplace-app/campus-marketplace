# Design System

Everything that controls how the app looks lives in one file:
**`apps/web/src/index.css`**

Change a value there and it updates every component that uses it — no hunting through individual files.

---

## How it's structured

```
index.css
├── @theme inline        ← teaches Tailwind the color token names (bg-primary, text-on-primary, etc.)
├── @custom-variant dark ← wires the .dark class on <html> to Tailwind's dark: prefix
├── :root                ← fallback values for colors + ALL shape/size tokens
└── @layer components    ← named component classes (btn-accent, input-field, modal-root, etc.)
```

Colors come from the database at runtime via `ThemeContext` — see `THEME_USAGE.md` for that side.
Shape and size tokens are static and live directly in `:root`.

---

## Shape & size tokens

These are the knobs you turn to restyle the whole app at once.
All values are in `apps/web/src/index.css` inside `:root`.

### Border radius

| Token | Default | Used on |
|---|---|---|
| `--radius-sm` | `0.25rem` | Cards (`card-primary`, `card`) |
| `--radius-md` | `0.75rem` | Inputs, small buttons, nav pills, display fields |
| `--radius-lg` | `1rem` | Large title inputs (`input-title`), select dropdowns |
| `--radius-full` | `9999px` | Badges (fully round) |

**Example — make everything pill-shaped:**
```css
--radius-md: 9999px;
--radius-lg: 9999px;
```

**Example — make everything square/sharp:**
```css
--radius-sm:   0;
--radius-md:   0;
--radius-lg:   0;
--radius-full: 0;
```

### Button sizing

| Token | Default | Used on |
|---|---|---|
| `--btn-px-lg` | `2rem` | Large accent buttons (`btn-accent`) — horizontal padding |
| `--btn-px-sm` | `1rem` | Primary/small buttons (`btn-primary`, `btn-accent-sm`) — horizontal padding |
| `--btn-py` | `0.5rem` | All buttons — vertical padding |
| `--btn-text-lg` | `1.5rem` | Large accent buttons — font size |
| `--btn-text-sm` | `0.875rem` | Small accent buttons — font size |

**Example — bigger, chunkier buttons:**
```css
--btn-px-lg:   3rem;
--btn-py:      0.75rem;
--btn-text-lg: 1.75rem;
```

### Input / field sizing

| Token | Default | Used on |
|---|---|---|
| `--input-px` | `1rem` | All inputs, display fields, selects — horizontal padding |
| `--input-py` | `0.75rem` | All inputs, display fields, selects — vertical padding |

**Example — taller, more spacious fields:**
```css
--input-py: 1.25rem;
```

---

## Component classes

These are defined in the `@layer components` block in `index.css`.
Use them in JSX instead of writing out the full Tailwind utility chain each time.

### Buttons

| Class | What it looks like | Use for |
|---|---|---|
| `btn-primary` | Dark primary bg, white text, hover effect | Form submits, confirms |
| `btn-accent` | Accent bg, large padding, big text | Main page CTAs (contact seller, back) |
| `btn-accent-sm` | Same as above but small, rounded | Inline actions (edit, unpublish) |
| `btn-ghost` | No background, primary text color | Secondary/low-priority actions |
| `btn-post` | Accent-light bg, black border, drop shadow | "Post Listing" navbar button |

```tsx
<button className="btn-primary">Save</button>
<button className="btn-accent">Message Seller</button>
<button className="btn-accent-sm">Edit Listing</button>
```

### Cards & containers

| Class | What it looks like | Use for |
|---|---|---|
| `card-primary` | Primary brand color background, rounded | Modal/panel backgrounds |
| `card-form` | Secondary-muted bg, primary-dark border | Auth pages (login, signup, reset) |
| `card-form-header` | Primary-dark header bar | Top bar inside an auth form card |
| `card` | Surface bg, border, padding | General content cards |

```tsx
<div className="card-primary p-6">...</div>
<div className="card-form max-w-sm">
  <h1 className="card-form-header">Sign In</h1>
  ...
</div>
```

### Inputs & form fields

| Class | What it looks like | Use for |
|---|---|---|
| `input-field` | White bg, rounded, padded | Standard text/number/select inputs in forms |
| `input-underline` | No bg, bottom border only, centered text | Auth form inputs (login, signup) |
| `display-field` | White bg, rounded, padded, no outline | Read-only value display boxes |
| `input-title` | White bg, large rounded, centered, text-3xl | Big title input or display at top of a page |
| `input-select` | White bg, large rounded, border, focus ring | Styled `<select>` dropdowns |

```tsx
<input className="input-field" type="text" />
<input className="input-underline" placeholder="Email" />
<div className="display-field">{listing.price}</div>
<input className="input-title" value={title} />
<select className="input-select">...</select>
```

### Modals & overlays

Every modal in the app uses this three-layer structure:

```tsx
<div className="modal-root">
  <div className="modal-backdrop" onClick={onClose} />   {/* dim backdrop */}
  <section className="modal-panel">
    {/* your content here */}
  </section>
</div>
```

| Class | What it does |
|---|---|
| `modal-root` | Full-screen fixed overlay, centers content |
| `modal-backdrop` | Absolute dim layer behind the panel, clickable to close |
| `modal-panel` | Scrollable content area with responsive padding |

To constrain the panel width, add a `max-w-*` class: `className="modal-panel max-w-2xl"`.

### Auth guard prompt

Shown when a page requires login but the user isn't signed in:

```tsx
<div className="auth-prompt">
  <div className="auth-prompt-card">
    <h2>Sign in required</h2>
    <Link to="/login" className="btn-primary block text-center">Go to Login</Link>
  </div>
</div>
```

| Class | What it does |
|---|---|
| `auth-prompt` | Full-height centered overlay with dark bg |
| `auth-prompt-card` | White rounded card, max-width constrained |

### Badges

```tsx
<span className="badge bg-primary text-on-primary">✓ PUBLISHED</span>
<span className="badge bg-accent text-black">DRAFT</span>
```

`badge` handles shape and padding. You add the color classes separately so you can use any color.

### Navigation

```tsx
<NavLink className={({ isActive }) =>
  `nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`
}>
  Messages
</NavLink>
```

| Class | What it does |
|---|---|
| `nav-link` | Base style — block, rounded, padded, on-primary text |
| `nav-link-active` | White tint bg + shadow (current route) |
| `nav-link-inactive` | Hover-only white tint |

### Labels

```tsx
<p className="label-field">Price</p>
```

`label-field` — small, uppercase, bold, spaced-out. Used for field labels like "PRICE", "CATEGORY", "CONDITION".

### Page layout

```tsx
<div className="page-bg">...</div>       {/* main background */}
<div className="page-bg-alt">...</div>   {/* alternate (slightly darker) background */}
```

---

## Experimenting

Open `apps/web/src/index.css`, find the `:root` block, and try changing any of these:

```css
/* Make everything pill-shaped */
--radius-md: 9999px;
--radius-lg: 9999px;

/* Make everything square */
--radius-sm: 0;
--radius-md: 0;
--radius-lg: 0;

/* Bigger buttons */
--btn-px-lg: 3rem;
--btn-text-lg: 1.75rem;

/* Taller inputs */
--input-py: 1.25rem;
```

Save the file — Vite hot-reloads instantly, no restart needed.
Each token updates every component that uses it simultaneously.

---

## Rules

- **Never hardcode hex colors** in component files. Use `bg-primary`, `text-on-primary`, etc.
- **Never repeat the full `bg-[var(--color-primary)]` chain** — use a component class or a token (`bg-primary`).
- **When building new UI**, look for an existing component class first before writing raw Tailwind.
- **When a pattern repeats 3+ times**, add a new class to `@layer components` in `index.css`.
