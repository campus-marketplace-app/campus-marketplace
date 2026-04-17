import { afterEach, describe, expect, it, vi } from "vitest";

type QueryResponse = {
  table: string;
  operation: "select" | "insert" | "update" | "delete";
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
};

type RealtimeHandler = (payload: { new: unknown }) => void;

const { state, supabaseMock } = vi.hoisted(() => {
  const mockState = {
    responses: [] as QueryResponse[],
    realtimeHandler: null as RealtimeHandler | null,
    removedChannels: [] as string[],
  };

  function nextResponse(table: string, operation: QueryResponse["operation"]) {
    const response = mockState.responses.shift();

    if (!response) {
      throw new Error(`Unexpected query for ${table}.${operation}`);
    }

    if (response.table !== table || response.operation !== operation) {
      throw new Error(
        `Unexpected query order. Expected ${response.table}.${response.operation} but got ${table}.${operation}`,
      );
    }

    return {
      data: response.data ?? null,
      error: response.error ?? null,
      count: response.count ?? null,
    };
  }

  function createChain(table: string) {
    let operation: QueryResponse["operation"] = "select";
    const chain: Record<string, unknown> = {};

    chain.select = () => chain;
    chain.eq = () => chain;
    chain.neq = () => chain;
    chain.is = () => chain;
    chain.in = () => chain;
    chain.or = () => chain;
    chain.order = () => chain;
    chain.limit = () => chain;

    chain.insert = () => {
      operation = "insert";
      return chain;
    };

    chain.update = () => {
      operation = "update";
      return chain;
    };

    chain.delete = () => {
      operation = "delete";
      return chain;
    };

    chain.single = async () => nextResponse(table, operation);

    chain.then = (
      resolve: (value: { data: unknown; error: { message: string } | null; count: number | null }) => unknown,
      reject?: (reason?: unknown) => unknown,
    ) => Promise.resolve(nextResponse(table, operation)).then(resolve, reject);

    return chain;
  }

  const mockSupabase = {
    from: (table: string) => createChain(table),
    channel: (name: string) => {
      const channel = {
        name,
        on: (
          _event: string,
          _filter: unknown,
          handler: RealtimeHandler,
        ) => {
          mockState.realtimeHandler = handler;
          return channel;
        },
        subscribe: () => channel,
      };

      return channel;
    },
    removeChannel: (channel: { name: string }) => {
      mockState.removedChannels.push(channel.name);
    },
  };

  return {
    state: mockState,
    supabaseMock: mockSupabase,
  };
});

function enqueueResponse(response: QueryResponse) {
  state.responses.push(response);
}

vi.mock("../../supabase-client.js", () => ({
  supabase: supabaseMock,
}));

import {
  archiveConversation,
  createConversation,
  getConversation,
  getConversationsByUser,
  getMessages,
  markMessagesRead,
  sendMessage,
  subscribeToMessages,
} from "../messaging.js";

afterEach(() => {
  state.responses.length = 0;
  state.realtimeHandler = null;
  state.removedChannels.length = 0;
  vi.restoreAllMocks();
});

