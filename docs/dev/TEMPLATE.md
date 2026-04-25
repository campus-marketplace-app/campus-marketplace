# [Service Name] — Usage Guide

> **Rule:** one-line constraint, e.g. "Never import `@supabase/supabase-js` in the frontend. Use `@campus-marketplace/backend`."

## Import

```ts
import { fn1, fn2 } from "@campus-marketplace/backend";
import type { TypeName } from "@campus-marketplace/backend"; // only if types are used directly in the frontend
```

## Types

```ts
// Only include types whose shape isn't obvious.
// Omit this section entirely if functions return primitives or the shape is self-explanatory.
interface TypeName {
  id: string           // UUID
  value: string | null // null means [explain what null signifies]
  created_at: string   // ISO-8601
}
```

---

## fn1(param) — one-line description of what it does

```ts
// Minimal, realistic usage — this IS the signature reference
const result = await fn1("value");
```

**Input:** `string` — what this param represents *(use this shorthand for a single required param)*
**Returns:** `TypeName`
**Throws:** if [condition that causes failure]

---

## fn2(param, options?) — one-line description

```ts
const result = await fn2("value", { limit: 20 });
```

| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `param` | `string` | yes | — | |
| `options.limit` | `number` | no | `50` | |
| `options.flag` | `boolean` | no | `false` | omit `Default` column if no params have defaults |

**Returns:** `TypeName[]` — empty array if none found
**Throws:** if param is empty

---

## Error Handling

All functions throw on failure. Wrap calls in `try/catch`:

```ts
try {
  const result = await fn1("value");
} catch (err) {
  console.error(err instanceof Error ? err.message : "Unknown error");
}
```

## Source

- `apps/backend/src/services/[service].ts`

---

<!--
RULES FOR USING THIS TEMPLATE
==============================
1. Example first, table second — devs scan code before prose.
2. Use **Input:** shorthand for a single required param; use the table for 2+ params or any optional params.
3. Add a Default column to the param table only when at least one param has a default.
4. Keep Returns and Throws as bold inline lines, not headings — saves vertical space.
5. No full TypeScript signatures — the code example IS the signature.
6. Types section only when the shape needs explanation; omit for primitives or obvious types.
7. One example per function — the most common real-world usage only.
8. One horizontal rule (---) between every function entry.
-->
