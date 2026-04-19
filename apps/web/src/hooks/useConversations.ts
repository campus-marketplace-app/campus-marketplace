import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getConversationsByUser, getMessages } from '@campus-marketplace/backend'

/** 30-second stale time for conversations — realtime handles most updates, this is a safety net. */
const CONVERSATIONS_STALE_TIME = 30 * 1000

/** Messages are always considered stale — realtime subscription keeps them live. */
const MESSAGES_STALE_TIME = 0

// --- Query key factories ---
export const conversationKeys = {
  all: ['conversations'] as const,
  byUser: (userId: string) => ['conversations', 'byUser', userId] as const,
  messages: (conversationId: string) => ['conversations', 'messages', conversationId] as const,
}

// ---------------------------------------------------------------------------
// useConversations
// Fetches all conversations for a user with enriched data (last message,
// unread count, other user info). The 30-second staleTime acts as a safety
// net; realtime subscriptions in messages.tsx handle instant updates.
// ---------------------------------------------------------------------------
export function useConversations(userId: string | undefined) {
  return useQuery({
    queryKey: conversationKeys.byUser(userId ?? ''),
    queryFn: () => getConversationsByUser(userId!),
    staleTime: CONVERSATIONS_STALE_TIME,
    enabled: !!userId,
  })
}

// ---------------------------------------------------------------------------
// useMessages
// Fetches messages for a specific conversation.
// staleTime=0 means the cache is immediately considered stale — combined with
// the realtime subscription in messages.tsx, this ensures messages are always
// current when an active conversation is opened.
// ---------------------------------------------------------------------------
export function useMessages(conversationId: string | null | undefined) {
  return useQuery({
    queryKey: conversationKeys.messages(conversationId ?? ''),
    queryFn: () => getMessages(conversationId!),
    staleTime: MESSAGES_STALE_TIME,
    enabled: !!conversationId,
  })
}

// ---------------------------------------------------------------------------
// useInvalidateConversations
// Returns a helper to invalidate the conversation list cache.
// Called from the realtime subscription in messages.tsx when a conversation
// changes, replacing the 15-second polling interval.
// ---------------------------------------------------------------------------
export function useInvalidateConversations() {
  const queryClient = useQueryClient()
  return {
    invalidate: (userId: string) =>
      queryClient.invalidateQueries({ queryKey: conversationKeys.byUser(userId) }),
  }
}
