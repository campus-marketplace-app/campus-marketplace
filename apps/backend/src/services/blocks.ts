// Blocks service module.
// Manages rows in public.blocks — prevents blocked users from messaging or seeing each other's listings.

import { supabase } from "../supabase-client.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Block {
  id: string;
  user_id: string;
  blocked_user_id: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

const blockSelect = "id,user_id,blocked_user_id,created_at";

// Block a user. If already blocked, returns the existing row.
// The DB has a blocks_no_self_block constraint — you can't block yourself.
export async function blockUser(userId: string,blockedUserId: string): Promise<Block> {

  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  if (!blockedUserId.trim()) {
    throw new Error("Blocked user ID is required");
  }

  if (userId === blockedUserId) {
    throw new Error("You cannot block yourself");
  }

  // Upsert so re-blocking is a no-op that returns the existing row.
  const { data, error } = await supabase
    .from("blocks")
    .upsert(
      { user_id: userId, blocked_user_id: blockedUserId },
      { onConflict: "user_id,blocked_user_id" },
    )
    .select(blockSelect)
    .single<Block>();

  if (error) {
    throw new Error(`Failed to block user: ${error.message}`);
  }

  if (!data) {
    throw new Error("Block did not return data");
  }

  return data; // The newly created or existing block row.
}

// Remove a block between two users. Does nothing if the block doesn't exist (idempotent).
export async function unblockUser(userId: string, blockedUserId: string): Promise<void> {
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  if (!blockedUserId.trim()) {
    throw new Error("Blocked user ID is required");
  }

  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("user_id", userId)
    .eq("blocked_user_id", blockedUserId);

  if (error) {
    throw new Error(`Failed to unblock user: ${error.message}`);
  }
}

// Get all users that the given user has blocked, sorted newest-first.
export async function getBlockedUsers(userId: string): Promise<Block[]> {

  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  const { data, error } = await supabase
    .from("blocks")
    .select(blockSelect)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch blocked users: ${error.message}`);
  }

  return (data as Block[]) ?? [];
}

// Check whether one user has blocked another.
export async function isBlocked(userId: string,targetUserId: string): Promise<boolean> {

  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  if (!targetUserId.trim()) {
    throw new Error("Target user ID is required");
  }

  const { data, error } = await supabase
    .from("blocks")
    .select("id")
    .eq("user_id", userId)
    .eq("blocked_user_id", targetUserId)
    .limit(1);

  if (error) {
    throw new Error(`Failed to check block status: ${error.message}`);
  }

  return (data ?? []).length > 0; // True if a block row exists, false otherwise.
}
