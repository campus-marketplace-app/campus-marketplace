import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { supabase } from "../../supabase-client.js";
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from "../notifications.js";
import { createTestUser } from "./helpers.js";
import type { TestUser } from "./helpers.js";

let user: TestUser;
const notificationIds: string[] = [];

beforeAll(async () => {
  user = await createTestUser("Notifications Test User");
});

afterAll(async () => {
  for (const notificationId of notificationIds) {
    await supabase.from("notifications").delete().eq("id", notificationId);
  }

  await user.cleanup();
});

async function createNotification(type: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: user.user.id,
      type,
      payload,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(`Failed to create notification test row: ${error?.message ?? "unknown error"}`);
  }

  notificationIds.push(data.id);
  return data.id;
}

describe("notifications service", () => {
  it("returns user notifications newest-first", async () => {
    const first = await createNotification("first", { order: 1 });
    const second = await createNotification("second", { order: 2 });

    const notifications = await getNotifications(user.user.id);
    const notificationIdsInOrder = notifications.map((notification) => notification.id);

    expect(notificationIdsInOrder.indexOf(second)).toBeLessThan(notificationIdsInOrder.indexOf(first));
  });

  it("marks one notification as read", async () => {
    const notificationId = await createNotification("single-read", { read: false });

    await markNotificationRead(notificationId, user.user.id);

    const { data } = await supabase
      .from("notifications")
      .select("is_read,read_at")
      .eq("id", notificationId)
      .single<{ is_read: boolean; read_at: string | null }>();

    expect(data?.is_read).toBe(true);
    expect(data?.read_at).toBeTruthy();
  });

  it("marks all unread notifications as read", async () => {
    const unreadOne = await createNotification("bulk-read-1", { read: false });
    const unreadTwo = await createNotification("bulk-read-2", { read: false });

    await markAllNotificationsRead(user.user.id);

    const { data } = await supabase
      .from("notifications")
      .select("id,is_read")
      .in("id", [unreadOne, unreadTwo]);

    expect(data?.every((notification) => notification.is_read)).toBe(true);
  });

  it("deletes a notification", async () => {
    const notificationId = await createNotification("delete-me", { delete: true });

    await deleteNotification(notificationId, user.user.id);

    const { data } = await supabase.from("notifications").select("id").eq("id", notificationId).maybeSingle<{ id: string }>();
    expect(data).toBeNull();
  });

  it("throws for empty ids", async () => {
    await expect(getNotifications("")).rejects.toThrow("User ID is required");
    await expect(markNotificationRead("", user.user.id)).rejects.toThrow("Notification ID is required");
    await expect(markNotificationRead("id", "")).rejects.toThrow("User ID is required");
    await expect(markAllNotificationsRead("")).rejects.toThrow("User ID is required");
    await expect(deleteNotification("", user.user.id)).rejects.toThrow("Notification ID is required");
    await expect(deleteNotification("id", "")).rejects.toThrow("User ID is required");
  });

  it("subscribes and unsubscribes without throwing for valid ids", async () => {
    const subscription = subscribeToNotifications(user.user.id, () => undefined);
    subscription.unsubscribe();
    expect(true).toBe(true);
  });
});