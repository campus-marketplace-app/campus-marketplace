import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryOperation = "select" | "upsert" | "update";

type QueryResponse = {
  table: string;
  operation: QueryOperation;
  data?: unknown;
  error?: { message: string } | null;
};

const { state, supabaseMock } = vi.hoisted(() => {
  const mockState = {
    responses: [] as QueryResponse[],
    uploadError: null as { message: string } | null,
    publicUrl: "https://cdn.example/avatar.jpg",
    authUserId: null as string | null,
    authError: null as { message: string } | null,
    setSessionError: null as { message: string } | null,
  };

  function nextResponse(table: string, operation: QueryOperation) {
    const response = mockState.responses.shift();

    if (!response) {
      throw new Error(`Unexpected query for ${table}.${operation}`);
    }

    if (response.table !== table || response.operation !== operation) {
      throw new Error(
        `Unexpected query order. Expected ${response.table}.${response.operation} but got ${table}.${operation}`,
      );
    }

    return {
      data: response.data ?? null,
      error: response.error ?? null,
    };
  }

  function createChain(table: string) {
    let operation: QueryOperation = "select";
    const chain: Record<string, unknown> = {};

    chain.select = () => chain;
    chain.eq = () => chain;

    chain.upsert = () => {
      operation = "upsert";
      return chain;
    };

    chain.update = () => {
      operation = "update";
      return chain;
    };

    chain.single = async () => nextResponse(table, operation);

    return chain;
  }

  return {
    state: mockState,
    supabaseMock: {
      from: (table: string) => createChain(table),
      auth: {
        setSession: async () => ({ error: mockState.setSessionError }),
        getUser: async () => ({ data: { user: mockState.authUserId ? { id: mockState.authUserId } : null }, error: mockState.authError }),
      },
      storage: {
        from: () => ({
          upload: async () => ({ error: mockState.uploadError }),
          getPublicUrl: () => ({ data: { publicUrl: mockState.publicUrl } }),
        }),
      },
    },
  };
});

function enqueueResponse(response: QueryResponse) {
  state.responses.push(response);
}

vi.mock("../../supabase-client.js", () => ({
  supabase: supabaseMock,
}));

import {
  getAvatarUrl,
  getProfile,
  updateProfile,
  uploadAvatar,
  upsertProfile,
} from "../profile.js";

describe("profile service unit", () => {
  beforeEach(() => {
    state.responses.length = 0;
    state.uploadError = null;
    state.publicUrl = "https://cdn.example/avatar.jpg";
    state.authUserId = null;
    state.authError = null;
    state.setSessionError = null;
    vi.restoreAllMocks();
  });

  it("getProfile validates input and surfaces query errors", async () => {
    await expect(getProfile("")).rejects.toThrow("Profile user_id is required");

    enqueueResponse({
      table: "profiles",
      operation: "select",
      error: { message: "not found" },
    });
    await expect(getProfile("u1")).rejects.toThrow("Failed to fetch profile: not found");

    enqueueResponse({
      table: "profiles",
      operation: "select",
      data: null,
    });
    await expect(getProfile("u1")).rejects.toThrow("Profile not found for user_id: u1");
  });

  it("upsertProfile validates account_type and handles errors", async () => {
    await expect(
      upsertProfile({
        user_id: "u1",
        display_name: "User",
        account_type: "admin" as unknown as "student",
      }),
    ).rejects.toThrow("Profile account_type must be either 'student' or 'business'");

    enqueueResponse({
      table: "profiles",
      operation: "upsert",
      error: { message: "constraint" },
    });
    await expect(upsertProfile({ user_id: "u1", display_name: "User" })).rejects.toThrow(
      "Failed to upsert profile: constraint",
    );

    enqueueResponse({
      table: "profiles",
      operation: "upsert",
      data: null,
    });
    await expect(upsertProfile({ user_id: "u1", display_name: "User" })).rejects.toThrow(
      "Profile upsert did not return data",
    );
  });

  it("updateProfile validates input and handles query failures", async () => {
    await expect(updateProfile("", { display_name: "Name" })).rejects.toThrow("Profile user_id is required");
    await expect(updateProfile("u1", { display_name: "" })).rejects.toThrow("Profile display_name cannot be empty");
    await expect(updateProfile("u1", {})).rejects.toThrow("No profile updates provided");

    enqueueResponse({
      table: "profiles",
      operation: "update",
      error: { message: "blocked" },
    });
    await expect(updateProfile("u1", { display_name: "Name" })).rejects.toThrow("Failed to update profile: blocked");

    enqueueResponse({
      table: "profiles",
      operation: "update",
      data: null,
    });
    await expect(updateProfile("u1", { display_name: "Name" })).rejects.toThrow("Profile update did not return data");
  });

  it("uploadAvatar surfaces storage errors and returns updated profile", async () => {
    const avatarBytes = new Uint8Array([1]).buffer;

    await expect(uploadAvatar("", avatarBytes, "image/png")).rejects.toThrow("Profile user_id is required");

    state.uploadError = { message: "upload failed" };
    await expect(uploadAvatar("u1", avatarBytes, "image/png")).rejects.toThrow(
      "Failed to upload avatar: upload failed",
    );

    state.uploadError = null;

    enqueueResponse({
      table: "profiles",
      operation: "update",
      data: {
        user_id: "u1",
        display_name: "User",
        first_name: null,
        last_name: null,
        bio: null,
        avatar_path: "u1/avatar.png",
        account_type: "student",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    });

    const profile = await uploadAvatar("u1", avatarBytes, "image/png");
    expect(profile.avatar_path).toBe("u1/avatar.png");
  });

  it("getAvatarUrl returns public URL from storage", () => {
    state.publicUrl = "https://cdn.example/custom.png";
    expect(getAvatarUrl("u1/avatar.png")).toBe("https://cdn.example/custom.png");
  });
});
