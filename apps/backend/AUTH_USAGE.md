# Auth API Reference (Frontend)

Import auth functions from `@campus-marketplace/backend`.
**Do NOT import `@supabase/supabase-js` in frontend code.**

## Imports

```ts
import {
  signUpWithEmail,
  signInWithEmail,
  getSessionFromTokens,
  signOutWithTokens,
  refreshSession,
  updatePassword,
  sendPasswordResetEmail,
  getProfile,
} from "@campus-marketplace/backend";
```

---

## What's in the Return Values

Most auth functions return `{ user, session }`. Here's what to use from each:

| Field | Type | Description |
|---|---|---|
| `user.id` | `string` (UUID) | The user's unique ID — pass to `getProfile(user.id)` to load their profile |
| `user.email` | `string` | The user's email address |
| `session.access_token` | `string` | Short-lived JWT (~1 hour) for authenticated requests |
| `session.refresh_token` | `string` | Long-lived token — store in `localStorage`, use to get new access tokens |
| `session` | `Session \| null` | `null` means email confirmation is pending; user cannot sign in yet |

---

## Functions

### `signUpWithEmail`

```ts
signUpWithEmail(input: SignUpInput): Promise<{ user: User; session: Session | null }>
```

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `email` | `string` | yes | User's email address |
| `password` | `string` | yes | Chosen password |
| `display_name` | `string` | yes | Public display name shown in the app |
| `first_name` | `string \| null` | no | First name |
| `last_name` | `string \| null` | no | Last name |
| `bio` | `string \| null` | no | Short profile bio |
| `avatar_path` | `string \| null` | no | Storage path for avatar image |

**Returns** `{ user, session }` — `session` is `null` when email confirmation is required; user cannot sign in until they confirm.

**Side effect:** automatically creates a row in the `profiles` table.

**Throws** if: `email` is empty, `password` is empty, `display_name` is empty, or Supabase returns an auth error.

**Example**

```ts
const { user, session } = await signUpWithEmail({
  email,
  password,
  display_name: "alex_w",
  first_name: "Alex",
});
if (session) {
  localStorage.setItem("access_token", session.access_token);
  localStorage.setItem("refresh_token", session.refresh_token);
} else {
  // Show "check your email to confirm your account" message
}
```

---

### `signInWithEmail`

```ts
signInWithEmail(input: { email: string; password: string }): Promise<{ user: User; session: Session }>
```

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `email` | `string` | yes | User's email address |
| `password` | `string` | yes | User's password |

**Returns** `{ user, session }` — `session` is always non-null on successful login.

**Throws** if: `email` is empty, `password` is empty, credentials are wrong, or Supabase returns an error.

**Example**

```ts
const { user, session } = await signInWithEmail({ email, password });
localStorage.setItem("access_token", session.access_token);
localStorage.setItem("refresh_token", session.refresh_token);
const profile = await getProfile(user.id);
```

---

### `getSessionFromTokens`

```ts
getSessionFromTokens(accessToken: string, refreshToken: string): Promise<{ user: User; session: Session }>
```

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `accessToken` | `string` | yes | Previously stored access token |
| `refreshToken` | `string` | yes | Previously stored refresh token |

**Returns** `{ user, session }` — fresh session object restored from the stored tokens.

**Use:** call on app startup to restore a logged-in state from `localStorage`.

**Throws** if: either token is empty, the token pair is invalid or expired, or Supabase returns an error.

**Example**

```ts
const access = localStorage.getItem("access_token") ?? "";
const refresh = localStorage.getItem("refresh_token") ?? "";
if (access && refresh) {
  const { user } = await getSessionFromTokens(access, refresh);
  const profile = await getProfile(user.id);
}
```

---

### `signOutWithTokens`

```ts
signOutWithTokens(accessToken: string, refreshToken: string): Promise<void>
```

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `accessToken` | `string` | yes | Current session access token |
| `refreshToken` | `string` | yes | Current session refresh token |

**Returns** `void`.

**Behavior:** invalidates this session only — other devices remain signed in.

