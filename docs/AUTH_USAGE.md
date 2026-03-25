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
  completePasswordReset,
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

## Password flows — which functions to use

There are two separate password scenarios, each using different functions:

**Forgot my password (user is logged out)** — 2-step flow:
1. `sendPasswordResetEmail` — sends the reset link to the user's email
2. `completePasswordReset` — called when the user lands back on the app from that link; no session required

**Change my password (user is logged in)** — 1-step:
- `updatePassword` — requires an active session (access + refresh tokens); use this from account settings

---

## updatePassword(accessToken, refreshToken, newPassword) — change password while logged in

For authenticated users who want to update their password from account settings.

```ts
await updatePassword(access, refresh, newPassword);
```

**Input:** `accessToken: string`, `refreshToken: string`, `newPassword: string`
**Returns:** `void`
**Throws:** if any field is empty or session setup fails

---

## sendPasswordResetEmail(email, redirectTo?) — step 1 of forgot-password flow

Sends a reset link to the user's email. Does not change the password itself — it only triggers the email. Pair this with `completePasswordReset`.

```ts
await sendPasswordResetEmail(email, "https://yourapp.com/reset-password");
```

**Input:** `email: string`, `redirectTo?: string` — where Supabase redirects after the link is clicked (falls back to the URL configured in the Supabase dashboard)
**Returns:** `void`
**Throws:** if `email` is empty

---

## completePasswordReset(token, newPassword) — step 2 of forgot-password flow

Call this on the reset-password page after the user lands from the email link. Extract `code` from the URL and pass it as `token`. No session needed — the code proves identity.

```ts
// e.g. on /reset-password?code=abc123
const code = new URLSearchParams(window.location.search).get("code") ?? "";
await completePasswordReset(code, newPassword);
// user is now signed in with the new password
```

**Input:** `token: string` (the `code` param from the reset URL), `newPassword: string`
**Returns:** `void` — establishes a session as a side effect
**Throws:** if token is empty/invalid/expired, or if password is empty or under 6 characters

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
