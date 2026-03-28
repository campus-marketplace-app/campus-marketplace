import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabase-client.js";
import { upsertProfile, type UpsertProfileInput } from "./profile.js";

// Input shape for signing up with email/password. We require display_name for profile creation but other profile fields are optional.
export interface SignUpInput {
  email: string;
  password: string;
  display_name: string;
  first_name?: string | null;
  last_name?: string | null;
  bio?: string | null;
  avatar_path?: string | null;
}

// Input shape for signing in with email/password.
export interface SignInInput {
  email: string;
  password: string;
}

// Result shape for auth operations that return a user and session.
export interface AuthResult {
  user: User;
  session: Session | null;
}

// SIGNUP: Creates an auth user with email/password and initializes a profile.
export async function signUpWithEmail(input: SignUpInput): Promise<AuthResult> {
  if (!input.email.trim()) {
    throw new Error("Email is required");
  }

  if (!input.password.trim()) {
    throw new Error("Password is required");
  }

  if (input.password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  if (!input.display_name.trim()) {
    throw new Error("Display name is required");
  }

  const domain = input.email.split("@")[1]?.toLowerCase() ?? "";
  if (!domain.endsWith(".edu")) {
    throw new Error("Only .edu email addresses are allowed to sign up.");
  }

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        display_name: input.display_name,
        first_name: input.first_name ?? null,
        last_name: input.last_name ?? null,
      },
    },
  });

  if (error) {
    throw new Error(`Failed to sign up: ${error.message}`);
  }

  if (!data.user) {
    throw new Error("Sign up did not return a user");
  }

  const profilePayload: UpsertProfileInput = {
    user_id: data.user.id,
    display_name: input.display_name,
    first_name: input.first_name ?? null,
    last_name: input.last_name ?? null,
    bio: input.bio ?? null,
    avatar_path: input.avatar_path ?? null,
  };

  // The DB trigger `handle_new_user` also creates a profile on auth signup,
  // but it only sets display_name. This explicit upsert adds bio, avatar_path,
  // and other optional fields the trigger doesn't handle. Both writes are safe
  // because upsertProfile uses "on conflict do update".
  //
  // If this call fails, the auth user is left without a full profile.
  // Fixing that requires the service role key (admin API), not available in browser.
  await upsertProfile(profilePayload);
  return {
    user: data.user,
    session: data.session ?? null,
  };
}

// SIGNIN: Signs in an existing user with email/password.
export async function signInWithEmail(input: SignInInput): Promise<AuthResult> {
  if (!input.email.trim()) {
    throw new Error("Email is required");
  }

  if (!input.password.trim()) {
    throw new Error("Password is required");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    throw new Error(`Failed to sign in: ${error.message}`);
  }

  if (!data.user) {
    throw new Error("Sign in did not return a user");
  }

  return {
    user: data.user,
    session: data.session ?? null,
  };
}

// Builds a session from existing access/refresh tokens.
export async function getSessionFromTokens(accessToken: string, refreshToken: string): Promise<AuthResult> {
  if (!accessToken.trim()) {
    throw new Error("Access token is required");
  }

  if (!refreshToken.trim()) {
    throw new Error("Refresh token is required");
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw new Error(`Failed to restore session: ${error.message}`);
  }

  if (!data.user) {
    throw new Error("Session restore did not return a user");
  }

  return {
    user: data.user,
    session: data.session ?? null,
  };
}

// Signs out a session identified by access/refresh tokens.
export async function signOutWithTokens(accessToken: string, refreshToken: string): Promise<void> {
  if (!accessToken.trim()) {
    throw new Error("Access token is required");
  }

  if (!refreshToken.trim()) {
    throw new Error("Refresh token is required");
  }

  const { error: setSessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // If setSession fails (e.g. fully expired tokens), still proceed with local sign-out
  // so the user's in-memory session is cleared. Server-side revocation may not happen,
  // but that is acceptable — the tokens are expired anyway.
  if (setSessionError) {
    console.warn(`Could not set session before sign out: ${setSessionError.message}`);
  }

  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    throw new Error(`Failed to sign out: ${error.message}`);
  }
}

// Refreshes an expired access token using a refresh token.
export async function refreshSession(refreshToken: string): Promise<AuthResult> {
  if (!refreshToken.trim()) {
    throw new Error("Refresh token is required");
  }

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

  if (error) {
    throw new Error(`Failed to refresh session: ${error.message}`);
  }

  if (!data.user) {
    throw new Error("Session refresh did not return a user");
  }

  return {
    user: data.user,
    session: data.session ?? null,
  };
}

// PASSWORD FLOWS — two separate scenarios:
//
// 1. Logged-in user changing their password (account settings):
//    → call updatePassword(accessToken, refreshToken, newPassword)
//    Requires an active session. Tokens come from localStorage.
//
// 2. Logged-out user who forgot their password:
//    → call sendPasswordResetEmail(email, redirectTo) — sends a reset link to their email
//    → user clicks the link, lands on /reset-password?code=abc123
//    → call completePasswordReset(code, newPassword) — no session needed, the code proves identity

// Changes the password for an authenticated user (scenario 1 above).
export async function updatePassword(accessToken: string, refreshToken: string, newPassword: string): Promise<void> {
  if (!accessToken.trim()) throw new Error("Access token is required");
  if (!refreshToken.trim()) throw new Error("Refresh token is required");
  if (!newPassword.trim()) throw new Error("New password is required");
  if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");

  const { error: setError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (setError) {
    throw new Error(`Failed to set session: ${setError.message}`);
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    throw new Error(`Failed to update password: ${error.message}`);
  }
}

// Completes a password reset using the PKCE code from the reset email link.
// Call this on the reset-password page after extracting `code` from the URL.
// Works for logged-out users — no session required.
export async function completePasswordReset(token: string, newPassword: string): Promise<void> {
  if (!token.trim()) {
    throw new Error("Reset token is required");
  }

  if (!newPassword.trim()) {
    throw new Error("Password is required");
  }

  if (newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(token);

  if (exchangeError) {
    throw new Error("Reset token is invalid or has expired");
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    throw new Error(`Failed to update password: ${error.message}`);
  }
}

// Forces a token refresh so the Supabase client has a non-expired JWT.
// Call this before any RLS-protected write operation.
export async function ensureFreshSession(): Promise<AuthResult> {
  const { data, error } = await supabase.auth.refreshSession();

  if (error || !data.session) {
    throw new Error("Session expired — please log in again.");
  }

  return {
    user: data.session.user,
    session: data.session,
  };
}

// Sends Supabase password reset email.
export async function sendPasswordResetEmail(email: string, redirectTo?: string): Promise<void> {
  if (!email.trim()) {
    throw new Error("Email is required");
  }

  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (!domain.endsWith(".edu")) {
    throw new Error("Only .edu email addresses are allowed.");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}
