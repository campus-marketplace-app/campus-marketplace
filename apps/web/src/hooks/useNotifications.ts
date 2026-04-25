import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getNotifications } from '@campus-marketplace/backend';

/** 60-second stale time — realtime subscription handles live updates. */
const NOTIFICATIONS_STALE_TIME = 60 * 1000;

export const notificationKeys = {
  all: ['notifications'] as const,
  byUser: (userId: string) => ['notifications', 'byUser', userId] as const,
};

// Default page size — the bell only shows recent notifications, not the full history.
const DEFAULT_NOTIFICATIONS_LIMIT = 50;

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: notificationKeys.byUser(userId ?? ''),
    queryFn: () => getNotifications(userId!, DEFAULT_NOTIFICATIONS_LIMIT, 0),
    staleTime: NOTIFICATIONS_STALE_TIME,
    enabled: !!userId,
  });
}

export function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return {
    invalidate: (userId: string) =>
      queryClient.invalidateQueries({ queryKey: notificationKeys.byUser(userId) }),
  };
}
