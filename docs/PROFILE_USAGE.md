# Profile — Usage Guide

> **Rule:** Never import `@supabase/supabase-js` in the frontend. Use `@campus-marketplace/backend`.

## Import

```ts
import {
  getProfile,
  upsertProfile,
  updateProfile,
  uploadAvatar,
  getAvatarUrl,
} from "@campus-marketplace/backend";
import type { UserProfile } from "@campus-marketplace/backend";
```

## Types

```ts
interface UserProfile {
  user_id: string        // auth user UUID
  display_name: string   // public-facing name
  first_name: string | null
  last_name: string | null
  bio: string | null
  avatar_path: string | null // storage path e.g. "uuid/avatar.png" — NOT a URL, use getAvatarUrl()
  account_type: "student" | "business"
  created_at: string     // ISO-8601
  updated_at: string
}
```

---

## getProfile(userId) — fetch a user's profile

```ts
const profile = await getProfile(session.user.id);
```

**Input:** `string` — auth user UUID
**Returns:** `UserProfile`
**Throws:** if the profile doesn't exist or `userId` is empty

---

## upsertProfile(input) — create or fully replace a profile

Prefer `updateProfile` for partial edits. Use this on signup or full profile replacement.

```ts
const profile = await upsertProfile({
  user_id: session.user.id,
  display_name: "alex_w",
  first_name: "Alex",
  bio: "CS student",
});
```

| Param | Type | Required |
|-------|------|----------|
| `user_id` | `string` | yes |
| `display_name` | `string` | yes |
| `first_name` | `string \| null` | no |
| `last_name` | `string \| null` | no |
| `bio` | `string \| null` | no |
| `avatar_path` | `string \| null` | no |
| `account_type` | `"student" \| "business" \| null` | no (defaults to `"student"`) |

**Returns:** `UserProfile`
**Throws:** if `user_id` or `display_name` is empty

---

## updateProfile(userId, updates) — partial profile update

Pass only the fields you want to change.

```ts
await updateProfile(session.user.id, { bio: "Updated bio" });
```

| Param | Type | Required |
|-------|------|----------|
| `userId` | `string` | yes |
| `updates.display_name` | `string` | no |
| `updates.first_name` | `string \| null` | no |
| `updates.last_name` | `string \| null` | no |
| `updates.bio` | `string \| null` | no |
| `updates.avatar_path` | `string \| null` | no |

`account_type` is intentionally not accepted by `updateProfile` and is immutable after profile creation.

**Returns:** updated `UserProfile`
**Throws:** if no fields are provided, or `display_name` is set to `""`

---

## uploadAvatar(userId, file, contentType) — upload a profile picture

Uploads to `avatars/{userId}/avatar.{ext}` and saves the path to the profile row automatically. Overwrites any existing avatar.

```ts
const file = event.target.files[0];
const updatedProfile = await uploadAvatar(session.user.id, file, file.type);
const url = getAvatarUrl(updatedProfile.avatar_path!);
```

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | `string` | yes | |
| `file` | `File \| Blob \| ArrayBuffer` | yes | |
| `contentType` | `string` | yes | e.g. `"image/png"`, `"image/jpeg"` |

**Returns:** updated `UserProfile` with `avatar_path` set to the new storage path
**Throws:** if `userId` is empty or the upload fails

---

## getAvatarUrl(avatarPath) — get a displayable URL

Converts a stored `avatar_path` to a public URL. Synchronous — no network call.

```ts
const url = profile.avatar_path
  ? getAvatarUrl(profile.avatar_path)
  : "/default-avatar.png";
```

**Input:** `string` — `avatar_path` from a `UserProfile` (check for null before calling)
**Returns:** `string` — public URL

---

## Error Handling

All functions except `getAvatarUrl` throw on failure. Wrap calls in `try/catch`:

```ts
try {
  const profile = await getProfile(userId);
} catch (err) {
  console.error(err instanceof Error ? err.message : "Unknown error");
}
```

Common errors:
| Message | Cause |
|---------|-------|
| `"Profile user_id is required"` | empty `userId` |
| `"Profile display_name is required"` | missing on upsert |
| `"Profile display_name cannot be empty"` | `display_name: ""` on update |
| `"No profile updates provided"` | `updateProfile` called with `{}` |
| `"Profile not found for user_id: ..."` | no profile row for this user |
| `"Failed to upload avatar: ..."` | Supabase Storage error |

## Source

- `apps/backend/src/services/profile.ts`
- `supabase/migrations/20260323120000_avatars_storage.sql` — avatars bucket + RLS
