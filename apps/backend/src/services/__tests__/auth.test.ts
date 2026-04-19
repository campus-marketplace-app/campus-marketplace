import { describe, it, expect, afterEach, type TaskContext } from "vitest";
import {
  signUpWithEmail,
  signInWithEmail,
  getSessionFromTokens,
  refreshSession,
  signOutWithTokens,
  updatePassword,
  sendPasswordResetEmail,
  deactivateAccount,
} from "../auth.js";
import { getProfile } from "../profile.js";
import { supabase } from "../../supabase-client.js";
import { testEmail } from "./helpers.js";

// Tracks user IDs to delete after each test
const userIdsToCleanup: string[] = [];

afterEach(async () => {
  for (const id of userIdsToCleanup.splice(0)) {
    await supabase.auth.admin.deleteUser(id);
  }
});

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes("request rate limit reached");
}

async function signUpTestUser(
  email: string,
  password: string,
  displayName = "Test User",
  accountType?: "student" | "business",
  skip?: TaskContext["skip"],
) {
  let result;

  try {
    result = await signUpWithEmail({
      email,
      password,
      display_name: displayName,
      ...(accountType ? { account_type: accountType } : {}),
    });
  } catch (error) {
    if (skip && isRateLimitError(error)) {
      skip();
      return;
    }

    throw error;
  }

  userIdsToCleanup.push(result.user.id);
  return result;
}

describe("signUpWithEmail", () => {
  it("creates user and profile with valid .edu email", async ({ skip }: TaskContext) => {
    const result = await signUpTestUser(testEmail(), "Password123!", "Test User", undefined, skip);
    if (!result) return;

    expect(result.user).toBeDefined();
    expect(result.user.id).toBeTruthy();
  });

  it("creates a matching profile row after sign up", async ({ skip }: TaskContext) => {
    const result = await signUpTestUser(testEmail(), "Password123!", "Profile Check User", undefined, skip);
    if (!result) return;

    const { getProfile } = await import("../profile.js");
    const profile = await getProfile(result.user.id);
    expect(profile.user_id).toBe(result.user.id);
    expect(profile.display_name).toBe("Profile Check User");
    expect(profile.account_type).toBe("student");
  });

  it("persists explicit business account_type from sign up", async ({ skip }: TaskContext) => {
    const result = await signUpTestUser(testEmail(), "Password123!", "Business User", "business", skip);
    if (!result) return;

    const { getProfile } = await import("../profile.js");
    const profile = await getProfile(result.user.id);
    expect(profile.account_type).toBe("business");
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
  it("returns user and session with valid credentials", async ({ skip }: TaskContext) => {
    const email = testEmail();
    const password = "Password123!";
    const result = await signUpTestUser(email, password, "Signin User", undefined, skip);
    if (!result) return;

    const signedIn = await signInWithEmail({ email, password });
    expect(signedIn.user).toBeDefined();
    expect(signedIn.session).toBeDefined();
  });

  it("throws with wrong password", async ({ skip }: TaskContext) => {
    const email = testEmail();
    const result = await signUpTestUser(email, "Correct123!", "Wrong PW User", undefined, skip);
    if (!result) return;

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
    const result = await signUpTestUser(email, "TokenTest123!", "Token User", undefined, skip);
    if (!result) return;

    const session = result.session;
    if (!session) {
      skip(); // Email confirmation required in this environment
      return;
    }

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
    const result = await signUpTestUser(testEmail(), "Refresh123!", "Refresh User", undefined, skip);
    if (!result) return;

    const session = result.session;
    if (!session) {
      skip();
      return;
    }

    const refreshed = await refreshSession(result.session!.refresh_token);
    expect(refreshed.user).toBeDefined();
    expect(refreshed.session).toBeDefined();
  });
});

describe("signOutWithTokens", () => {
  it("resolves without error for valid session", async ({ skip }: TaskContext) => {
    const result = await signUpTestUser(testEmail(), "Signout123!", "Signout User", undefined, skip);
    if (!result) return;

    const session = result.session;
    if (!session) {
      skip();
      return;
    }

    await expect(
      signOutWithTokens(result.session!.access_token, result.session!.refresh_token),
    ).resolves.toBeUndefined();
  });
});

describe("updatePassword", () => {
  it("changes password so old password no longer works", async ({ skip }: TaskContext) => {
    const email = testEmail();
    const oldPassword = "OldPassword123!";
    const result = await signUpTestUser(email, oldPassword, "PW Update User", undefined, skip);
    if (!result) return;

    const session = result.session;
    if (!session) {
      skip();
      return;
    }

    await updatePassword(result.session!.access_token, result.session!.refresh_token, "NewPassword456!");

    await expect(signInWithEmail({ email, password: oldPassword })).rejects.toThrow();
  });
});

describe("sendPasswordResetEmail", () => {
  it("throws with empty email", async () => {
    await expect(sendPasswordResetEmail("")).rejects.toThrow("Email is required");
  });

  it("resolves for a valid .edu user", async ({ skip }: TaskContext) => {
    // Supabase reset-email deliverability behavior can vary by environment,
    // so this integration test validates our service call for a valid .edu user.
    const email = testEmail();
    const result = await signUpTestUser(email, "ResetTest123!", "Reset User", undefined, skip);
    if (!result) return;

    await expect(sendPasswordResetEmail(email)).resolves.toBeUndefined();
  });
});

describe("deactivateAccount", () => {
  it("sets deactivated_at on the profile", async ({ skip }: TaskContext) => {
    const result = await signUpTestUser(testEmail(), "Password123!", "Deactivate Test", undefined, skip);
    if (!result) return;
    const { session } = result;
    if (!session) { skip(); return; }

    await deactivateAccount(result.user.id, session.access_token, session.refresh_token);

    const profile = await getProfile(result.user.id);
    expect(profile.deactivated_at).not.toBeNull();
  });

  it("soft-deletes the user's active listings", async ({ skip }: TaskContext) => {
    const result = await signUpTestUser(testEmail(), "Password123!", "Deactivate Listings", undefined, skip);
    if (!result) return;
    const { session } = result;
    if (!session) { skip(); return; }

    await supabase.from("listings").insert({
      user_id: result.user.id,
      title: "Listing to hide",
      description: "test",
      price: 10,
      status: "active",
    });

    await deactivateAccount(result.user.id, session.access_token, session.refresh_token);

    const { data: listings } = await supabase
      .from("listings")
      .select("deleted_at")
      .eq("user_id", result.user.id);

    expect(listings?.every((l) => l.deleted_at !== null)).toBe(true);
  });

  it("throws with empty userId", async () => {
    await expect(deactivateAccount("", "tok", "ref")).rejects.toThrow("User ID is required");
  });
});

describe("signInWithEmail — deactivated account guard", () => {
  it("blocks login and throws account_deactivated for a deactivated user", async ({ skip }: TaskContext) => {
    const email = testEmail();
    const password = "Password123!";
    const result = await signUpTestUser(email, password, "Block Login User", undefined, skip);
    if (!result) return;

    // Stamp deactivated_at directly (avoids calling deactivateAccount which signs out).
    await supabase
      .from("profiles")
      .update({ deactivated_at: new Date().toISOString() })
      .eq("user_id", result.user.id);

    await expect(signInWithEmail({ email, password })).rejects.toThrow("account_deactivated:");
  });
});
