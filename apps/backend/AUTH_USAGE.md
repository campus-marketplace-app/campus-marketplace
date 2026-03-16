# Auth Wrapper Quick Guide (Frontend)

Use auth functions from `@campus-marketplace/backend`.
Do NOT import `@supabase/supabase-js` in frontend code.

## Imports

```ts
import {
  signUpWithEmail,
  signInWithEmail,
  getSessionFromTokens,
  signOutWithTokens,
  sendPasswordResetEmail,
  getProfile,
} from "@campus-marketplace/backend";
```

## Core Types

```ts
interface SignUpInput {
  email: string;
  password: string;
  display_name: string;
  first_name?: string | null;
  last_name?: string | null;
  bio?: string | null;
  avatar_path?: string | null;
}

interface SignInInput {
  email: string;
  password: string;
}

interface AuthResult {
  user: User;
  session: Session | null;
}
```

## Function Contracts

- `signUpWithEmail(input: SignUpInput): Promise<AuthResult>`
  - Input: signup form values
  - Output: created `user` + `session` (or `null`)
  - Notes: also creates/updates profile row in `profiles`

- `signInWithEmail(input: SignInInput): Promise<AuthResult>`
  - Input: email + password
  - Output: authenticated `user` + `session` (or `null`)

- `getSessionFromTokens(accessToken: string, refreshToken: string): Promise<AuthResult>`
  - Input: stored tokens
  - Output: restored `user` + `session`
  - Use: app startup / refresh restore

- `signOutWithTokens(accessToken: string, refreshToken: string): Promise<void>`
  - Input: current tokens
  - Output: nothing (throws on failure)
  - Use: logout button

- `sendPasswordResetEmail(email: string, redirectTo?: string): Promise<void>`
  - Input: user email + optional redirect URL
  - Output: nothing (throws on failure)
  - Use: forgot-password flow

## What Is `session`?

`session` is the auth state returned by Supabase for a logged-in user.

You mainly use:
- `session.access_token`: short-lived token used for authenticated requests
- `session.refresh_token`: token used to restore/refresh login
- `session.expires_at` (if present): token expiry time

If `session` is `null`, treat user as not fully signed in yet (or email confirmation flow is pending).

## Recommended Frontend Flow

1. On login/signup success:
   - Read `result.session`
   - If present, store `access_token` and `refresh_token` (or rely on secure cookie strategy)
   - Load profile with `getProfile(result.user.id)`

2. On app startup:
   - Read stored tokens
   - Call `getSessionFromTokens(access, refresh)`
   - If restore fails, clear tokens and go to logged-out state

3. On logout:
   - Call `signOutWithTokens(access, refresh)`
   - Clear stored tokens and local user/profile state

## Minimal Usage Examples

```ts
// login
const { user, session } = await signInWithEmail({ email, password });
if (session) {
  localStorage.setItem("access_token", session.access_token);
  localStorage.setItem("refresh_token", session.refresh_token);
}
const profile = await getProfile(user.id);
```

```ts
// restore on app init
const access = localStorage.getItem("access_token") ?? "";
const refresh = localStorage.getItem("refresh_token") ?? "";
if (access && refresh) {
  const { user } = await getSessionFromTokens(access, refresh);
  await getProfile(user.id);
}
```

## Error Handling Rule

All functions throw `Error` on failure. Always use `try/catch` in UI handlers.

## Source Files

- `apps/backend/src/services/auth.ts`
- `apps/backend/src/services/profile.ts`
