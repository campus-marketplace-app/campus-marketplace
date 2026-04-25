import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProfile, updateProfile, uploadAvatar } from '@campus-marketplace/backend'
import type { UpdateProfileInput } from '@campus-marketplace/backend'

/** 10-minute stale time — profiles rarely change mid-session. */
const PROFILE_STALE_TIME = 10 * 60 * 1000

// --- Query key factory ---
export const profileKeys = {
  all: ['profiles'] as const,
  detail: (userId: string) => ['profiles', userId] as const,
}

// ---------------------------------------------------------------------------
// useProfile
// Fetches a user's profile. Works for both the logged-in user and other users
// (e.g. seller profile on a listing page). The same cache entry is shared
// anywhere the same userId is requested, so the sidebar and profile page
// both read from a single fetch.
// ---------------------------------------------------------------------------
export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: profileKeys.detail(userId ?? ''),
    queryFn: () => getProfile(userId!),
    staleTime: PROFILE_STALE_TIME,
    enabled: !!userId,
  })
}

// ---------------------------------------------------------------------------
// useUpdateProfile
// Mutation to update a user's profile fields (display name, bio, etc.).
// Invalidates the profile cache on success so all consumers re-fetch.
// ---------------------------------------------------------------------------
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      userId,
      updates,
    }: {
      userId: string
      updates: UpdateProfileInput
    }) => updateProfile(userId, updates),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(userId) })
    },
  })
}

// ---------------------------------------------------------------------------
// useUploadAvatar
// Mutation to upload a new avatar image.
// Invalidates the profile cache on success.
// ---------------------------------------------------------------------------
export function useUploadAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      userId,
      file,
      contentType,
      accessToken,
      refreshToken,
    }: {
      userId: string
      file: File | Blob | ArrayBuffer
      contentType: string
      accessToken?: string
      refreshToken?: string
    }) => uploadAvatar(userId, file, contentType, accessToken, refreshToken),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(userId) })
    },
  })
}
