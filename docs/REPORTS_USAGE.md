# Reports — Usage Guide

> **Rule:** Never import `@supabase/supabase-js` in the frontend. Use `@campus-marketplace/backend`.

## Import

```ts
import { createReport } from "@campus-marketplace/backend";
import type { Report } from "@campus-marketplace/backend";
```

## Types

```ts
interface Report {
  id: string;
  reporter_id: string;
  reported_listing_id: string | null;  // set if reporting a listing
  reported_user_id: string | null;     // set if reporting a user
  reason: string;
  details: string | null;
  status: "pending" | "in_review" | "resolved" | "dismissed";
  created_at: string;
  updated_at: string;
}
```

---

## createReport(reporterId, reportedListingId, reportedUserId, reason, details?) — report a listing or user

Report a listing:
```ts
const report = await createReport(myUserId, listingId, null, "Inappropriate content", "The description contains offensive language");
```

Report a user:
```ts
const report = await createReport(myUserId, null, otherUserId, "Spam", "Keeps posting fake listings");
```

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `reporterId` | `string` | yes | your user ID |
| `reportedListingId` | `string \| null` | yes | set this OR reportedUserId, not both |
| `reportedUserId` | `string \| null` | yes | set this OR reportedListingId, not both |
| `reason` | `string` | yes | short reason for the report |
| `details` | `string` | no | longer explanation |

**Returns:** `Report` — new report with status "pending"
**Throws:** if both targets are set, if neither target is set, if the reported listing doesn't exist, or if reason is empty

---

## Error Handling

All functions throw on failure. Wrap calls in `try/catch`:

```ts
try {
  await createReport(myUserId, listingId, null, "Spam");
} catch (err) {
  console.error(err instanceof Error ? err.message : "Unknown error");
}
```

## Source

- `apps/backend/src/services/reports.ts`
