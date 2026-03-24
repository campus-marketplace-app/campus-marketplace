// Messaging service module.
// Coordinates reads/writes across public.conversations, public.conversation_participants,
// and public.messages.

import { supabase } from "../supabase-client.js";
export * from "./messaging.types.js";
import type {
  Message,
  ConversationSummary,
  ConversationParticipant,
  CreateConversationInput,
  GetMessagesOptions,
} from "./messaging.types.js";

// ---------------------------------------------------------------------------
// Internal types — raw DB row shapes
// ---------------------------------------------------------------------------

type ConversationRow = {
  id: string;
  listing_id: string | null;
  created_at: string;
  updated_at: string;
  listings: { id: string; title: string; status: string } | null;
  conversation_participants: Array<{ user_id: string }>;
  messages: Array<{ id: string; sender_id: string; content: string; is_read: boolean; created_at: string }>;
};

// ---------------------------------------------------------------------------
// Internal helpers — not exported
// ---------------------------------------------------------------------------

// Centralized column list so every message query returns a consistent shape.
const messageSelect = "id,conversation_id,sender_id,content,is_read,read_at,created_at";

// Select string for full conversation data with all related data in one round-trip.
const conversationSelect = `
  id,listing_id,created_at,updated_at,
  listings(id,title,status),
  conversation_participants(user_id),
  messages(id,sender_id,content,is_read,created_at)
`;

/**
 * Verifies that a user is an active participant in a conversation.
 * Throws if not found or on DB error.
 */
async function verifyParticipant(conversationId: string, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .is("left_at", null)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("You are not a participant in this conversation");
    }
    throw new Error(`Database error while verifying conversation participant: ${error.message}`);
  }
  if (!data) {
    throw new Error("You are not a participant in this conversation");
  }
}

/**
 * Fetches a profile for each user ID in the array, returned as a Map keyed by user_id.
 */
