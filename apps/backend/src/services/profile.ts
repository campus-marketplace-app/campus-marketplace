import { supabase } from "../supabase-client";

// expectted object shape for profile rows in the database
export interface UserProfile {
  user_id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  avatar_path: string | null;
  created_at: string;
  updated_at: string;
}

// Input shape for creating/updating profiles. user_id is required for upsert but not update.
export interface UpsertProfileInput {
  user_id: string;
  display_name: string;
  first_name?: string | null;
  last_name?: string | null;
  bio?: string | null;
  avatar_path?: string | null;
}

//Separate input type for updates since user_id is not needed and display_name is optional
// For partial updates we reuse `UpsertProfileInput` fields except `user_id`.
// `updateProfile` accepts a partial object of these fields.

const profileSelect = "user_id,display_name,first_name,last_name,bio,avatar_path,created_at,updated_at";

// GET: Loads one user's profile by auth user ID. Returns a user profile, otherwise throws an error.
export async function getProfile(userId: string): Promise<UserProfile> {
  if (!userId.trim()) {
    throw new Error("Profile user_id is required");
  }

  //Expect a single row for single user
  const { data, error } = await supabase
    .from("profiles")
    .select(profileSelect)
    .eq("user_id", userId)
    .single<UserProfile>();

  if (error) {
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Profile not found for user_id: ${userId}`);
  }

  return data;
}

// UPSERT: Creates or updates a profile row. Returns: the new/updated profile data.
export async function upsertProfile(input: UpsertProfileInput): Promise<UserProfile> {
  if (!input.user_id.trim()) {
    throw new Error("Profile user_id is required");
  }

  if (!input.display_name.trim()) {
    throw new Error("Profile display_name is required");
  }

  // Supabase upsert requires all fields to be present, so we set missing optional fields to null
  const payload = {
    user_id: input.user_id,
    display_name: input.display_name,
    first_name: input.first_name ?? null,
    last_name: input.last_name ?? null,
    bio: input.bio ?? null,
    avatar_path: input.avatar_path ?? null,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select(profileSelect)
    .single<UserProfile>();

  if (error) {
    throw new Error(`Failed to upsert profile: ${error.message}`);
  }

  if (!data) {
    throw new Error("Profile upsert did not return data");
  }

  return data;
}

// UPDATE: Applies partial profile updates.
export async function updateProfile(userId: string,updates: Partial<Omit<UpsertProfileInput, "user_id">>,): Promise<UserProfile> {
  if (!userId.trim()) {
    throw new Error("Profile user_id is required");
  }

  if (updates.display_name !== undefined && !updates.display_name.trim()) {
    throw new Error("Profile display_name cannot be empty");
  }

  const payload = {
    display_name: updates.display_name,
    first_name: updates.first_name,
    last_name: updates.last_name,
    bio: updates.bio,
    avatar_path: updates.avatar_path,
  };

  const hasUpdates = Object.values(payload).some(
    (value) => value !== undefined,
  );

  if (!hasUpdates) {
    throw new Error("No profile updates provided");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("user_id", userId)
    .select(profileSelect)
    .single<UserProfile>();

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  if (!data) {
    throw new Error("Profile update did not return data");
  }

  return data;
}
