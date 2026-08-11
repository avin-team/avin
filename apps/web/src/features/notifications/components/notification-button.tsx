import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import { BellIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { authClient } from "@/features/auth/api/auth-client";

import { useNotificationUnreadCount } from "../api/notifications-api";

export const NotificationButton = () => {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const isAuthenticated = Boolean(session);
  const unreadQuery = useNotificationUnreadCount(isAuthenticated);

  if (isSessionPending || !isAuthenticated) {
    return null;
  }

  const unreadCount = unreadQuery.data ?? 0;
  return (
    <Button
      aria-label={
        unreadCount > 0
          ? `Thông báo, ${unreadCount} thông báo chưa đọc`
          : "Thông báo"
      }
      className="relative text-muted-foreground hover:text-foreground"
      render={<Link to="/notifications" />}
      size="icon"
      title="Thông báo"
      variant="ghost"
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
    </Button>
  );
};
