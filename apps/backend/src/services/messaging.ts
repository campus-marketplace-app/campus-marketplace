// Messaging service: conversations, messages, read receipts, and realtime subscriptions.

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
// Internal types
// ---------------------------------------------------------------------------

type ConversationRow = {
  id: string;
  listing_id: string | null;
  created_at: string;
  updated_at: string;
  listings: { id: string; title: string; status: string } | null;
  conversation_participants: Array<{ user_id: string }>;
  // NOTE: PostgREST nested selects can't filter or aggregate, so ALL messages are fetched
  // (including soft-deleted ones). unread_count and last_message are derived from this array.
  messages: Array<{ id: string; sender_id: string; content: string; is_read: boolean; created_at: string }>;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// Centralized select strings so every query returns a consistent shape.
const messageSelect = "id,conversation_id,sender_id,content,is_read,read_at,created_at";

const conversationSelect = `
  id,listing_id,created_at,updated_at,
  listings(id,title,status),
  conversation_participants(user_id),
  messages(id,sender_id,content,is_read,created_at)
`;

// Uses a SECURITY DEFINER RPC to bypass RLS for the participant check.
// The shared supabase client may be authenticated as a different user than userId
// (e.g. in tests), so an RLS-gated query would incorrectly return no rows.
async function verifyParticipant(conversationId: string, userId: string): Promise<void> {
  const { data, error } = await supabase.rpc("is_user_participant", {
    conv_id: conversationId,
    target_user_id: userId,
  });

  if (error) throw new Error(`Database error while verifying conversation participant: ${error.message}`);
  if (!data) throw new Error("You are not a participant in this conversation");
}

// Fetches profiles for the given user IDs and returns them as a Map keyed by user_id.
async function fetchProfileMap(userIds: string[]): Promise<Map<string, ConversationParticipant>> {
  if (userIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id,display_name,avatar_path")
    .in("user_id", userIds);

  if (error) throw new Error(`Failed to fetch participant profiles: ${error.message}`);

  const map = new Map<string, ConversationParticipant>();
  for (const row of data ?? []) {
    const avatar_path = row.avatar_path ?? null;
    const avatar_url = avatar_path
      ? supabase.storage.from("avatars").getPublicUrl(avatar_path).data.publicUrl
      : null;
    map.set(row.user_id, { user_id: row.user_id, display_name: row.display_name, avatar_path, avatar_url });
  }
  return map;
}

// Shapes a raw conversation DB row into a ConversationSummary for the requesting user.
// "other_participant" is whoever isn't requestingUserId.
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

  // Messages arrive in insertion order from the DB — sort descending to find the latest.
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

// ---------------------------------------------------------------------------
// Exported service functions
// ---------------------------------------------------------------------------

// Returns a fully-enriched ConversationSummary for a single conversation.
// Also used internally after finding or creating a conversation.
export async function getConversationById(
  conversationId: string,
  requestingUserId: string,
): Promise<ConversationSummary> {
  if (!conversationId.trim()) throw new Error("Conversation ID is required");
  if (!requestingUserId.trim()) throw new Error("User ID is required");

  await verifyParticipant(conversationId, requestingUserId);

  const { data, error } = await supabase
    .from("conversations")
    .select(conversationSelect)
    .eq("id", conversationId)
    .is("deleted_at", null)
    .single<ConversationRow>();

  if (error) throw new Error(`Failed to load conversation: ${error.message}`);
  if (!data) throw new Error(`Conversation not found: ${conversationId}`);

  const otherUserId = data.conversation_participants.find(
    (p) => p.user_id !== requestingUserId,
  )?.user_id;

  const profileMap = await fetchProfileMap(otherUserId ? [otherUserId] : []);
  return mapConversationRow(data, requestingUserId, profileMap);
}

// Finds an existing conversation for a listing between buyer and seller,
// or creates one if none exists. A user cannot start a conversation with themselves.
// Returns the conversation from the buyer's perspective (other_participant = seller).
export async function createOrGetConversation(
  input: CreateConversationInput,
): Promise<ConversationSummary> {
  if (!input.listing_id?.trim()) throw new Error("Listing ID is required");
  if (!input.buyer_id?.trim()) throw new Error("Buyer ID is required");
  if (!input.seller_id?.trim()) throw new Error("Seller ID is required");
  if (input.buyer_id === input.seller_id) {
    throw new Error("A user cannot start a conversation with themselves");
  }

  // Step 1: Find all conversations the buyer is currently part of.
  const { data: buyerParticipations, error: buyerError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", input.buyer_id)
    .is("left_at", null);

  if (buyerError) throw new Error(`Failed to check existing conversations: ${buyerError.message}`);

  const buyerConvIds = (buyerParticipations ?? []).map((r) => r.conversation_id);
  let conversationId: string | null = null;

  // Step 2: Among those, find one where the seller also participates on the same listing.
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

    if (matchError) throw new Error(`Failed to check existing conversations: ${matchError.message}`);

    conversationId = matches?.[0]?.conversation_id ?? null;
  }

  // Step 3: Create a new conversation if no existing one was found.
  if (!conversationId) {
    // Pre-generate the UUID so we don't need a post-insert SELECT.
    // A post-insert SELECT would fail under RLS: the conversations SELECT policy
    // requires the user to already be a participant, which isn't true yet.
    const newId = crypto.randomUUID();

    const { error: createError } = await supabase
      .from("conversations")
      .insert({ id: newId, listing_id: input.listing_id });

    if (createError) throw new Error(`Failed to create conversation: ${createError.message}`);

    conversationId = newId;

    // Two separate inserts instead of upsert: upsert evaluates the UPDATE policy on every
    // row (even for pure inserts), which fails when auth.uid() doesn't match the row's user_id.
    // Plain INSERT only checks the INSERT policy.
    const [{ error: buyerError2 }, { error: sellerError }] = await Promise.all([
      supabase
        .from("conversation_participants")
        .insert({ conversation_id: conversationId, user_id: input.buyer_id }),
      supabase
        .from("conversation_participants")
        .insert({ conversation_id: conversationId, user_id: input.seller_id }),
    ]);

    if (buyerError2 ?? sellerError) {
      throw new Error(
        `Failed to add conversation participants: ${(buyerError2 ?? sellerError)!.message}`,
      );
    }
  }

  if (!conversationId) throw new Error("Failed to find or create conversation");

  return getConversationById(conversationId, input.buyer_id);
}

// Returns all active conversations for a user, sorted by most recent activity.
export async function getConversations(userId: string): Promise<ConversationSummary[]> {
  if (!userId.trim()) throw new Error("User ID is required");

  // Step 1: Get conversation IDs the user is currently part of.
  const { data: participations, error: partError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId)
    .is("left_at", null);

  if (partError) throw new Error(`Failed to fetch conversations: ${partError.message}`);

  const convIds = (participations ?? []).map((r) => r.conversation_id);
  if (convIds.length === 0) return [];

  // Step 2: Fetch full conversation data for those IDs.
  const { data: convRows, error: convError } = await supabase
    .from("conversations")
    .select(conversationSelect)
    .in("id", convIds)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .returns<ConversationRow[]>();

  if (convError) throw new Error(`Failed to fetch conversations: ${convError.message}`);

  const rows = convRows ?? [];
  if (rows.length === 0) return [];

  // Step 3: Batch-fetch profiles for all other participants (avoids N+1 queries).
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

// Returns messages in a conversation in chronological order.
// Supports cursor-based pagination: pass `before` (ISO timestamp) to load older messages.
// Defaults to the 50 most recent messages when no cursor is given.
export async function getMessages(
  conversationId: string,
  userId: string,
  options: GetMessagesOptions = {},
): Promise<Message[]> {
  if (!conversationId.trim()) throw new Error("Conversation ID is required");
  if (!userId.trim()) throw new Error("User ID is required");

  await verifyParticipant(conversationId, userId);

  const { limit = 50, before } = options;

  let query = supabase
    .from("messages")
    .select(messageSelect)
    .eq("conversation_id", conversationId)
    .is("deleted_at", null);

  if (before) {
    // Fetch newest-first so the DB LIMIT cuts off the oldest, then reverse to restore
    // chronological order for the caller.
    query = query.lt("created_at", before).order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: true });
  }

  const { data, error } = await query.limit(limit).returns<Message[]>();

  if (error) throw new Error(`Failed to fetch messages: ${error.message}`);

  const messages = data ?? [];
  return before ? [...messages].reverse() : messages;
}

// Sends a message to a conversation. Sender must be an active participant.
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
): Promise<Message> {
  if (!conversationId.trim()) throw new Error("Conversation ID is required");
  if (!senderId.trim()) throw new Error("Sender ID is required");
  if (!content.trim()) throw new Error("Message content cannot be empty");
  if (content.length > 2000) throw new Error("Message content cannot exceed 2000 characters");

  await verifyParticipant(conversationId, senderId);

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, content })
    .select(messageSelect)
    .single<Message>();

  if (error) throw new Error(`Failed to send message: ${error.message}`);
  if (!data) throw new Error("Message send did not return data");

  // Touch conversation updated_at so getConversations sorts it to the top.
  // Inserting a message doesn't automatically update the parent conversation row,
  // so this explicit update is required. Fire-and-forget: message is already saved.
  supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .then(({ error: touchError }) => {
      if (touchError) console.warn(`Failed to touch conversation updated_at: ${touchError.message}`);
    });

  return data;
}

