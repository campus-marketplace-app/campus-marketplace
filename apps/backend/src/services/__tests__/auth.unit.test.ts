import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, upsertProfileMock, fromMock } = vi.hoisted(() => ({
  authMock: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    setSession: vi.fn(),
    signOut: vi.fn(),
    refreshSession: vi.fn(),
    updateUser: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    resetPasswordForEmail: vi.fn(),
  },
  upsertProfileMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("../../supabase-client.js", () => ({
  supabase: {
    auth: authMock,
    from: fromMock,
  },
}));

vi.mock("../profile.js", async () => {
  const actual = await vi.importActual("../profile.js");
  return {
    ...actual,
    upsertProfile: upsertProfileMock,
  };
});

import {
  completePasswordReset,
  deactivateAccount,
  ensureFreshSession,
  getSessionFromTokens,
  refreshSession,
  sendPasswordResetEmail,
  signInWithEmail,
  signOutWithTokens,
  signUpWithEmail,
  updatePassword,
} from "../auth.js";

describe("auth service unit", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    authMock.signUp.mockResolvedValue({
      data: {
        user: { id: "u1" },
        session: { access_token: "a", refresh_token: "r" },
      },
      error: null,
    });
    authMock.signInWithPassword.mockResolvedValue({
      data: { user: { id: "u1" }, session: { access_token: "a", refresh_token: "r" } },
      error: null,
    });
    authMock.setSession.mockResolvedValue({
      data: { user: { id: "u1" }, session: { access_token: "a", refresh_token: "r", user: { id: "u1" } } },
      error: null,
    });
    authMock.signOut.mockResolvedValue({ error: null });
    authMock.refreshSession.mockResolvedValue({
      data: { user: { id: "u1" }, session: { access_token: "a2", refresh_token: "r2", user: { id: "u1" } } },
      error: null,
    });
    authMock.updateUser.mockResolvedValue({ error: null });
    authMock.exchangeCodeForSession.mockResolvedValue({ error: null });
    authMock.resetPasswordForEmail.mockResolvedValue({ error: null });
    upsertProfileMock.mockResolvedValue({ user_id: "u1" });

    // Default from() chain: happy-path — profile is active (deactivated_at: null)
    const makeSelectChain = () => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { deactivated_at: null }, error: null }),
    });
    const makeUpdateChain = () => ({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ error: null }),
    });
    fromMock.mockImplementation(() => ({ ...makeSelectChain(), ...makeUpdateChain() }));
  });

  it("signUpWithEmail applies default account_type and upserts profile", async () => {
    const result = await signUpWithEmail({
      email: "test@school.edu",
      password: "Password123",
      display_name: "Test User",
    });

    expect(result.user.id).toBe("u1");
    expect(upsertProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        account_type: "student",
      }),
    );
  });

  it("validates signUpWithEmail required fields and password length", async () => {
    await expect(signUpWithEmail({ email: "", password: "Password123", display_name: "Name" })).rejects.toThrow(
      "Email is required",
    );
    await expect(signUpWithEmail({ email: "a@school.edu", password: "", display_name: "Name" })).rejects.toThrow(
      "Password is required",
    );
    await expect(signUpWithEmail({ email: "a@school.edu", password: "123", display_name: "Name" })).rejects.toThrow(
      "Password must be at least 6 characters",
    );
    await expect(signUpWithEmail({ email: "a@school.edu", password: "Password123", display_name: "" })).rejects.toThrow(
      "Display name is required",
    );
    await expect(signUpWithEmail({ email: "a@gmail.com", password: "Password123", display_name: "Name" })).rejects.toThrow(
      "Only .edu email addresses are allowed to sign up.",
    );
  });

  it("signUpWithEmail throws for invalid account_type", async () => {
    await expect(
      signUpWithEmail({
        email: "test@school.edu",
        password: "Password123",
        display_name: "Test User",
        account_type: "admin" as unknown as "student",
      }),
    ).rejects.toThrow("Account type must be either 'student' or 'business'");
  });

  it("signUpWithEmail throws when auth returns error or no user", async () => {
    authMock.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: "boom" },
    });

    await expect(
      signUpWithEmail({ email: "test@school.edu", password: "Password123", display_name: "Name" }),
    ).rejects.toThrow("Failed to sign up: boom");

    authMock.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: null,
    });

    await expect(
      signUpWithEmail({ email: "test@school.edu", password: "Password123", display_name: "Name" }),
    ).rejects.toThrow("Sign up did not return a user");
  });

  it("signInWithEmail throws for auth error and missing user", async () => {
    authMock.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: "bad creds" },
    });
    await expect(signInWithEmail({ email: "u@school.edu", password: "pass123" })).rejects.toThrow(
      "Failed to sign in: bad creds",
    );

    authMock.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: null,
    });
    await expect(signInWithEmail({ email: "u@school.edu", password: "pass123" })).rejects.toThrow(
      "Sign in did not return a user",
    );
  });

  it("validates signInWithEmail required fields", async () => {
    await expect(signInWithEmail({ email: "", password: "pass123" })).rejects.toThrow("Email is required");
    await expect(signInWithEmail({ email: "u@school.edu", password: "" })).rejects.toThrow("Password is required");
  });

  it("getSessionFromTokens handles setSession failures", async () => {
    authMock.setSession.mockResolvedValueOnce({ data: { user: null, session: null }, error: { message: "expired" } });
    await expect(getSessionFromTokens("a", "r")).rejects.toThrow("Failed to restore session: expired");

    authMock.setSession.mockResolvedValueOnce({ data: { user: null, session: null }, error: null });
    await expect(getSessionFromTokens("a", "r")).rejects.toThrow("Session restore did not return a user");
  });

  it("validates getSessionFromTokens required fields", async () => {
    await expect(getSessionFromTokens("", "r")).rejects.toThrow("Access token is required");
    await expect(getSessionFromTokens("a", "")).rejects.toThrow("Refresh token is required");
  });

  it("signOutWithTokens continues when setSession fails but signOut succeeds", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    authMock.setSession.mockResolvedValueOnce({ data: { user: null, session: null }, error: { message: "expired" } });

    await expect(signOutWithTokens("a", "r")).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("signOutWithTokens throws when signOut fails", async () => {
    authMock.signOut.mockResolvedValueOnce({ error: { message: "cannot signout" } });
    await expect(signOutWithTokens("a", "r")).rejects.toThrow("Failed to sign out: cannot signout");
  });

  it("validates signOutWithTokens required fields", async () => {
    await expect(signOutWithTokens("", "r")).rejects.toThrow("Access token is required");
    await expect(signOutWithTokens("a", "")).rejects.toThrow("Refresh token is required");
  });

  it("refreshSession throws on error or missing user", async () => {
    authMock.refreshSession.mockResolvedValueOnce({ data: { user: null, session: null }, error: { message: "bad token" } });
    await expect(refreshSession("r")).rejects.toThrow("Failed to refresh session: bad token");

    authMock.refreshSession.mockResolvedValueOnce({ data: { user: null, session: null }, error: null });
    await expect(refreshSession("r")).rejects.toThrow("Session refresh did not return a user");
  });

  it("validates refreshSession required fields", async () => {
    await expect(refreshSession("")) .rejects.toThrow("Refresh token is required");
  });

  it("updatePassword throws for setSession and updateUser failures", async () => {
    authMock.setSession.mockResolvedValueOnce({ data: { user: null, session: null }, error: { message: "bad" } });
    await expect(updatePassword("a", "r", "newpassword")).rejects.toThrow("Failed to set session: bad");

    authMock.updateUser.mockResolvedValueOnce({ error: { message: "weak" } });
    await expect(updatePassword("a", "r", "newpassword")).rejects.toThrow("Failed to update password: weak");
  });

  it("validates updatePassword required fields and minimum length", async () => {
    await expect(updatePassword("", "r", "newpassword")).rejects.toThrow("Access token is required");
    await expect(updatePassword("a", "", "newpassword")).rejects.toThrow("Refresh token is required");
    await expect(updatePassword("a", "r", "")).rejects.toThrow("New password is required");
    await expect(updatePassword("a", "r", "123")).rejects.toThrow("Password must be at least 6 characters");
  });

  it("completePasswordReset throws for exchange/update failures", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    authMock.exchangeCodeForSession.mockResolvedValueOnce({ error: { message: "invalid code" } });
    await expect(completePasswordReset("code", "Password123")).rejects.toThrow("Reset failed: invalid code");
    expect(errorSpy).toHaveBeenCalled();

    authMock.updateUser.mockResolvedValueOnce({ error: { message: "reject" } });
    await expect(completePasswordReset("code", "Password123")).rejects.toThrow("Failed to update password: reject");
  });

  it("validates completePasswordReset required fields and minimum length", async () => {
    await expect(completePasswordReset("", "Password123")).rejects.toThrow("Reset token is required");
    await expect(completePasswordReset("token", "")).rejects.toThrow("Password is required");
    await expect(completePasswordReset("token", "123")).rejects.toThrow("Password must be at least 6 characters");
  });

  it("ensureFreshSession throws when refresh has error or no session", async () => {
    authMock.refreshSession.mockResolvedValueOnce({ data: { session: null }, error: { message: "expired" } });
    await expect(ensureFreshSession()).rejects.toThrow("Session expired — please log in again.");

    authMock.refreshSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    await expect(ensureFreshSession()).rejects.toThrow("Session expired — please log in again.");
  });

  it("sendPasswordResetEmail supports redirect and surfaces provider errors", async () => {
    await expect(sendPasswordResetEmail("user@gmail.com")).rejects.toThrow("Only .edu email addresses are allowed.");

    authMock.resetPasswordForEmail.mockResolvedValueOnce({ error: { message: "mailer down" } });
    await expect(sendPasswordResetEmail("user@school.edu", "https://example.com/reset")).rejects.toThrow(
      "Failed to send password reset email: mailer down",
    );

    await expect(sendPasswordResetEmail("user@school.edu", "https://example.com/reset")).resolves.toBeUndefined();
    expect(authMock.resetPasswordForEmail).toHaveBeenCalledWith("user@school.edu", {
      redirectTo: "https://example.com/reset",
    });
  });

  it("validates sendPasswordResetEmail required fields", async () => {
    await expect(sendPasswordResetEmail("")).rejects.toThrow("Email is required");
  });
});

