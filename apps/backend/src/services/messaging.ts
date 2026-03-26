// Messaging service module.
// Coordinates reads/writes across public.conversations,public.conversation_participants, and public.messages.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Conversation {
  id: string;
  listing_id: string | null;
  created_at: string;
  updated_at: string;
  // The other participant's user ID (not the requesting user).
  other_user_id: string;
  // Display name of the other participant (for showing in the conversation list).
  other_user_display_name?: string;
  // Preview of the most recent message (for the conversation list).
  last_message?: string;
  // Number of unread messages in this conversation (for the badge).
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

// Start or resume a conversation with another user.
// Returns the existing conversation if one already exists for the same listing.
export async function createConversation(_userId: string,_participantId: string,_listingId?: string): Promise<Conversation> {
  void _userId;
  void _participantId;
  void _listingId;
  throw new Error("Not yet implemented");
}

// Get all conversations for a user, sorted newest-first.
// Includes the other user's display name, last message preview, and unread count.
export async function getConversationsByUser(
  _userId: string,
): Promise<Conversation[]> {
  void _userId;
  throw new Error("Not yet implemented");
}

// Get a single conversation by ID.
// Needs userId to figure out which participant is "the other user".
export async function getConversation(
  _conversationId: string,
  _userId: string,
): Promise<Conversation> {
  void _conversationId;
  void _userId;
  throw new Error("Not yet implemented");
}

// Get all messages in a conversation, sorted oldest-first.
export async function getMessages(
  _conversationId: string,
): Promise<Message[]> {
  void _conversationId;
  throw new Error("Not yet implemented");
}

// Send a new message to an existing conversation.
// Also bumps the conversation's updated_at so the list re-sorts.
export async function sendMessage(
  _conversationId: string,
  _senderId: string,
  _content: string,
): Promise<Message> {
  void _conversationId;
  void _senderId;
  void _content;
  throw new Error("Not yet implemented");
}

// Mark all unread messages in a conversation as read for a given user.
// Only marks messages from _other_ senders — your own messages are already "read".
export async function markMessagesRead(
  _conversationId: string,
  _userId: string,
): Promise<void> {
  void _conversationId;
  void _userId;
  throw new Error("Not yet implemented");
}

// Subscribe to new messages in a conversation via Supabase Realtime.
// Calls onMessage every time a new message is inserted for this conversation.
// Returns an object with an unsubscribe function — call it on cleanup/unmount.
export function subscribeToMessages(
  _conversationId: string,
  _onMessage: (msg: Message) => void,
): { unsubscribe: () => void } {
  void _conversationId;
  void _onMessage;
  throw new Error("Not yet implemented");
}
