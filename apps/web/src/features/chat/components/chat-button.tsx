import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import { ChatIcon } from "@phosphor-icons/react";
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
      <ChatIcon className="h-5 w-5" />
      {unreadCount > 0 ? (
        <Badge
          aria-hidden="true"
          className="pointer-events-none absolute -top-1.5 -right-1.5 min-w-5 justify-center px-1 text-[10px] leading-none bg-primary text-primary-foreground"
          variant="default"
        >
          {unreadCount}
        </Badge>
      ) : null}
    </Button>
  );
};
