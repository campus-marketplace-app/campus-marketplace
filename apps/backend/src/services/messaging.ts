// Messaging service module.
// These functions should coordinate reads/writes across
// public.conversations, public.conversation_participants, and public.messages.

export interface Message {
  // Mirrors core fields from public.messages used by the frontend UI.
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

// Loads messages for one conversation.
// Planned query flow: select from public.messages where conversation_id = _conversationId.
export async function getConversation(
  _conversationId: string,
): Promise<Message[]> {
  void _conversationId;
  throw new Error("Not yet implemented");
}

// Sends a new message to an existing conversation.
// Planned query flow: insert into public.messages with conversation/sender/content.
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
