import { describe, it, expect, afterEach, type TaskContext } from "vitest";
import {
  signUpWithEmail,
  signInWithEmail,
  getSessionFromTokens,
  refreshSession,
  signOutWithTokens,
  updatePassword,
  sendPasswordResetEmail,
} from "../auth.js";
import { supabase } from "../../supabase-client.js";
import { testEmail } from "./helpers.js";

// Tracks user IDs to delete after each test
const userIdsToCleanup: string[] = [];

afterEach(async () => {
  for (const id of userIdsToCleanup.splice(0)) {
    await supabase.auth.admin.deleteUser(id);
  }
});

async function signUpTestUser(email: string, password: string, displayName = "Test User") {
  const result = await signUpWithEmail({ email, password, display_name: displayName });
  userIdsToCleanup.push(result.user.id);
  return result;
}

describe("signUpWithEmail", () => {
  it("creates user and profile with valid .edu email", async () => {
    const result = await signUpTestUser(testEmail(), "Password123!");
    expect(result.user).toBeDefined();
    expect(result.user.id).toBeTruthy();
  });

  it("creates a matching profile row after sign up", async () => {
    const result = await signUpTestUser(testEmail(), "Password123!", "Profile Check User");
    const { getProfile } = await import("../profile.js");
    const profile = await getProfile(result.user.id);
    expect(profile.user_id).toBe(result.user.id);
    expect(profile.display_name).toBe("Profile Check User");
  });

  it("throws with non-.edu email", async () => {
    await expect(
      signUpWithEmail({ email: "user@gmail.com", password: "Password123!", display_name: "Test" }),
    ).rejects.toThrow(".edu");
  });

  it("throws with empty email", async () => {
    await expect(
      signUpWithEmail({ email: "", password: "Password123!", display_name: "Test" }),
    ).rejects.toThrow("Email is required");
  });

  it("throws with empty display_name", async () => {
    await expect(
      signUpWithEmail({ email: testEmail(), password: "Password123!", display_name: "" }),
    ).rejects.toThrow("Display name is required");
  });
});

describe("signInWithEmail", () => {
  it("returns user and session with valid credentials", async () => {
    const email = testEmail();
    const password = "Password123!";
    await signUpTestUser(email, password, "Signin User");

    const result = await signInWithEmail({ email, password });
    expect(result.user).toBeDefined();
    expect(result.session).toBeDefined();
  });

  it("throws with wrong password", async () => {
    const email = testEmail();
    await signUpTestUser(email, "Correct123!", "Wrong PW User");

    await expect(signInWithEmail({ email, password: "WrongPassword!" })).rejects.toThrow();
  });

  it("throws with empty email", async () => {
    await expect(
      signInWithEmail({ email: "", password: "Password123!" }),
    ).rejects.toThrow("Email is required");
  });

  it("throws with empty password", async () => {
    await expect(
      signInWithEmail({ email: testEmail(), password: "" }),
    ).rejects.toThrow("Password is required");
  });
});

describe("getSessionFromTokens", () => {
  it("returns user from valid tokens", async ({ skip }: TaskContext) => {
    const email = testEmail();
    const result = await signUpTestUser(email, "TokenTest123!", "Token User");

    if (!result.session) skip(); // Email confirmation required in this environment

    const restored = await getSessionFromTokens(
      result.session!.access_token,
      result.session!.refresh_token,
    );
    expect(restored.user).toBeDefined();
    expect(restored.user.id).toBe(result.user.id);
  });
});

describe("refreshSession", () => {
  it("returns new session from valid refresh token", async ({ skip }: TaskContext) => {
    const result = await signUpTestUser(testEmail(), "Refresh123!", "Refresh User");

    if (!result.session) skip();

    const refreshed = await refreshSession(result.session!.refresh_token);
    expect(refreshed.user).toBeDefined();
    expect(refreshed.session).toBeDefined();
  });
});

describe("signOutWithTokens", () => {
  it("resolves without error for valid session", async ({ skip }: TaskContext) => {
    const result = await signUpTestUser(testEmail(), "Signout123!", "Signout User");

    if (!result.session) skip();

    await expect(
      signOutWithTokens(result.session!.access_token, result.session!.refresh_token),
    ).resolves.toBeUndefined();
  });
});

describe("updatePassword", () => {
  it("changes password so old password no longer works", async ({ skip }: TaskContext) => {
    const email = testEmail();
    const oldPassword = "OldPassword123!";
    const result = await signUpTestUser(email, oldPassword, "PW Update User");

    if (!result.session) skip();

    await updatePassword(result.session!.access_token, result.session!.refresh_token, "NewPassword456!");

    await expect(signInWithEmail({ email, password: oldPassword })).rejects.toThrow();
  });
});

describe("sendPasswordResetEmail", () => {
  it("throws with empty email", async () => {
    await expect(sendPasswordResetEmail("")).rejects.toThrow("Email is required");
  });

  it("throws for a non-deliverable test domain (Supabase validates email deliverability)", async () => {
    // Supabase rejects password reset emails sent to fake domains like test.edu.
    // A real integration test would require a deliverable address; we verify the
    // function propagates the Supabase error correctly instead.
    const email = testEmail();
    await signUpTestUser(email, "ResetTest123!", "Reset User");

    await expect(sendPasswordResetEmail(email)).rejects.toThrow("Failed to send password reset email");
  });
});
