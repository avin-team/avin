import { Badge } from "@avin/ui/components/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@avin/ui/components/popover";
import { cn } from "@avin/ui/lib/utils";
import {
  BellIcon,
  CaretRightIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { authClient } from "@/features/auth/api/auth-client";

import {
  useNotificationActions,
  useNotifications,
  useNotificationUnreadCount,
} from "../api/notifications-api";

const RECENT_NOTIFICATION_LIMIT = 3;

export const NotificationButton = () => {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const isAuthenticated = Boolean(session);
  const unreadQuery = useNotificationUnreadCount(isAuthenticated);
  const notificationsQuery = useNotifications({ enabled: isAuthenticated });
  const { markAllRead, markRead } = useNotificationActions();

  if (isSessionPending || !isAuthenticated) {
    return null;
  }

  const unreadCount = unreadQuery.data ?? 0;
  const recentNotifications = (notificationsQuery.data?.items ?? []).slice(
    0,
    RECENT_NOTIFICATION_LIMIT
  );

  return (
    <Popover>
      <PopoverTrigger
        aria-label={
          unreadCount > 0
            ? `Thông báo, ${unreadCount} thông báo chưa đọc`
            : "Thông báo"
        }
        className="relative inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <BellIcon className="size-5.5" />
        {unreadCount > 0 ? (
          <Badge
            aria-hidden="true"
            className="pointer-events-none absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full bg-primary px-1 text-[10px] leading-none text-primary-foreground"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 gap-0 overflow-hidden p-0">
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">Thông báo</h2>
            <p
              className={cn(
                "text-xs font-medium",
                unreadCount > 0
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              )}
            >
              {unreadCount > 0
                ? `${unreadCount} chưa đọc`
                : "Bạn đã đọc hết thông báo"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {unreadCount > 0 ? (
              <button
                aria-label="Đánh dấu tất cả thông báo đã đọc"
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                disabled={markAllRead.isPending}
                onClick={() => markAllRead.mutate({})}
                type="button"
              >
                <CheckCircleIcon className="size-4" />
              </button>
            ) : null}
            <Link
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              to="/notifications"
            >
              Xem tất cả
              <CaretRightIcon className="size-3" />
            </Link>
          </div>
        </div>
        <div className="space-y-1 p-2">
          {notificationsQuery.isPending ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Đang tải thông báo…
            </p>
          ) : null}
          {notificationsQuery.isPending === false &&
          recentNotifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Chưa có thông báo nào.
            </p>
          ) : null}
          {recentNotifications.map((notification) => (
            <a
              className={cn(
                "block rounded-2xl p-3 transition-colors hover:bg-muted",
                notification.readAt ? "" : "bg-muted/50"
              )}
              href={notification.deepLink}
              key={notification.id}
              onClick={() => {
                if (!notification.readAt) {
                  markRead.mutate({ notificationId: notification.id });
                }
              }}
            >
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {notification.title}
                </p>
                {notification.readAt ? null : (
                  <span className="size-2 shrink-0 rounded-full bg-primary" />
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {notification.body}
              </p>
            </a>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
