import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export const ADMIN_NOTIFICATION_PAGE_SIZE = 50;

export const useAdminNotifications = ({
  cursor,
  unreadOnly,
}: { cursor?: string; unreadOnly?: boolean } = {}) =>
  useQuery(
    orpc.notifications.list.queryOptions({
      input: {
        cursor,
        limit: ADMIN_NOTIFICATION_PAGE_SIZE,
        unreadOnly,
      },
    })
  );

export const useAdminNotificationActions = () => {
  const queryClient = useQueryClient();
  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: orpc.notifications.list.queryOptions().queryKey,
    });
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
