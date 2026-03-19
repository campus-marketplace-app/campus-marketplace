import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabase-client.js";

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

  if (!input.display_name.trim()) {
    throw new Error("Display name is required");
  }

  // Pass profile fields as user metadata so the database trigger
  // (handle_new_user) can create the profile row immediately on user creation,
  // bypassing RLS without needing an active session.
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
export async function getSessionFromTokens(accessToken: string,refreshToken: string,): Promise<AuthResult> {
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
export async function signOutWithTokens(accessToken: string,refreshToken: string): Promise<void> {
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

  if (setSessionError) {
    throw new Error(
      `Failed to set session for sign out: ${setSessionError.message}`,
    );
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

// Changes the password for an authenticated user.
export async function updatePassword(accessToken: string, refreshToken: string,newPassword: string): Promise<void> {
  if (!accessToken.trim()) throw new Error("Access token is required");
  if (!refreshToken.trim()) throw new Error("Refresh token is required");
  if (!newPassword.trim()) throw new Error("New password is required");

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

// Sends Supabase password reset email.
export async function sendPasswordResetEmail(email: string,redirectTo?: string): Promise<void> {
  if (!email.trim()) {
    throw new Error("Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}
