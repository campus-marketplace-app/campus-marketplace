import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryOperation = "select" | "update" | "delete";

type QueryResponse = {
  table: string;
  operation: QueryOperation;
  data?: unknown;
  error?: { message: string } | null;
};

type RealtimeHandler = (payload: { new: unknown }) => void;

const { state, supabaseMock } = vi.hoisted(() => {
  const mockState = {
    responses: [] as QueryResponse[],
    realtimeHandlers: {} as Record<string, RealtimeHandler>,
    removedChannels: [] as string[],
  };

  function nextResponse(table: string, operation: QueryOperation) {
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
    };
  }

  function createChain(table: string) {
    let operation: QueryOperation = "select";
    const chain: Record<string, unknown> = {};

    chain.select = () => chain;
    chain.eq = () => chain;
    chain.order = () => chain;
    chain.range = () => chain;

    chain.update = () => {
      operation = "update";
      return chain;
    };

    chain.delete = () => {
      operation = "delete";
      return chain;
    };

    chain.single = async () => nextResponse(table, operation);
    chain.maybeSingle = async () => nextResponse(table, operation);
    chain.filter = () => chain;

    chain.then = (
      resolve: (value: { data: unknown; error: { message: string } | null }) => unknown,
      reject?: (reason?: unknown) => unknown,
    ) => Promise.resolve(nextResponse(table, operation)).then(resolve, reject);

    return chain;
  }

  const mockSupabase = {
    from: (table: string) => createChain(table),
    channel: (name: string) => {
      const channel = {
        name,
        on: (_event: string, _filter: unknown, handler: RealtimeHandler) => {
          mockState.realtimeHandlers[name] = handler;
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
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from "../notifications.js";

describe("notifications service unit", () => {
  beforeEach(() => {
    state.responses.length = 0;
    state.realtimeHandlers = {};
    state.removedChannels.length = 0;
    vi.restoreAllMocks();
  });

  it("returns empty notifications when query returns null", async () => {
    enqueueResponse({ table: "notifications", operation: "select", data: null });
    await expect(getNotifications("u1")).resolves.toEqual([]);
  });

  it("surfaces getNotifications query errors", async () => {
    enqueueResponse({ table: "notifications", operation: "select", error: { message: "fetch failed" } });
    await expect(getNotifications("u1")).rejects.toThrow("Failed to fetch notifications: fetch failed");
  });

  it("handles markNotificationRead failure and missing row", async () => {
    enqueueResponse({ table: "notifications", operation: "update", error: { message: "update failed" } });
    await expect(markNotificationRead("n1", "u1")).rejects.toThrow("Failed to mark notification read: update failed");

    enqueueResponse({ table: "notifications", operation: "update", data: null });
    await expect(markNotificationRead("n1", "u1")).rejects.toThrow("Notification not found or does not belong to you");
  });

  it("surfaces markAllNotificationsRead errors", async () => {
    enqueueResponse({ table: "notifications", operation: "update", error: { message: "bulk failed" } });
    await expect(markAllNotificationsRead("u1")).rejects.toThrow("Failed to mark all notifications read: bulk failed");
  });

  it("handles deleteNotification failure and missing row", async () => {
    enqueueResponse({ table: "notifications", operation: "delete", error: { message: "delete failed" } });
    await expect(deleteNotification("n1", "u1")).rejects.toThrow("Failed to delete notification: delete failed");

    enqueueResponse({ table: "notifications", operation: "delete", data: null });
    await expect(deleteNotification("n1", "u1")).rejects.toThrow("Notification not found or does not belong to you");
  });

  it("subscribes, invokes callback, and unsubscribes", () => {
    const received: string[] = [];

    const subscription = subscribeToNotifications("u1", (notification) => {
      received.push(notification.id);
    });

    state.realtimeHandlers["notifications:u1"]?.({
      new: {
        id: "n1",
        user_id: "u1",
        type: "new_message",
        payload: {},
        is_read: false,
        read_at: null,
        created_at: "2026-01-01",
      },
    });

    subscription.unsubscribe();

    expect(received).toEqual(["n1"]);
    expect(state.removedChannels).toContain("notifications:u1");
  });
});