**Throws** if: either token is empty, session setup fails, or Supabase signout returns an error.

**Example**

```ts
const access = localStorage.getItem("access_token") ?? "";
const refresh = localStorage.getItem("refresh_token") ?? "";
await signOutWithTokens(access, refresh);
localStorage.removeItem("access_token");
localStorage.removeItem("refresh_token");
```

---

### `refreshSession`

```ts
refreshSession(refreshToken: string): Promise<{ user: User; session: Session }>
```

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `refreshToken` | `string` | yes | The stored refresh token |

**Returns** `{ user, session }` — **new** access and refresh tokens. Replace both in storage immediately.

**Use:** when the access token has expired and you have a valid refresh token. Do not call this preemptively — only on 401 / token-expired errors.

**Throws** if: `refreshToken` is empty, the token is expired or invalid, or Supabase returns an error.

**Example**

```ts
const refresh = localStorage.getItem("refresh_token") ?? "";
const { session } = await refreshSession(refresh);
localStorage.setItem("access_token", session.access_token);
localStorage.setItem("refresh_token", session.refresh_token);
```

---

### `updatePassword`

```ts
updatePassword(accessToken: string, refreshToken: string, newPassword: string): Promise<void>
```

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `accessToken` | `string` | yes | Current session access token |
| `refreshToken` | `string` | yes | Current session refresh token |
| `newPassword` | `string` | yes | The new password to set |

**Returns** `void`.

**Use:** authenticated change-password form. Requires a valid active session — not usable from a logged-out state.

**Throws** if: any field is empty, session setup fails, or Supabase update returns an error.

**Example**

```ts
const access = localStorage.getItem("access_token") ?? "";
const refresh = localStorage.getItem("refresh_token") ?? "";
await updatePassword(access, refresh, newPassword);
// Consider clearing tokens and prompting re-login after password change
```

---

### `sendPasswordResetEmail`

```ts
sendPasswordResetEmail(email: string, redirectTo?: string): Promise<void>
```

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `email` | `string` | yes | Email address of the account |
| `redirectTo` | `string` | no | URL to redirect to after the user clicks the reset link |

**Returns** `void`.

**Use:** unauthenticated forgot-password flow. Sends a reset email via Supabase.

**Throws** if: `email` is empty, or Supabase returns an error.

**Example**

```ts
await sendPasswordResetEmail(email, "https://yourapp.com/reset-password");
// Show "check your email" message — function returns void on success
```

---

## Error Handling

All functions throw `Error` on failure. Always wrap calls in `try/catch` in UI handlers.

Error messages sourced from Supabase are passed through verbatim and are generally safe to display to the user as-is (e.g., `"Invalid login credentials"`, `"Email not confirmed"`).

```ts
try {
  const { user, session } = await signInWithEmail({ email, password });
  // ...
} catch (err) {
  setErrorMessage(err instanceof Error ? err.message : "Sign in failed");
}
```

---

## Common Patterns

```ts
// Login
const { user, session } = await signInWithEmail({ email, password });
localStorage.setItem("access_token", session.access_token);
localStorage.setItem("refresh_token", session.refresh_token);
const profile = await getProfile(user.id);
```

```ts
// Restore session on app startup
const access = localStorage.getItem("access_token") ?? "";
const refresh = localStorage.getItem("refresh_token") ?? "";
if (access && refresh) {
  const { user } = await getSessionFromTokens(access, refresh);
  await getProfile(user.id);
}
```

```ts
// Refresh expired access token
const refresh = localStorage.getItem("refresh_token") ?? "";
const { session } = await refreshSession(refresh);
localStorage.setItem("access_token", session.access_token);
localStorage.setItem("refresh_token", session.refresh_token);
```

```ts
// Change password (authenticated user)
const access = localStorage.getItem("access_token") ?? "";
const refresh = localStorage.getItem("refresh_token") ?? "";
await updatePassword(access, refresh, newPassword);
```

---

## Source Files

- `apps/backend/src/services/auth.ts`
- `apps/backend/src/services/profile.ts`
