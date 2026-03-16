# Backend Auth Wrapper Usage

Use these functions from `@campus-marketplace/backend` in the frontend. Do not import Supabase directly in frontend code.

## Available functions

- `signUpWithEmail(input)`
- `signInWithEmail(input)`
- `getSessionFromTokens(accessToken, refreshToken)`
- `signOutWithTokens(accessToken, refreshToken)`
- `sendPasswordResetEmail(email, redirectTo?)`

## Types

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
```

## Quick examples

```ts
import {
  signUpWithEmail,
  signInWithEmail,
  getSessionFromTokens,
  signOutWithTokens,
  sendPasswordResetEmail,
} from "@campus-marketplace/backend";

const signUpResult = await signUpWithEmail({
  email: "student@school.edu",
  password: "your-password",
  display_name: "Student Name",
});

const signInResult = await signInWithEmail({
  email: "student@school.edu",
  password: "your-password",
});

if (signInResult.session) {
  const restored = await getSessionFromTokens(
    signInResult.session.access_token,
    signInResult.session.refresh_token,
  );

  await signOutWithTokens(
    restored.session?.access_token ?? "",
    restored.session?.refresh_token ?? "",
  );
}

await sendPasswordResetEmail("student@school.edu");
```

## Notes

- `signUpWithEmail` auto-creates or updates a profile in `public.profiles`.
- Functions throw `Error` on failure. Wrap calls in `try/catch`.
- Required backend env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`.
