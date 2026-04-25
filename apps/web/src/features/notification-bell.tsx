import { useRef, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import type { Notification } from '@campus-marketplace/backend';

type NotificationBellProps = {
  notifications: Notification[];
  onMarkAllRead: () => void;
  onNotificationClick: (n: Notification) => void;
};

// Helper function to extract display text from notification payload
function getNotificationLabel(n: Notification): string {
  const payload = n.payload as Record<string, unknown>;
  switch (n.type) {
    case 'new_message':
      return String(payload.preview || 'New message');
    case 'wishlist_item_sold':
      return `${String(payload.listing_title || 'A wishlisted item')} has been sold`;
    default:
      return 'New notification';
  }
}

export default function NotificationBell({
  notifications,
  onMarkAllRead,
  onNotificationClick,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Format time-ago string
  const formatTimeAgo = (createdAt: string): string => {
    const now = new Date();
    const then = new Date(createdAt);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleNotificationClick = (n: Notification) => {
    onNotificationClick(n);
    setIsOpen(false);
  };

  const visibleNotifications = notifications.slice(0, 10);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-[var(--color-text-on-primary)] p-1 hover:opacity-80 transition-opacity"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto border"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          {/* Header */}
          <div
            className="sticky top-0 border-b p-3 flex items-center justify-between"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-xs font-semibold hover:opacity-80"
                style={{ color: 'var(--color-primary)' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="divide-y divide-[var(--color-border)]">
            {visibleNotifications.length === 0 ? (
              <div className="p-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                No notifications yet
              </div>
            ) : (
              visibleNotifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  className="w-full text-left p-3 hover:bg-[var(--color-surface-alt)] transition-colors flex items-start gap-3"
                >
                  {/* Unread indicator */}
                  {!n.is_read && (
                    <div className="mt-1.5 h-2 w-2 rounded-full shrink-0 bg-[var(--color-primary)]" />
                  )}
                  {n.is_read && <div className="mt-1.5 h-2 w-2 shrink-0" />}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                      {getNotificationLabel(n)}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      {formatTimeAgo(n.created_at)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
