// Notifications service module.
// Manages rows in public.notifications for in-app alerts.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  user_id: string;
  // Free-form type string, e.g. "new_message", "listing_sold".
  type: string;
  // Arbitrary JSON payload — shape varies by notification type.
  payload: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

// Get all notifications for a user, sorted newest-first.
export async function getNotifications(
  _userId: string,
): Promise<Notification[]> {
  void _userId;
  throw new Error("Not yet implemented");
}

// Mark a single notification as read. Must belong to the user.
export async function markNotificationRead(
  _notificationId: string,
  _userId: string,
): Promise<void> {
  void _notificationId;
  void _userId;
  throw new Error("Not yet implemented");
}

// Mark all of a user's unread notifications as read at once.
export async function markAllNotificationsRead(
  _userId: string,
): Promise<void> {
  void _userId;
  throw new Error("Not yet implemented");
}

// Permanently delete a notification. Must belong to the user.
export async function deleteNotification(
  _notificationId: string,
  _userId: string,
): Promise<void> {
  void _notificationId;
  void _userId;
  throw new Error("Not yet implemented");
}
