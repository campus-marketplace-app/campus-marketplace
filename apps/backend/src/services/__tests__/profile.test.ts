import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getProfile, upsertProfile, updateProfile } from "../profile.js";
import { createTestUser } from "./helpers.js";
import type { TestUser } from "./helpers.js";

let testUser: TestUser;

beforeAll(async () => {
  testUser = await createTestUser("Profile Test User");
});

afterAll(async () => {
  await testUser.cleanup();
});

describe("upsertProfile", () => {
  it("creates profile and returns UserProfile shape", async () => {
    const profile = await upsertProfile({
      user_id: testUser.user.id,
      display_name: "Profile Test User",
    });

    expect(profile.user_id).toBe(testUser.user.id);
    expect(profile.display_name).toBe("Profile Test User");
    expect(profile.created_at).toBeDefined();
    expect(profile.updated_at).toBeDefined();
  });

  it("throws with empty user_id", async () => {
    await expect(
      upsertProfile({ user_id: "", display_name: "Test" }),
    ).rejects.toThrow("user_id is required");
  });

  it("throws with empty display_name", async () => {
    await expect(
      upsertProfile({ user_id: testUser.user.id, display_name: "" }),
    ).rejects.toThrow("display_name is required");
  });
});

describe("getProfile", () => {
  it("returns existing profile with all fields", async () => {
    const profile = await getProfile(testUser.user.id);

    expect(profile.user_id).toBe(testUser.user.id);
    expect(profile.display_name).toBeTruthy();
    expect("first_name" in profile).toBe(true);
    expect("bio" in profile).toBe(true);
  });

  it("throws for nonexistent userId", async () => {
    await expect(
      getProfile("00000000-0000-0000-0000-000000000000"),
    ).rejects.toThrow();
  });
});

describe("updateProfile", () => {
  it("updates display_name and returns updated record", async () => {
    const updated = await updateProfile(testUser.user.id, { display_name: "Updated Name" });
    expect(updated.display_name).toBe("Updated Name");
  });

  it("throws with empty display_name", async () => {
    await expect(
      updateProfile(testUser.user.id, { display_name: "" }),
    ).rejects.toThrow("display_name cannot be empty");
  });

  it("throws with no fields provided", async () => {
    await expect(
      updateProfile(testUser.user.id, {}),
    ).rejects.toThrow("No profile updates provided");
  });
});
