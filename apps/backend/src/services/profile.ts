import { supabase } from "../supabase-client.js";

export type AccountType = "student" | "business";

function isAccountType(value: string): value is AccountType {
  return value === "student" || value === "business";
}

// Expected object shape for profile rows in the database
export interface UserProfile {
  user_id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  avatar_path: string | null;
  account_type: AccountType;
  school_code: number | null;
  created_at: string;
  updated_at: string;
}

// Input shape for creating/upserting profiles.
export interface UpsertProfileInput {
  user_id: string;
  display_name: string;
  first_name?: string | null;
  last_name?: string | null;
  bio?: string | null;
  avatar_path?: string | null;
  account_type?: AccountType | null;
}

export interface UpdateProfileInput {
  display_name?: string;
  first_name?: string | null;
  last_name?: string | null;
  bio?: string | null;
  avatar_path?: string | null;
}

const profileSelect = "user_id,display_name,first_name,last_name,bio,avatar_path,account_type,school_code,created_at,updated_at";

// GET: Loads one user's profile by auth user ID. Returns a user profile, otherwise throws an error.
export async function getProfile(userId: string): Promise<UserProfile> {
  if (!userId.trim()) {
    throw new Error("Profile user_id is required");
  }

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

  if (input.account_type !== undefined && input.account_type !== null && !isAccountType(input.account_type)) {
    throw new Error("Profile account_type must be either 'student' or 'business'");
  }

  // Supabase upsert requires all fields to be present, so we set missing optional fields to null
  const payload = {
    user_id: input.user_id,
    display_name: input.display_name,
    first_name: input.first_name ?? null,
    last_name: input.last_name ?? null,
    bio: input.bio ?? null,
    avatar_path: input.avatar_path ?? null,
    account_type: input.account_type ?? "student",
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

// UPLOAD AVATAR: Uploads a file to Supabase Storage under avatars/<userId>/avatar.<ext>,
// then persists the storage path to the profile row. Returns the updated profile.
export async function uploadAvatar(userId: string,file: File | Blob | ArrayBuffer,contentType: string): Promise<UserProfile> {
  if (!userId.trim()) {
    throw new Error("Profile user_id is required");
  }

  const ext = contentType.split("/")[1] ?? "jpg"; // Default to jpg if content type is missing
  const storagePath = `${userId}/avatar.${ext}`; //creates storage path like "12345/avatar.jpg"

  // Supabase Storage upsert: if the file already exists, it will be overwritten with the new one
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(storagePath, file, { contentType, upsert: true });

  // If upload fails throw an error
  if (uploadError) {
    throw new Error(`Failed to upload avatar: ${uploadError.message}`);
  }

  //auto-updates the profile's avatar_path with the new storage path, then returns the updated profile data
  return updateProfile(userId, { avatar_path: storagePath });
}

// GET AVATAR URL: Returns the public URL for a stored avatar path.
export function getAvatarUrl(avatarPath: string): string {
  const { data } = supabase.storage.from("avatars").getPublicUrl(avatarPath);
  return data.publicUrl;
}

// UPDATE: Applies partial profile updates (account_type is intentionally immutable here).
export async function updateProfile(userId: string, updates: UpdateProfileInput): Promise<UserProfile> {
  if (!userId.trim()) {
    throw new Error("Profile user_id is required");
  }

  if (updates.display_name !== undefined && !updates.display_name.trim()) {
    throw new Error("Profile display_name cannot be empty");
  }

  const payload = Object.fromEntries(
    Object.entries({
      display_name: updates.display_name,
      first_name: updates.first_name,
      last_name: updates.last_name,
      bio: updates.bio,
      avatar_path: updates.avatar_path,
    }).filter(([, v]) => v !== undefined)
  );

  if (Object.keys(payload).length === 0) {
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