describe("messaging service", () => {
  it("validates createConversation input", async () => {
    await expect(createConversation("", "u2")).rejects.toThrow("User ID is required");
    await expect(createConversation("u1", "")).rejects.toThrow("Participant ID is required");
    await expect(createConversation("u1", "u1")).rejects.toThrow("You cannot start a conversation with yourself");
  });

  it("blocks conversation creation when users are blocked", async () => {
    enqueueResponse({ table: "blocks", operation: "select", data: [{ id: "b1" }] });

    await expect(createConversation("u1", "u2")).rejects.toThrow(
      "Cannot start a conversation — one of you has blocked the other",
    );
  });

  it("returns existing conversation when found", async () => {
    enqueueResponse({ table: "blocks", operation: "select", data: [] });
    enqueueResponse({ table: "conversation_participants", operation: "select", data: [{ conversation_id: "c-existing" }] });
    enqueueResponse({ table: "conversation_participants", operation: "select", data: [{ conversation_id: "c-existing" }] });
    enqueueResponse({ table: "conversations", operation: "select", data: [{ id: "c-existing" }] });
    enqueueResponse({
      table: "conversations",
      operation: "select",
      data: { id: "c-existing", listing_id: null, created_at: "2026-01-01", updated_at: "2026-01-02" },
    });
    enqueueResponse({ table: "conversation_participants", operation: "select", data: [{ user_id: "u2" }] });
    enqueueResponse({ table: "profiles", operation: "select", data: { display_name: "Other User", avatar_path: "avatar.png" } });
    enqueueResponse({ table: "messages", operation: "select", data: [{ content: "latest" }] });
    enqueueResponse({ table: "messages", operation: "select", count: 2, data: null });

    const convo = await createConversation("u1", "u2");

    expect(convo.id).toBe("c-existing");
    expect(convo.other_user_id).toBe("u2");
    expect(convo.last_message).toBe("latest");
    expect(convo.unread_count).toBe(2);
  });

  it("creates a new conversation when no existing conversation is found", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-0000-0000-000000000001");

    enqueueResponse({ table: "blocks", operation: "select", data: [] });
    enqueueResponse({ table: "conversation_participants", operation: "select", data: [] });
    enqueueResponse({ table: "conversations", operation: "insert", data: null });
    enqueueResponse({ table: "conversation_participants", operation: "insert", data: null });
    enqueueResponse({
      table: "conversations",
      operation: "select",
      data: { id: "00000000-0000-0000-0000-000000000001", listing_id: null, created_at: "2026-01-01", updated_at: "2026-01-01" },
    });
    enqueueResponse({ table: "conversation_participants", operation: "select", data: [{ user_id: "u2" }] });
    enqueueResponse({ table: "profiles", operation: "select", data: { display_name: "Other User", avatar_path: null } });
    enqueueResponse({ table: "messages", operation: "select", data: [] });
    enqueueResponse({ table: "messages", operation: "select", count: 0, data: null });

    const convo = await createConversation("u1", "u2");

    expect(convo.id).toBe("00000000-0000-0000-0000-000000000001");
    expect(convo.unread_count).toBe(0);
  });

  it("returns empty list when user has no conversations", async () => {
    enqueueResponse({ table: "conversation_participants", operation: "select", data: [] });

    await expect(getConversationsByUser("u1")).resolves.toEqual([]);
  });

  it("hydrates conversation list with listing context", async () => {
    enqueueResponse({ table: "conversation_participants", operation: "select", data: [{ conversation_id: "c1" }] });
    enqueueResponse({
      table: "conversations",
      operation: "select",
      data: [{ id: "c1", listing_id: "l1", created_at: "2026-01-01", updated_at: "2026-01-03" }],
    });
    enqueueResponse({ table: "conversation_participants", operation: "select", data: [{ user_id: "u2" }] });
    enqueueResponse({ table: "profiles", operation: "select", data: { display_name: "Seller", avatar_path: "a.png" } });
    enqueueResponse({ table: "messages", operation: "select", data: [{ content: "hello" }] });
    enqueueResponse({ table: "messages", operation: "select", count: 1, data: null });
    enqueueResponse({ table: "listings", operation: "select", data: { title: "Bike", user_id: "u1" } });

    const rows = await getConversationsByUser("u1");

    expect(rows).toHaveLength(1);
    expect(rows[0]?.listing_title).toBe("Bike");
    expect(rows[0]?.is_seller).toBe(true);
  });

  it("throws when conversation lookup fails", async () => {
    enqueueResponse({ table: "conversations", operation: "select", error: { message: "missing" }, data: null });

    await expect(getConversation("c1", "u1")).rejects.toThrow("Conversation not found");
  });

  it("gets messages sorted query path and validates conversation existence", async () => {
    enqueueResponse({ table: "conversations", operation: "select", data: { id: "c1" } });
    enqueueResponse({
      table: "messages",
      operation: "select",
      data: [
        {
          id: "m1",
          conversation_id: "c1",
          sender_id: "u1",
          content: "hello",
          is_read: false,
          read_at: null,
          created_at: "2026-01-01",
        },
      ],
    });

    const messages = await getMessages("c1");
    expect(messages).toHaveLength(1);

    await expect(getMessages("")).rejects.toThrow("Conversation ID is required");
  });

  it("sends a message for participants and trims content", async () => {
    enqueueResponse({ table: "conversation_participants", operation: "select", data: [{ id: "p1" }] });
    // Sold-listing guard: fetch conversation listing_id (null = no linked listing, guard passes).
    enqueueResponse({ table: "conversations", operation: "select", data: { id: "c1", listing_id: null } });
    enqueueResponse({
      table: "messages",
      operation: "insert",
      data: {
        id: "m-new",
        conversation_id: "c1",
        sender_id: "u1",
        content: "trimmed",
        is_read: false,
        read_at: null,
        created_at: "2026-01-01",
      },
    });
    enqueueResponse({ table: "conversations", operation: "update", data: null });

    const message = await sendMessage("c1", "u1", "  trimmed  ");
    expect(message.id).toBe("m-new");

    await expect(sendMessage("c1", "u1", "   ")).rejects.toThrow("Message content cannot be empty");
  });

  it("rejects sendMessage for non-participants", async () => {
    enqueueResponse({ table: "conversation_participants", operation: "select", data: [] });

    await expect(sendMessage("c1", "u1", "hello")).rejects.toThrow(
      "You are not a participant in this conversation",
    );
  });

  it("marks messages read and validates required input", async () => {
    enqueueResponse({ table: "messages", operation: "update", data: null });

    await expect(markMessagesRead("c1", "u1")).resolves.toBeUndefined();
    await expect(markMessagesRead("", "u1")).rejects.toThrow("Conversation ID is required");
    await expect(markMessagesRead("c1", "")).rejects.toThrow("User ID is required");
  });

  it("subscribes and unsubscribes to realtime messages", async () => {
    const received: string[] = [];

    const subscription = subscribeToMessages("c1", (msg) => {
      received.push(msg.id);
    });

    state.realtimeHandler?.({
      new: {
        id: "m-sub",
        conversation_id: "c1",
        sender_id: "u2",
        content: "rt",
        is_read: false,
        read_at: null,
        created_at: "2026-01-01",
      },
    });

    subscription.unsubscribe();

    expect(received).toEqual(["m-sub"]);
    expect(state.removedChannels).toContain("messages:c1");
  });

  it("archives conversation only for participants", async () => {
    enqueueResponse({ table: "conversation_participants", operation: "select", data: [] });
    await expect(archiveConversation("c1", "u1")).rejects.toThrow("Not a participant in this conversation");

    enqueueResponse({ table: "conversation_participants", operation: "select", data: [{ id: "p1" }] });
    enqueueResponse({ table: "conversations", operation: "update", data: null });
    await expect(archiveConversation("c1", "u1")).resolves.toBeUndefined();
  });
});
