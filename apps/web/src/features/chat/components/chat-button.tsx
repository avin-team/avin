import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import { ChatCircleDotsIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

export const ChatButton = () => {
  const unreadCount = 2;

  return (
    <Button
      aria-label={
        unreadCount > 0 ? `Tin nhắn, ${unreadCount} tin nhắn mới` : "Tin nhắn"
      }
      className="relative"
      render={<Link to="/chat" />}
      size="icon"
      variant="ghost"
    >
      <ChatCircleDotsIcon className="size-5.5" />
      {unreadCount > 0 ? (
        <Badge
          aria-hidden="true"
          className="pointer-events-none absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px] leading-none bg-primary text-primary-foreground"
          variant="default"
        >
          {unreadCount}
        </Badge>
      ) : null}
    </Button>
  );
};
