// Messaging service module.
// Coordinates reads/writes across public.conversations, public.conversation_participants, and public.messages.

import { supabase } from "../supabase-client.js";

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
// Internal helpers
// ---------------------------------------------------------------------------

// Find the other participant's user_id in a conversation.
async function getOtherParticipantId(conversationId: string, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .is("left_at", null)
    .neq("user_id", userId)
    .limit(1);

  return data?.[0]?.user_id ?? null;
}

// Look up a user's display_name from profiles.
async function getDisplayName(userId: string): Promise<string | undefined> {
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", userId)
    .single();

  return data?.display_name ?? undefined;
}

// Check if userId is an active participant in the conversation.
async function isParticipant(conversationId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("conversation_participants")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .is("left_at", null)
    .limit(1);

  return (data ?? []).length > 0;
}

// Find an existing conversation between two users for the same listing (or no listing).
async function findExistingConversation(
  userId: string,
  participantId: string,
  listingId?: string,
): Promise<string | null> {
  // Get all conversation IDs where userId is a participant.
  const { data: myConvos } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId)
    .is("left_at", null);

  if (!myConvos || myConvos.length === 0) return null;

  const myConvoIds = myConvos.map((r: { conversation_id: string }) => r.conversation_id);

  // Of those, find ones where the other user is also a participant.
  const { data: sharedConvos } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", participantId)
    .is("left_at", null)
    .in("conversation_id", myConvoIds);

  if (!sharedConvos || sharedConvos.length === 0) return null;

  const sharedIds = sharedConvos.map((r: { conversation_id: string }) => r.conversation_id);

  // Now filter by listing_id match.
  let query = supabase
    .from("conversations")
    .select("id")
    .in("id", sharedIds)
    .is("deleted_at", null);

  if (listingId) {
    query = query.eq("listing_id", listingId);
  } else {
    query = query.is("listing_id", null);
  }

  const { data: match } = await query.limit(1);
  return match?.[0]?.id ?? null;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

// Start or resume a conversation with another user.
// Returns the existing conversation if one already exists for the same listing.
export async function createConversation(userId: string, participantId: string, listingId?: string): Promise<Conversation> {
  if (!userId.trim()) throw new Error("User ID is required");
  if (!participantId.trim()) throw new Error("Participant ID is required");
  if (userId === participantId) throw new Error("You cannot start a conversation with yourself");

  // Check if the other user has blocked us (or we blocked them).
  const { data: blocked } = await supabase
    .from("blocks")
    .select("id")
    .or(`and(user_id.eq.${userId},blocked_user_id.eq.${participantId}),and(user_id.eq.${participantId},blocked_user_id.eq.${userId})`)
    .limit(1);

  if (blocked && blocked.length > 0) {
    throw new Error("Cannot start a conversation — one of you has blocked the other");
  }

  // Check for an existing conversation between these two users for this listing.
  const existingId = await findExistingConversation(userId, participantId, listingId);
  if (existingId) {
    return getConversation(existingId, userId);
  }

  // Create new conversation.
  const { data: convo, error: convoError } = await supabase
    .from("conversations")
    .insert({ listing_id: listingId ?? null })
    .select("id,listing_id,created_at,updated_at")
    .single();

  if (convoError || !convo) {
    throw new Error(`Failed to create conversation: ${convoError?.message ?? "no data returned"}`);
  }

  // Add both users as participants.
  const { error: partError } = await supabase
    .from("conversation_participants")
    .insert([
      { conversation_id: convo.id, user_id: userId },
      { conversation_id: convo.id, user_id: participantId },
    ]);

  if (partError) {
    throw new Error(`Failed to add participants: ${partError.message}`);
  }

  const displayName = await getDisplayName(participantId);

  return {
    id: convo.id,
    listing_id: convo.listing_id,
    created_at: convo.created_at,
    updated_at: convo.updated_at,
    other_user_id: participantId,
    other_user_display_name: displayName,
    last_message: undefined,
    unread_count: 0,
  };
}

