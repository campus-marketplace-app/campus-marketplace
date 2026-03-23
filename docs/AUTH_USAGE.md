# Auth — Usage Guide

> **Rule:** Never import `@supabase/supabase-js` in the frontend. Use `@campus-marketplace/backend`.

## Import

```ts
import {
  signUpWithEmail,
  signInWithEmail,
  getSessionFromTokens,
  signOutWithTokens,
  refreshSession,
  updatePassword,
  sendPasswordResetEmail,
} from "@campus-marketplace/backend";
```

## Types

```ts
// Most auth functions return { user, session } — here's what to use from each:
{
  user.id             // string (UUID) — pass to getProfile(user.id)
  user.email          // string
  session.access_token  // short-lived JWT (~1 hour)
  session.refresh_token // long-lived — store in localStorage
  session             // null when email confirmation is pending
}
```

---

## signUpWithEmail(input) — register a new user

```ts
const { user, session } = await signUpWithEmail({
  email,
  password,
  display_name: "alex_w",
  first_name: "Alex", // optional
});

if (session) {
  localStorage.setItem("access_token", session.access_token);
  localStorage.setItem("refresh_token", session.refresh_token);
} else {
  // show "check your email" message — confirmation required
}
```

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `email` | `string` | yes | |
| `password` | `string` | yes | |
| `display_name` | `string` | yes | shown publicly in the app |
| `first_name` | `string \| null` | no | |
| `last_name` | `string \| null` | no | |
| `bio` | `string \| null` | no | |
| `avatar_path` | `string \| null` | no | storage path, not a URL |

**Returns:** `{ user, session }` — `session` is `null` when email confirmation is required
**Side effect:** auto-creates a row in the `profiles` table
**Throws:** if `email`, `password`, or `display_name` is empty

---

## signInWithEmail(input) — sign in an existing user

```ts
const { user, session } = await signInWithEmail({ email, password });
localStorage.setItem("access_token", session.access_token);
localStorage.setItem("refresh_token", session.refresh_token);
```

**Input:** `{ email: string, password: string }`
**Returns:** `{ user, session }` — session is always non-null on success
**Throws:** if credentials are wrong or either field is empty

---

## getSessionFromTokens(accessToken, refreshToken) — restore session on app startup

```ts
const access = localStorage.getItem("access_token") ?? "";
const refresh = localStorage.getItem("refresh_token") ?? "";
if (access && refresh) {
  const { user } = await getSessionFromTokens(access, refresh);
}
```

**Input:** `accessToken: string`, `refreshToken: string`
**Returns:** `{ user, session }`
**Throws:** if either token is empty, invalid, or expired

---

## signOutWithTokens(accessToken, refreshToken) — sign out current session

```ts
await signOutWithTokens(access, refresh);
localStorage.removeItem("access_token");
localStorage.removeItem("refresh_token");
```

**Input:** `accessToken: string`, `refreshToken: string`
**Returns:** `void` — invalidates this session only; other devices stay signed in
**Throws:** if either token is empty or session setup fails

---

## refreshSession(refreshToken) — get a new access token

```ts
const { session } = await refreshSession(refresh);
localStorage.setItem("access_token", session.access_token);
localStorage.setItem("refresh_token", session.refresh_token);
```

**Input:** `string` — the stored refresh token
**Returns:** `{ user, session }` — replace both tokens in storage immediately
**Throws:** if token is empty, expired, or invalid

---

## updatePassword(accessToken, refreshToken, newPassword) — change password

```ts
await updatePassword(access, refresh, newPassword);
```

**Input:** `accessToken: string`, `refreshToken: string`, `newPassword: string`
**Returns:** `void`
**Throws:** if any field is empty or session setup fails

---

## sendPasswordResetEmail(email, redirectTo?) — trigger password reset

```ts
await sendPasswordResetEmail(email, "https://yourapp.com/reset-password");
```

**Input:** `email: string`, `redirectTo?: string`
**Returns:** `void`
**Throws:** if `email` is empty

---

## Error Handling

All functions throw on failure. Wrap calls in `try/catch`:

```ts
try {
  const { user, session } = await signInWithEmail({ email, password });
} catch (err) {
  setErrorMessage(err instanceof Error ? err.message : "Sign in failed");
}
```

Supabase error messages are passed through verbatim and are safe to show in the UI (e.g. `"Invalid login credentials"`, `"Email not confirmed"`).

## Source

- `apps/backend/src/services/auth.ts`
- `apps/backend/src/services/profile.ts`
