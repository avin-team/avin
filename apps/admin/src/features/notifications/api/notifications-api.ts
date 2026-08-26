import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export const ADMIN_NOTIFICATION_PAGE_SIZE = 50;
export const ADMIN_NOTIFICATION_UNREAD_REFETCH_INTERVAL_MS = 60_000;

export const useAdminNotifications = ({
  cursor,
  enabled = true,
  limit = ADMIN_NOTIFICATION_PAGE_SIZE,
  unreadOnly,
}: {
  cursor?: string;
  enabled?: boolean;
  limit?: number;
  unreadOnly?: boolean;
} = {}) =>
  useQuery({
    ...orpc.notifications.list.queryOptions({
      input: {
        cursor,
        limit,
        unreadOnly,
      },
    }),
    enabled,
  });

export const useAdminNotificationUnreadCount = (enabled = true) =>
  useQuery({
    ...orpc.notifications.unreadCount.queryOptions(),
    enabled,
    refetchInterval: ADMIN_NOTIFICATION_UNREAD_REFETCH_INTERVAL_MS,
  });

export const useAdminNotificationActions = () => {
  const queryClient = useQueryClient();
  const invalidate = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: orpc.notifications.list.queryOptions().queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.notifications.unreadCount.queryOptions().queryKey,
      }),
    ]);
  };
  return {
    markAllRead: useMutation({
      ...orpc.notifications.markAllRead.mutationOptions(),
      onSuccess: invalidate,
    }),
    markRead: useMutation({
      ...orpc.notifications.markRead.mutationOptions(),
      onSuccess: invalidate,
    }),
  };
};
