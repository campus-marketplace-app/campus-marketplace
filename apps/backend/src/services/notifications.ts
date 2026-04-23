// Notifications service module.
// Manages rows in public.notifications for in-app alerts.

import { supabase } from "../supabase-client.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  user_id: string;
  type: string;   // Free-form type string, e.g. "new_message", "listing_sold".
  payload: Record<string, unknown>;   // Arbitrary JSON payload — shape varies by notification type.
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

const notificationSelect = "id,user_id,type,payload,is_read,read_at,created_at";

// Get all notifications for a user, sorted newest-first.
export async function getNotifications(userId: string): Promise<Notification[]> {

  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  const { data, error } = await supabase
    .from("notifications")
    .select(notificationSelect)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch notifications: ${error.message}`);
  }

  return (data as Notification[]) ?? [];
}

// Mark a single notification as read. Must belong to the user.
export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {

  if (!notificationId.trim()) {
    throw new Error("Notification ID is required");
  }

  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to mark notification read: ${error.message}`);
  }

  if (!data) {
    throw new Error("Notification not found or does not belong to you");
  }
}

// Mark all of a user's unread notifications as read at once.
// Does nothing if there are no unread notifications (safe to call anytime).
export async function markAllNotificationsRead(userId: string): Promise<void> {

  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    throw new Error(`Failed to mark all notifications read: ${error.message}`);
  }
}

// Permanently delete a notification. Must belong to the user.
export async function deleteNotification(notificationId: string,userId: string): Promise<void> {

  if (!notificationId.trim()) {
    throw new Error("Notification ID is required");
  }

  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  const { data, error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to delete notification: ${error.message}`);
  }

  if (!data) {
    throw new Error("Notification not found or does not belong to you");
  }
}

// Subscribe to new notifications for a user via Supabase Realtime.
// Calls onNotification every time a new notification is inserted for this user.
// Returns an object with an unsubscribe function — call it on cleanup/unmount.
export function subscribeToNotifications(
  userId: string,
  onNotification: (n: Notification) => void,
): { unsubscribe: () => void } {
  if (!userId.trim()) throw new Error("User ID is required");

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNotification(payload.new as Notification);
      },
    )
    .subscribe();

  return {
    unsubscribe: () => supabase.removeChannel(channel),
  };
}

// Mark all unread new_message notifications for a conversation as read.
// Called when the user opens that conversation so the bell clears automatically.
export async function markConversationNotificationsRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  if (!conversationId.trim()) throw new Error("Conversation ID is required");
  if (!userId.trim()) throw new Error("User ID is required");

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("type", "new_message")
    .eq("is_read", false)
    .filter("payload->>'conversation_id'", "eq", conversationId);

  if (error) {
    throw new Error(`Failed to mark conversation notifications read: ${error.message}`);
  }
}
