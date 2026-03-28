# Categories & Tags — Usage Guide

> **Rule:** Never import `@supabase/supabase-js` in the frontend. Use `@campus-marketplace/backend`.

## Import

```ts
import { getCategories, getCategoryById, getTags } from "@campus-marketplace/backend";
import type { Category, Tag } from "@campus-marketplace/backend";
```

## Types

```ts
interface Category {
  id: string;              // UUID
  parent_id: string | null; // null = top-level category
  name: string;
  description: string | null;
  created_at: string;      // ISO-8601
}

interface Tag {
  id: string;
  name: string;
  created_at: string;
}
```

---

## getCategories() — load all categories for dropdowns

```ts
const categories = await getCategories();
```

**Returns:** `Category[]` — sorted alphabetically by name. Empty array if none exist.

---

## getCategoryById(id) — load a single category

```ts
const category = await getCategoryById("some-uuid");
```

**Input:** `string` — the category UUID
**Returns:** `Category`
**Throws:** if the category doesn't exist or has been deleted

---

## getTags() — load all tags for dropdowns

```ts
const tags = await getTags();
```

**Returns:** `Tag[]` — sorted alphabetically by name. Empty array if none exist.

---

## Error Handling

All functions throw on failure. Wrap calls in `try/catch`:

```ts
try {
  const categories = await getCategories();
} catch (err) {
  console.error(err instanceof Error ? err.message : "Unknown error");
}
```

## Source

- `apps/backend/src/services/categories.ts`
