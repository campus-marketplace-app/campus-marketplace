// Blocks service module.
// Manages rows in public.blocks — prevents blocked users from messaging
// or seeing each other's listings.

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

// Block a user. If already blocked, returns the existing row.
export async function blockUser(
  _userId: string,
  _blockedUserId: string,
): Promise<Block> {
  void _userId;
  void _blockedUserId;
  throw new Error("Not yet implemented");
}

// Remove a block between two users.
export async function unblockUser(
  _userId: string,
  _blockedUserId: string,
): Promise<void> {
  void _userId;
  void _blockedUserId;
  throw new Error("Not yet implemented");
}

// Get all users that the given user has blocked, sorted newest-first.
export async function getBlockedUsers(_userId: string): Promise<Block[]> {
  void _userId;
  throw new Error("Not yet implemented");
}

// Check whether one user has blocked another.
export async function isBlocked(
  _userId: string,
  _targetUserId: string,
): Promise<boolean> {
  void _userId;
  void _targetUserId;
  throw new Error("Not yet implemented");
}
