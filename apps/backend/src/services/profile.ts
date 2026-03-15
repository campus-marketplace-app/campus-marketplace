// Profile service module.
// Handles profile reads/updates against public.profiles for authenticated users.

export interface UserProfile {
  // Keep this shape aligned with the profile fields exposed to frontend pages.
  id: string;
  username: string;
  email: string;
  // Add more fields based on schema
}

// Loads one user's profile.
// Planned query flow: select from public.profiles where user_id = _userId.
export async function getProfile(_userId: string): Promise<UserProfile> {
  void _userId;
  throw new Error("Not yet implemented");
}

// Applies partial profile updates.
// Planned query flow: update public.profiles set ... where user_id = _userId.
export async function updateProfile(
  _userId: string,
  _updates: Partial<UserProfile>,
): Promise<UserProfile> {
  void _userId;
  void _updates;
  throw new Error("Not yet implemented");
}
