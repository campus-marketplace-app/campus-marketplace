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
  created_at: string;
  updated_at: string;
  deactivated_at: string | null;
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

const profileSelect = "user_id,display_name,first_name,last_name,bio,avatar_path,account_type,created_at,updated_at,deactivated_at";

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

const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

// UPLOAD AVATAR: Uploads a file to Supabase Storage under avatars/<userId>/avatar.<ext>,
// then persists the storage path to the profile row. Returns the updated profile.
export async function uploadAvatar(
  userId: string,
  file: File | Blob | ArrayBuffer,
  contentType: string,
  accessToken?: string,
  refreshToken?: string,
): Promise<UserProfile> {
  if (!userId.trim()) {
    throw new Error("Profile user_id is required");
  }

  const hasAccessToken = !!accessToken?.trim();
  const hasRefreshToken = !!refreshToken?.trim();
  if (hasAccessToken !== hasRefreshToken) {
    throw new Error("Both access and refresh tokens are required to set a session before avatar upload.");
  }

  if (hasAccessToken && hasRefreshToken) {
    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: accessToken!,
      refresh_token: refreshToken!,
    });

    if (setSessionError) {
      throw new Error(`Failed to set session before avatar upload: ${setSessionError.message}`);
    }
  }

  if (!ALLOWED_AVATAR_TYPES.includes(contentType as (typeof ALLOWED_AVATAR_TYPES)[number])) {
    throw new Error("Unsupported avatar content type. Use JPEG, PNG, or WebP.");
  }

  // In browser flows, ensure the write target matches the authenticated user so
  // storage RLS checks (auth.uid()) and object path ownership remain aligned.
  const isBrowser = typeof globalThis !== "undefined" && "window" in globalThis;
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError && (isBrowser || authError.message !== "Auth session missing!")) {
    throw new Error(`Failed to validate session before avatar upload: ${authError.message}`);
  }

  const authUserId = authData.user?.id ?? null;
  if (isBrowser && !authUserId) {
    throw new Error("Session expired — please log in again.");
  }

  if (authUserId && authUserId !== userId) {
    throw new Error("Session user does not match profile user. Please sign out and sign in again.");
  }

  const effectiveUserId = authUserId ?? userId;

  const ext = contentType.split("/")[1]; // jpeg | png | webp
  const fileToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const candidateStoragePaths = [
    `${effectiveUserId}/avatar.${ext}`,
    `users/${effectiveUserId}/avatar.${ext}`,
    `${effectiveUserId}/${effectiveUserId}/avatar.${ext}`,
    `${effectiveUserId}/avatar-${fileToken}.${ext}`,
    `users/${effectiveUserId}/avatar-${fileToken}.${ext}`,
    `${effectiveUserId}/${effectiveUserId}/avatar-${fileToken}.${ext}`,
  ];

  let lastUploadErrorMessage = "";
  for (const storagePath of candidateStoragePaths) {
    // Use insert-only uploads instead of upsert to avoid requiring extra RLS
    // permissions that some environments enforce during conflict checks.
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(storagePath, file, { contentType, upsert: false });

    if (uploadError) {
      lastUploadErrorMessage = uploadError.message;
      const lowerMessage = uploadError.message.toLowerCase();

      // Some environments have avatar policies that validate a different folder
      // segment index. Some may also already have an object at the canonical
      // path. Retry with compatibility path shapes/unique names for the same user.
      if (
        lowerMessage.includes("row-level security") ||
        lowerMessage.includes("already exists") ||
        lowerMessage.includes("duplicate")
      ) {
        continue;
      }
      throw new Error(`Failed to upload avatar: ${uploadError.message}`);
    }

    // If the profile update fails, clean up the just-uploaded object so we don't
    // leave orphans in the avatars bucket. Surface a cleanup failure too — a
    // silent storage leak is exactly what we want to avoid.
    try {
      return await updateProfile(effectiveUserId, { avatar_path: storagePath });
    } catch (updateErr) {
      const { error: removeErr } = await supabase.storage.from("avatars").remove([storagePath]);
      if (removeErr) {
        console.error(
          `[uploadAvatar] orphaned object at avatars/${storagePath} after profile update failed: ${removeErr.message}`,
        );
      }
      throw updateErr;
    }
  }

  throw new Error(
    `Failed to upload avatar: ${lastUploadErrorMessage || "upload blocked by storage policy"}`,
  );
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
