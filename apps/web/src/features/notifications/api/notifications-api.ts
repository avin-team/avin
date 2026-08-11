import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@/utils/orpc";

export const NOTIFICATION_PAGE_SIZE = 50;
export const NOTIFICATION_UNREAD_REFETCH_INTERVAL_MS = 60_000;

export const useNotifications = ({
  cursor,
  unreadOnly,
}: { cursor?: string; unreadOnly?: boolean } = {}) =>
  useQuery(
    orpc.notifications.list.queryOptions({
      input: { cursor, limit: NOTIFICATION_PAGE_SIZE, unreadOnly },
    })
  );

export const useNotificationUnreadCount = (enabled: boolean) =>
  useQuery({
    ...orpc.notifications.unreadCount.queryOptions(),
    enabled,
    refetchInterval: NOTIFICATION_UNREAD_REFETCH_INTERVAL_MS,
  });

export const useNotificationActions = () => {
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

  const markRead = useMutation({
    ...orpc.notifications.markRead.mutationOptions(),
    onSuccess: invalidate,
  });
  const markAllRead = useMutation({
    ...orpc.notifications.markAllRead.mutationOptions(),
    onSuccess: invalidate,
  });

  return { markAllRead, markRead };
};
