// Messaging service module.
// Coordinates reads/writes across public.conversations, public.conversation_participants, and public.messages.

import { supabase } from "../supabase-client.js";
import type { ListingStatus } from "./listings.types.js";

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
  // Title of the linked listing (if listing_id is set).
  listing_title?: string;
  // True if the requesting user owns the listing (i.e. they are the seller).
  is_seller?: boolean;
  // Storage path of the other user's avatar (pass to getAvatarUrl to get a URL).
  other_user_avatar_path?: string | null;
  // Status of the linked listing ("active", "sold", "draft", etc.). Null if no listing.
  listing_status?: ListingStatus | null;
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

/** Thrown when trying to send a message in a conversation whose linked listing is sold. */
export class ConversationLockedError extends Error {
  readonly code = "CONVERSATION_LOCKED";

  constructor() {
    super("This conversation is locked because the listing has been sold");
    this.name = "ConversationLockedError";
  }
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

// Look up a user's display_name and avatar_path from profiles.
async function getOtherUserInfo(userId: string): Promise<{ displayName?: string; avatarPath?: string | null }> {
  const { data } = await supabase
    .from("profiles")
    .select("display_name,avatar_path")
    .eq("user_id", userId)
    .single();

  return {
    displayName: data?.display_name ?? undefined,
    avatarPath: data?.avatar_path ?? null,
  };
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

// Fetch listing title, owner, and status for a given listing_id.
async function getListingInfo(
  listingId: string,
): Promise<{ title: string; user_id: string; status: ListingStatus } | null> {
  const { data } = await supabase
    .from("listings")
    .select("title,user_id,status")
    .eq("id", listingId)
    .maybeSingle();

  return data ?? null;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

// Start or resume a conversation with another user.
// Returns the existing conversation if one already exists for the same listing.
// Uses the find_or_create_conversation RPC, which holds an advisory lock for the
// duration of the find-or-insert so two simultaneous calls for the same
// (user, participant, listing) tuple can't create duplicate rows.
export async function createConversation(userId: string, participantId: string, listingId?: string): Promise<Conversation> {
  if (!userId.trim()) throw new Error("User ID is required");
  if (!participantId.trim()) throw new Error("Participant ID is required");
  if (userId === participantId) throw new Error("You cannot start a conversation with yourself");

  // Block check stays in the JS layer — it's cheap and fails fast before we hit the RPC.
  const { data: blocked } = await supabase
    .from("blocks")
    .select("id")
    .or(`and(user_id.eq.${userId},blocked_user_id.eq.${participantId}),and(user_id.eq.${participantId},blocked_user_id.eq.${userId})`)
    .limit(1);

  if (blocked && blocked.length > 0) {
    throw new Error("Cannot start a conversation — one of you has blocked the other");
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc("find_or_create_conversation", {
    p_user_id: userId,
    p_participant_id: participantId,
    p_listing_id: listingId ?? null,
  });

  if (rpcError || !rpcData) {
    throw new Error(`Failed to create conversation: ${rpcError?.message ?? "no data returned"}`);
  }

  // The RPC returns a single conversations row. Hydrate it with the same fields
  // getConversation provides (other user info, last message, unread count, etc).
  const convoId = (rpcData as { id: string }).id;
  return getConversation(convoId, userId);
}

// Get all conversations for a user, sorted newest-first.
// Includes the other user's display name, last message preview, and unread count.
// Uses two parallel query rounds instead of N×4 sequential queries.
export async function getConversationsByUser(userId: string): Promise<Conversation[]> {
  if (!userId.trim()) throw new Error("User ID is required");

  // Get all conversation IDs the user participates in.
  const { data: participations, error: partError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId)
    .is("left_at", null);

  if (partError) throw new Error(`Failed to fetch conversations: ${partError.message}`);
  if (!participations || participations.length === 0) return [];

  const convoIds = participations.map((r: { conversation_id: string }) => r.conversation_id);

  // Fetch the conversation rows.
  const { data: convos, error: convoError } = await supabase
    .from("conversations")
    .select("id,listing_id,created_at,updated_at")
    .in("id", convoIds)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (convoError) throw new Error(`Failed to fetch conversations: ${convoError.message}`);
  if (!convos || convos.length === 0) return [];

  const listingIds = [
    ...new Set(
      convos
        .map((c: { listing_id: string | null }) => c.listing_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  // Round 1 — four parallel queries, all need only convoIds or listingIds.
  const [
    { data: allParticipants, error: participantsError },
    { data: allLastMsgs, error: lastMsgsError },
    { data: allUnreadMsgs, error: unreadError },
    { data: allListings, error: listingsError },
  ] = await Promise.all([
    // Other participant per conversation.
    supabase
      .from("conversation_participants")
      .select("conversation_id,user_id")
      .in("conversation_id", convoIds)
      .is("left_at", null)
      .neq("user_id", userId),

    // Latest message per conversation (deduplicated client-side).
    supabase
      .from("messages")
      .select("conversation_id,content")
      .in("conversation_id", convoIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),

    // Unread messages per conversation (counted client-side).
    supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", convoIds)
      .neq("sender_id", userId)
      .eq("is_read", false)
      .is("deleted_at", null),

    // Listing info for all referenced listings.
    listingIds.length > 0
      ? supabase
          .from("listings")
          .select("id,title,user_id,status")
          .in("id", listingIds)
      : Promise.resolve({ data: [] as { id: string; title: string; user_id: string; status: ListingStatus }[], error: null }),
  ]);

  if (participantsError) throw new Error(`Failed to fetch participants: ${participantsError.message}`);
  if (lastMsgsError) throw new Error(`Failed to fetch messages: ${lastMsgsError.message}`);
  if (unreadError) throw new Error(`Failed to fetch unread counts: ${unreadError.message}`);
  if (listingsError) throw new Error(`Failed to fetch listings: ${listingsError.message}`);

  // Round 2 — profiles for other participants (needs Round 1 result).
  const otherUserIds = [
    ...new Set((allParticipants ?? []).map((p: { user_id: string }) => p.user_id)),
  ];

  const { data: profilesData, error: profilesError } = otherUserIds.length > 0
    ? await supabase
        .from("profiles")
        .select("user_id,display_name,avatar_path")
        .in("user_id", otherUserIds)
    : { data: [] as { user_id: string; display_name: string | null; avatar_path: string | null }[], error: null };

  if (profilesError) throw new Error(`Failed to fetch profiles: ${profilesError.message}`);

  // Build lookup maps — O(n) assembly, no more awaits.
  const otherUserIdByConvoId = new Map<string, string>(
    (allParticipants ?? []).map(
      (p: { conversation_id: string; user_id: string }) => [p.conversation_id, p.user_id],
    ),
  );

  const lastMsgByConvoId = new Map<string, string>();
  for (const msg of (allLastMsgs ?? []) as { conversation_id: string; content: string }[]) {
    if (!lastMsgByConvoId.has(msg.conversation_id)) {
      lastMsgByConvoId.set(msg.conversation_id, msg.content);
    }
  }

  const unreadCountByConvoId = new Map<string, number>();
  for (const msg of (allUnreadMsgs ?? []) as { conversation_id: string }[]) {
    unreadCountByConvoId.set(
      msg.conversation_id,
      (unreadCountByConvoId.get(msg.conversation_id) ?? 0) + 1,
    );
  }

  const profileByUserId = new Map(
    (profilesData ?? []).map(
      (p: { user_id: string; display_name: string | null; avatar_path: string | null }) => [
        p.user_id,
        { displayName: p.display_name ?? undefined, avatarPath: p.avatar_path },
      ],
    ),
  );

  const listingByListingId = new Map(
    (allListings ?? []).map(
      (l: { id: string; title: string; user_id: string; status: ListingStatus }) => [l.id, l],
    ),
  );

  // Assemble — plain loop, zero awaits.
  const results: Conversation[] = [];
  for (const convo of convos) {
    const otherId = otherUserIdByConvoId.get(convo.id);
    if (!otherId) continue;

    const profile = profileByUserId.get(otherId);
    const listingInfo = convo.listing_id ? listingByListingId.get(convo.listing_id) : null;

    results.push({
      id: convo.id,
      listing_id: convo.listing_id,
      created_at: convo.created_at,
      updated_at: convo.updated_at,
      other_user_id: otherId,
      other_user_display_name: profile?.displayName,
      other_user_avatar_path: profile?.avatarPath,
      last_message: lastMsgByConvoId.get(convo.id),
      unread_count: unreadCountByConvoId.get(convo.id) ?? 0,
      listing_title: listingInfo?.title,
      is_seller: listingInfo ? listingInfo.user_id === userId : undefined,
      listing_status: listingInfo?.status ?? null,
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

  const { displayName, avatarPath } = await getOtherUserInfo(otherId);

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

  const listingInfo = convo.listing_id ? await getListingInfo(convo.listing_id) : null;

  return {
    id: convo.id,
    listing_id: convo.listing_id,
    created_at: convo.created_at,
    updated_at: convo.updated_at,
    other_user_id: otherId,
    other_user_display_name: displayName,
    other_user_avatar_path: avatarPath,
    last_message: lastMsg?.[0]?.content,
    unread_count: count ?? 0,
    listing_title: listingInfo?.title,
    is_seller: listingInfo ? listingInfo.user_id === userId : undefined,
    listing_status: listingInfo?.status ?? null,
  };
}

// Get messages in a conversation, sorted oldest-first.
// Requires the caller to be an active participant — backend uses the service
// role key, so RLS would not stop a non-participant from reading otherwise.
// Pagination is offset-based; default page is the first 100 messages.
export async function getMessages(
  conversationId: string,
  userId: string,
  limit = 100,
  offset = 0,
): Promise<Message[]> {
  if (!conversationId.trim()) throw new Error("Conversation ID is required");
  if (!userId.trim()) throw new Error("User ID is required");

  const callerIsParticipant = await isParticipant(conversationId, userId);
  if (!callerIsParticipant) {
    throw new Error("You are not a participant in this conversation");
  }

  // Verify conversation exists and isn't deleted.
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
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

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

  // Verify sender is a participant before any other checks.
  const senderIsParticipant = await isParticipant(conversationId, senderId);
  if (!senderIsParticipant) {
    throw new Error("You are not a participant in this conversation");
  }

  // Guard: block messages if the linked listing has been sold AND the sender is
  // not the seller. Sellers retain messaging access so they can coordinate
  // pickup/refunds. The DB trigger block_messages_on_sold_listing enforces the
  // same rule atomically.
  const { data: convoCheck } = await supabase
    .from("conversations")
    .select("listing_id")
    .eq("id", conversationId)
    .is("deleted_at", null)
    .single();

  if (convoCheck?.listing_id) {
    const { data: listingCheck } = await supabase
      .from("listings")
      .select("status,user_id")
      .eq("id", convoCheck.listing_id)
      .single();

    if (listingCheck?.status === "sold" && listingCheck.user_id !== senderId) {
      throw new ConversationLockedError();
    }
  }

  // Insert the message. The DB trigger block_messages_on_sold_listing rejects
  // inserts whose listing flipped to 'sold' between our pre-check and here.
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
    if (msgError?.message?.includes("Cannot send messages on a sold listing")) {
      throw new ConversationLockedError();
    }
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

// Soft-delete a conversation for the given user (sets deleted_at).
// The conversation must exist and the user must be an active participant.
export async function archiveConversation(conversationId: string, userId: string): Promise<void> {
  if (!conversationId.trim()) throw new Error("Conversation ID is required");
  if (!userId.trim()) throw new Error("User ID is required");

  const ok = await isParticipant(conversationId, userId);
  if (!ok) throw new Error("Not a participant in this conversation");

  const { error } = await supabase
    .from("conversations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (error) throw new Error(`Failed to archive conversation: ${error.message}`);
}

// Subscribe to updates on any of the given conversations via Supabase Realtime.
// Calls onChange whenever a conversation row is updated (e.g. last message, unread count).
// Used by the frontend to replace 15-second polling with event-driven cache invalidation.
// Returns an object with an unsubscribe function — call it on cleanup/unmount.
// userId is used to scope the channel name so each subscriber gets a distinct channel
// (and the unsubscribe in one tab can't tear down another's). The Postgres-changes
// stream itself isn't filterable per user — the callback receives every conversation
// UPDATE — so the consumer should debounce or compare ids if it cares about specifics.
export function subscribeToConversations(
  userId: string,
  onChange: (conversationId: string) => void,
): { unsubscribe: () => void } {
  if (!userId.trim()) return { unsubscribe: () => {} };

  const channel = supabase
    .channel(`conversations:user:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "conversations",
      },
      (payload) => {
        const updatedId = (payload.new as { id: string }).id;
        onChange(updatedId);
      },
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