// Marks all unread messages from the other participant as read.
export async function markConversationAsRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  if (!conversationId.trim()) throw new Error("Conversation ID is required");
  if (!userId.trim()) throw new Error("User ID is required");

  await verifyParticipant(conversationId, userId);

  const { error } = await supabase
    .from("messages")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .eq("is_read", false);

  if (error) throw new Error(`Failed to mark messages as read: ${error.message}`);
}

// Subscribes to new messages across all of a user's conversations.
// Fires onUpdate when a message arrives in any conversation the user participates in.
// Messages sent by the user themselves are skipped.
// Returns a cleanup function — call it on component unmount.
export function subscribeToConversations(
  userId: string,
  onUpdate: (conversation: ConversationSummary) => void,
): () => void {
  if (!userId.trim()) throw new Error("User ID is required");

  const channel = supabase
    .channel(`inbox:${userId}`)
    // Realtime doesn't support filtering by conversation membership, so this receives
    // ALL message INSERTs globally. getConversationById verifies participation;
    // the catch below silently discards events for unrelated conversations.
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      async (payload) => {
        const { conversation_id, sender_id } = payload.new as {
          conversation_id: string;
          sender_id: string;
        };
        if (sender_id === userId) return;
        try {
          const summary = await getConversationById(conversation_id, userId);
          onUpdate(summary);
        } catch {
          // Not a participant in this conversation — discard silently.
        }
      },
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// Subscribes to new messages in a specific conversation.
// Returns a cleanup function — call it on component unmount.
export async function subscribeToMessages(
  conversationId: string,
  userId: string,
  onMessage: (message: Message) => void,
): Promise<() => void> {
  if (!conversationId.trim()) throw new Error("Conversation ID is required");
  if (!userId.trim()) throw new Error("User ID is required");

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
      (payload) => onMessage(payload.new as Message),
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