describe("deactivateAccount unit", () => {
  it("throws when userId is empty", async () => {
    await expect(deactivateAccount("", "tok", "ref")).rejects.toThrow("User ID is required");
  });

  it("throws when accessToken is empty", async () => {
    await expect(deactivateAccount("uid", "", "ref")).rejects.toThrow("Access token is required");
  });

  it("throws when refreshToken is empty", async () => {
    await expect(deactivateAccount("uid", "tok", "")).rejects.toThrow("Refresh token is required");
  });

  it("throws when profile update fails", async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
      is: vi.fn().mockReturnThis(),
    };
    fromMock.mockImplementationOnce(() => chain);

    await expect(deactivateAccount("uid", "tok", "ref")).rejects.toThrow(
      "Failed to deactivate account: DB error",
    );
  });

  it("throws when listings soft-delete fails", async () => {
    const profileChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const listingsChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ error: { message: "listings error" } }),
    };
    fromMock
      .mockImplementationOnce(() => profileChain)
      .mockImplementationOnce(() => listingsChain);

    await expect(deactivateAccount("uid", "tok", "ref")).rejects.toThrow(
      "Failed to soft-delete listings: listings error",
    );
  });

  it("resolves { success: true } on happy path", async () => {
    const profileChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const listingsChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ error: null }),
    };
    fromMock
      .mockImplementationOnce(() => profileChain)
      .mockImplementationOnce(() => listingsChain);

    const result = await deactivateAccount("uid", "tok", "ref");
    expect(result).toEqual({ success: true });
  });
});

describe("signInWithEmail deactivation guard unit", () => {
  it("throws account_deactivated when profile has deactivated_at set", async () => {
    fromMock.mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { deactivated_at: "2026-04-19T00:00:00Z" },
        error: null,
      }),
    }));

    await expect(
      signInWithEmail({ email: "u@school.edu", password: "pass123" }),
    ).rejects.toThrow("account_deactivated:");
  });

  it("signs out when deactivated_at is set", async () => {
    fromMock.mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { deactivated_at: "2026-04-19T00:00:00Z" },
        error: null,
      }),
    }));

    try { await signInWithEmail({ email: "u@school.edu", password: "pass123" }); } catch {}
    expect(authMock.signOut).toHaveBeenCalled();
  });

  it("returns AuthResult when profile is active (deactivated_at is null)", async () => {
    // Default fromMock in beforeEach already returns { deactivated_at: null }
    const result = await signInWithEmail({ email: "u@school.edu", password: "pass123" });
    expect(result.user.id).toBe("u1");
  });
});