// Get all conversations for a user, sorted newest-first.
// Includes the other user's display name, last message preview, and unread count.
export async function getConversationsByUser(userId: string): Promise<Conversation[]> {
  if (!userId.trim()) throw new Error("User ID is required");

  // Get all conversation IDs the user participates in.
  const { data: participations, error: partError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId)
    .is("left_at", null);

  if (partError) {
    throw new Error(`Failed to fetch conversations: ${partError.message}`);
  }

  if (!participations || participations.length === 0) return [];

  const convoIds = participations.map((r: { conversation_id: string }) => r.conversation_id);

  // Fetch the actual conversations.
  const { data: convos, error: convoError } = await supabase
    .from("conversations")
    .select("id,listing_id,created_at,updated_at")
    .in("id", convoIds)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (convoError) {
    throw new Error(`Failed to fetch conversations: ${convoError.message}`);
  }

  if (!convos || convos.length === 0) return [];

  // Build the full Conversation objects with extra info.
  const results: Conversation[] = [];

  for (const convo of convos) {
    const otherId = await getOtherParticipantId(convo.id, userId);
    if (!otherId) continue; // skip if no other participant found

    const displayName = await getDisplayName(otherId);

    // Get the latest message for preview.
    const { data: lastMsg } = await supabase
      .from("messages")
      .select("content")
      .eq("conversation_id", convo.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    // Count unread messages (sent by the other person, not yet read).
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", convo.id)
      .neq("sender_id", userId)
      .eq("is_read", false)
      .is("deleted_at", null);

    results.push({
      id: convo.id,
      listing_id: convo.listing_id,
      created_at: convo.created_at,
      updated_at: convo.updated_at,
      other_user_id: otherId,
      other_user_display_name: displayName,
      last_message: lastMsg?.[0]?.content,
      unread_count: count ?? 0,
    });
  }

  return results;
}

// Get a single conversation by ID.
// Needs userId to figure out which participant is "the other user".
export async function getConversation(conversationId: string, userId: string): Promise<Conversation> {
  if (!conversationId.trim()) throw new Error("Conversation ID is required");
  if (!userId.trim()) throw new Error("User ID is required");

  const { data: convo, error } = await supabase
    .from("conversations")
    .select("id,listing_id,created_at,updated_at")
    .eq("id", conversationId)
    .is("deleted_at", null)
    .single();

  if (error || !convo) {
    throw new Error("Conversation not found");
  }

  const otherId = await getOtherParticipantId(conversationId, userId);
  if (!otherId) {
    throw new Error("Could not find the other participant in this conversation");
  }

  const displayName = await getDisplayName(otherId);

  // Get latest message for preview.
  const { data: lastMsg } = await supabase
    .from("messages")
    .select("content")
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  // Count unread.
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .eq("is_read", false)
    .is("deleted_at", null);

  return {
    id: convo.id,
    listing_id: convo.listing_id,
    created_at: convo.created_at,
    updated_at: convo.updated_at,
    other_user_id: otherId,
    other_user_display_name: displayName,
    last_message: lastMsg?.[0]?.content,
    unread_count: count ?? 0,
  };
}

// Get all messages in a conversation, sorted oldest-first.
export async function getMessages(conversationId: string): Promise<Message[]> {
  if (!conversationId.trim()) throw new Error("Conversation ID is required");

  // Verify conversation exists.
  const { data: convo, error: convoError } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .is("deleted_at", null)
    .single();

  if (convoError || !convo) {
    throw new Error("Conversation not found");
  }

  const { data, error } = await supabase
    .from("messages")
    .select("id,conversation_id,sender_id,content,is_read,read_at,created_at")
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  return (data as Message[]) ?? [];
}

// Send a new message to an existing conversation.
// Also bumps the conversation's updated_at so the list re-sorts.
export async function sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
  if (!conversationId.trim()) throw new Error("Conversation ID is required");
  if (!senderId.trim()) throw new Error("Sender ID is required");

  const trimmedContent = content.trim();
  if (!trimmedContent) throw new Error("Message content cannot be empty");

  // Verify sender is a participant.
  const senderIsParticipant = await isParticipant(conversationId, senderId);
  if (!senderIsParticipant) {
    throw new Error("You are not a participant in this conversation");
  }

  // Insert the message.
  const { data: msg, error: msgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: trimmedContent,
    })
    .select("id,conversation_id,sender_id,content,is_read,read_at,created_at")
    .single<Message>();

  if (msgError || !msg) {
    throw new Error(`Failed to send message: ${msgError?.message ?? "no data returned"}`);
  }

  // Bump conversation's updated_at so it sorts to the top.
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return msg;
}

// Mark all unread messages in a conversation as read for a given user.
// Only marks messages from _other_ senders — your own messages are already "read".
export async function markMessagesRead(conversationId: string, userId: string): Promise<void> {
  if (!conversationId.trim()) throw new Error("Conversation ID is required");
  if (!userId.trim()) throw new Error("User ID is required");

  const { error } = await supabase
    .from("messages")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .eq("is_read", false);

  if (error) {
    throw new Error(`Failed to mark messages read: ${error.message}`);
  }
}

// Subscribe to new messages in a conversation via Supabase Realtime.
// Calls onMessage every time a new message is inserted for this conversation.
// Returns an object with an unsubscribe function — call it on cleanup/unmount.
export function subscribeToMessages(
  conversationId: string,
  onMessage: (msg: Message) => void,
): { unsubscribe: () => void } {
  if (!conversationId.trim()) throw new Error("Conversation ID is required");

  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const row = payload.new as Message;
        onMessage(row);
      },
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
