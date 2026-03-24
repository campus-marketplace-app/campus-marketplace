// Shared type definitions for the messaging service.

/** A single message in a conversation. Mirrors core fields of public.messages. */
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

/** Lightweight message preview used inside ConversationSummary. */
export interface MessagePreview {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

/** Participant profile subset embedded in ConversationSummary. */
export interface ConversationParticipant {
  user_id: string;
  display_name: string;
  avatar_path: string | null;
  /** Resolved public URL for the avatar image. Null if no avatar is set. */
  avatar_url: string | null;
}

/** Listing stub embedded in ConversationSummary — only fields needed for the inbox UI. */
export interface ConversationListing {
  id: string;
  title: string;
  status: string;
}

/**
 * A conversation with enriched data for inbox display.
 * Returned by getConversations, getConversationById, and createOrGetConversation.
 */
export interface ConversationSummary {
  id: string;
  listing_id: string | null;
  listing: ConversationListing | null;
  /** The other participant (not the requesting user). */
  other_participant: ConversationParticipant;
  last_message: MessagePreview | null;
  /** Number of unread messages sent by the other participant. */
  unread_count: number;
  created_at: string;
  updated_at: string;
}

/** Input for createOrGetConversation. */
export interface CreateConversationInput {
  listing_id: string;
  buyer_id: string;
  seller_id: string;
}

/** Options for paginated message fetching. */
export interface GetMessagesOptions {
  /** Max number of messages to return. Defaults to 50. */
  limit?: number;
  /**
   * Cursor for pagination — ISO timestamp. When provided, only messages
   * created BEFORE this time are returned (for infinite-scroll / load-more).
   */
  before?: string;
}