async function fetchProfileMap(userIds: string[]): Promise<Map<string, ConversationParticipant>> {
  if (userIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id,display_name,avatar_path")
    .in("user_id", userIds);

  if (error) {
    throw new Error(`Failed to fetch participant profiles: ${error.message}`);
  }

  const map = new Map<string, ConversationParticipant>();
  for (const row of data ?? []) {
    const avatar_path = row.avatar_path ?? null;
    const avatar_url = avatar_path
      ? supabase.storage.from("avatars").getPublicUrl(avatar_path).data.publicUrl
      : null;
    map.set(row.user_id, {
      user_id: row.user_id,
      display_name: row.display_name,
      avatar_path,
      avatar_url,
    });
  }
  return map;
}

/**
 * Maps a raw conversation DB row and profile map to a ConversationSummary.
 * The "other participant" is resolved by filtering out the requestingUserId.
 */
function mapConversationRow(
  row: ConversationRow,
  requestingUserId: string,
  profileMap: Map<string, ConversationParticipant>,
): ConversationSummary {
  const otherParticipantId =
    row.conversation_participants.find((p) => p.user_id !== requestingUserId)?.user_id ?? "";

  const otherParticipant: ConversationParticipant = profileMap.get(otherParticipantId) ?? {
    user_id: otherParticipantId,
    display_name: "Unknown User",
    avatar_path: null,
    avatar_url: null,
  };

  // Messages are fetched in insertion order — sort descending to find the latest.
  const sortedMessages = [...(row.messages ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const latest = sortedMessages[0] ?? null;

  const unread_count = (row.messages ?? []).filter(
    (m) => m.sender_id !== requestingUserId && !m.is_read,
  ).length;

  return {
    id: row.id,
    listing_id: row.listing_id,
    listing: row.listings ?? null,
    other_participant: otherParticipant,
    unread_count,
    last_message: latest
      ? { id: latest.id, sender_id: latest.sender_id, content: latest.content, created_at: latest.created_at }
      : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Fetches a fully enriched ConversationSummary for a single conversation ID.
 * Used internally by createOrGetConversation after finding or creating a conversation.
 */
export async function getConversationById(
  conversationId: string,
  requestingUserId: string,
): Promise<ConversationSummary> {
  if (!conversationId.trim()) {
    throw new Error("Conversation ID is required");
  }
  if (!requestingUserId.trim()) {
    throw new Error("User ID is required");
  }
  await verifyParticipant(conversationId, requestingUserId);
  const { data, error } = await supabase
    .from("conversations")
    .select(conversationSelect)
    .eq("id", conversationId)
    .is("deleted_at", null)
    .single<ConversationRow>();

  if (error) {
    throw new Error(`Failed to load conversation: ${error.message}`);
  }
  if (!data) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }

  const otherUserId = data.conversation_participants.find(
    (p) => p.user_id !== requestingUserId,
  )?.user_id;

  const profileMap = await fetchProfileMap(otherUserId ? [otherUserId] : []);
  return mapConversationRow(data, requestingUserId, profileMap);
}

// ---------------------------------------------------------------------------
// Exported service functions
// ---------------------------------------------------------------------------

/**
 * Finds an existing conversation for a listing between buyer and seller,
 * or creates one if none exists. Prevents a user from messaging themselves.
 *
 * param input - listing_id, buyer_id, and seller_id.
 * returns The existing or newly created ConversationSummary.
 * throws If input is invalid or the DB operation fails.
 */
export async function createOrGetConversation(
  input: CreateConversationInput,
): Promise<ConversationSummary> {
  if (!input.listing_id?.trim()) {
    throw new Error("Listing ID is required");
  }
  if (!input.buyer_id?.trim()) {
    throw new Error("Buyer ID is required");
  }
  if (!input.seller_id?.trim()) {
    throw new Error("Seller ID is required");
  }
  if (input.buyer_id === input.seller_id) {
    throw new Error("A user cannot start a conversation with themselves");
  }

  // Step 1: Find all conversation_ids the buyer participates in.
  const { data: buyerParticipations, error: buyerError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", input.buyer_id)
    .is("left_at", null);

  if (buyerError) {
    throw new Error(`Failed to check existing conversations: ${buyerError.message}`);
  }

  const buyerConvIds = (buyerParticipations ?? []).map((r) => r.conversation_id);
  let conversationId: string | null = null;

  // Step 2: Find a conversation shared with the seller for this specific listing.
  if (buyerConvIds.length > 0) {
    const { data: matches, error: matchError } = await supabase
      .from("conversation_participants")
      .select("conversation_id, conversations!inner(id, listing_id, deleted_at)")
      .eq("user_id", input.seller_id)
      .is("left_at", null)
      .in("conversation_id", buyerConvIds)
      .eq("conversations.listing_id", input.listing_id)
      .is("conversations.deleted_at", null)
      .limit(1);

    if (matchError) {
      throw new Error(`Failed to check existing conversations: ${matchError.message}`);
    }

    conversationId = matches?.[0]?.conversation_id ?? null;
  }

  // Step 3: Create a new conversation if no existing one was found.
  if (!conversationId) {
    const { data: newConv, error: createError } = await supabase
      .from("conversations")
      .insert({ listing_id: input.listing_id })
      .select("id")
      .single();

    if (createError) {
      throw new Error(`Failed to create conversation: ${createError.message}`);
    }
    if (!newConv) {
      throw new Error("Conversation creation did not return data");
    }

    conversationId = newConv.id;

    const { error: participantsError } = await supabase
      .from("conversation_participants")
      .upsert(
        [
          { conversation_id: conversationId, user_id: input.buyer_id },
          { conversation_id: conversationId, user_id: input.seller_id },
        ],
        { onConflict: "conversation_id,user_id" },
      );

    if (participantsError) {
      throw new Error(`Failed to add conversation participants: ${participantsError.message}`);
    }
  }

  if (!conversationId) {
    throw new Error("Failed to find or create conversation");
  }

  return getConversationById(conversationId, input.buyer_id);
}

/**
 * Returns all active conversations for a user, sorted by most recent activity.
 *
 * param userId - UUID of the authenticated user.
 * returns Array of ConversationSummary records (may be empty).
 * throws If userId is empty or the DB query fails.
 */
export async function getConversations(userId: string): Promise<ConversationSummary[]> {
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  // Step 1: Get all conversation_ids the user participates in.
  const { data: participations, error: partError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId)
    .is("left_at", null);

  if (partError) {
    throw new Error(`Failed to fetch conversations: ${partError.message}`);
  }

  const convIds = (participations ?? []).map((r) => r.conversation_id);
  if (convIds.length === 0) return [];

  // Step 2: Fetch full conversation data for those IDs in one query.
  const { data: convRows, error: convError } = await supabase
    .from("conversations")
    .select(conversationSelect)
    .in("id", convIds)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .returns<ConversationRow[]>();

  if (convError) {
    throw new Error(`Failed to fetch conversations: ${convError.message}`);
  }

  const rows = convRows ?? [];
  if (rows.length === 0) return [];

  // Step 3: Fetch profiles for all "other" participants in one query (avoids N+1).
  const otherUserIds = [
    ...new Set(
      rows.flatMap((row) =>
        row.conversation_participants
          .filter((p) => p.user_id !== userId)
          .map((p) => p.user_id),
      ),
    ),
  ];

  const profileMap = await fetchProfileMap(otherUserIds);
  return rows.map((row) => mapConversationRow(row, userId, profileMap));
}

/**
 * Returns messages in a conversation, oldest-first, with optional cursor-based pagination.
 * The requesting user must be an active participant.
 *
 * param conversationId - UUID of the conversation.
 * param userId - UUID of the authenticated user (must be a participant).
 * param options - Optional pagination: limit (default 50) and before (ISO timestamp cursor).
 * returns Array of Message records (may be empty for a new conversation).
 * throws If parameters are missing, user is not a participant, or the DB query fails.
 */
export async function getMessages(
  conversationId: string,
  userId: string,
  options: GetMessagesOptions = {},
): Promise<Message[]> {
  if (!conversationId.trim()) {
    throw new Error("Conversation ID is required");
  }
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  await verifyParticipant(conversationId, userId);

  const { limit = 50, before } = options;

  let query = supabase
    .from("messages")
    .select(messageSelect)
    .eq("conversation_id", conversationId)
    .is("deleted_at", null);

  if (before) {
    // Load messages before the cursor newest-first, then reverse so the
    // caller always receives messages in oldest-first (chronological) order.
    query = query.lt("created_at", before).order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: true });
  }

  query = query.limit(limit);

  const { data, error } = await query.returns<Message[]>();

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  const messages = data ?? [];
  return before ? [...messages].reverse() : messages;
}

/**
 * Sends a message to an existing conversation.
 * The sender must be an active participant in the conversation.
 *
 * param conversationId - UUID of the conversation.
 * param senderId - UUID of the authenticated user sending the message.
 * param content - Message text (1–2000 characters).
 * returns The newly created Message record.
 * throws If parameters are invalid, sender is not a participant, or the DB insert fails.
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
): Promise<Message> {
  if (!conversationId.trim()) {
    throw new Error("Conversation ID is required");
  }
  if (!senderId.trim()) {
    throw new Error("Sender ID is required");
  }
  if (!content.trim()) {
    throw new Error("Message content cannot be empty");
  }
  if (content.length > 2000) {
    throw new Error("Message content cannot exceed 2000 characters");
  }

  await verifyParticipant(conversationId, senderId);

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, content })
    .select(messageSelect)
    .single<Message>();

  if (error) {
    throw new Error(`Failed to send message: ${error.message}`);
  }
  if (!data) {
    throw new Error("Message send did not return data");
  }

  // Touch the conversation's updated_at so getConversations sorts it to the top.
  // Fire-and-forget: message was already inserted, so we don't throw on failure here.
  supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .then(({ error: touchError }) => {
      if (touchError) {
        console.warn(`Failed to touch conversation updated_at: ${touchError.message}`);
      }
    });

  return data;
}

/**
 * Marks all unread messages from the other participant as read.
 * The requesting user must be an active participant.
 *
 * param conversationId - UUID of the conversation.
 * param userId - UUID of the authenticated user marking messages as read.
 * throws If parameters are missing, user is not a participant, or the DB update fails.
 */
export async function markConversationAsRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  if (!conversationId.trim()) {
    throw new Error("Conversation ID is required");
  }
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  await verifyParticipant(conversationId, userId);

  const { error } = await supabase
    .from("messages")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .eq("is_read", false);

  if (error) {
    throw new Error(`Failed to mark messages as read: ${error.message}`);
  }
}

/**
 * Subscribes to realtime updates across all of a user's conversations.
 * Fires onUpdate whenever a new message arrives in any conversation the user
 * participates in — useful for keeping the inbox sidebar live.
 * Skips messages sent by the user themselves.
 *
 * param userId - UUID of the authenticated user.
 * param onUpdate - Callback invoked with the updated ConversationSummary when a new message arrives.
 * returns A cleanup function — call it on component unmount to stop the subscription.
 * throws If userId is empty.
 */
export function subscribeToConversations(
  userId: string,
  onUpdate: (conversation: ConversationSummary) => void,
): () => void {
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  const channel = supabase
    .channel(`inbox:${userId}`)
    // Note: Supabase Realtime does not support filtering by dynamic membership
    // (e.g. "only messages in this user's conversations"). The subscription
    // receives all message INSERTs globally; getConversationById then verifies
    // participation and silently discards events for unrelated conversations.
    // This is an accepted trade-off for this project's scale.
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      async (payload) => {
        const { conversation_id, sender_id } = payload.new as {
          conversation_id: string;
          sender_id: string;
        };
        // Skip messages the user sent themselves — the UI already handles those locally.
        if (sender_id === userId) return;
        try {
          const summary = await getConversationById(conversation_id, userId);
          onUpdate(summary);
        } catch {
          // User is not a participant in this conversation — ignore silently.
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribes to new messages in a conversation via Supabase Realtime.
 * The requesting user must be an active participant.
 *
 * param conversationId - UUID of the conversation to watch.
 * param userId - UUID of the authenticated user (must be a participant).
 * param onMessage - Callback invoked with each new Message as it arrives.
 * returns A cleanup function — call it on component unmount to stop the subscription.
 * throws If parameters are missing or the user is not a participant.
 */
export async function subscribeToMessages(
  conversationId: string,
  userId: string,
  onMessage: (message: Message) => void,
): Promise<() => void> {
  if (!conversationId.trim()) {
    throw new Error("Conversation ID is required");
  }
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  // Verify participant before opening the subscription — prevents listening to
  // conversations the user isn't part of.
  await verifyParticipant(conversationId, userId);

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
        onMessage(payload.new as Message);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
