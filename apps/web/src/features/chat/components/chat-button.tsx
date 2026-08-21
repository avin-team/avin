import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@avin/ui/components/avatar";
import { Badge } from "@avin/ui/components/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@avin/ui/components/popover";
import { cn } from "@avin/ui/lib/utils";
import { ChatCircleDotsIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import * as React from "react";

import { useSession } from "@/features/auth/api/session-query";
import { orpc } from "@/utils/orpc";
import { supabasePublic } from "@/utils/supabase";

const REALTIME_TOKEN_REFRESH_BUFFER_MS = 30_000;
const RECENT_CONVERSATION_LIMIT = 3;

export const ChatButton = () => {
  const { data: session, isPending: isSessionPending } = useSession();
  const isAuthenticated = Boolean(session);

  const queryClient = useQueryClient();
  const notificationSummaryQuery = useQuery({
    ...orpc.commerce.chat.getNotificationSummary.queryOptions(),
    enabled: isAuthenticated,
  });
  const notificationTokenQuery = useQuery({
    ...orpc.commerce.chat.getNotificationRealtimeToken.queryOptions(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
  const { refetch: refetchNotificationToken } = notificationTokenQuery;
  const conversations = notificationSummaryQuery.data?.conversations ?? [];
  const unreadCount = notificationSummaryQuery.data?.unreadCount ?? 0;
  const recentConversations = [...conversations]
    .toSorted((left, right) => {
      const leftTime = left.lastMessage?.createdAt ?? left.createdAt;
      const rightTime = right.lastMessage?.createdAt ?? right.createdAt;
      return new Date(rightTime).getTime() - new Date(leftTime).getTime();
    })
    .slice(0, RECENT_CONVERSATION_LIMIT);
  const notificationToken = notificationTokenQuery.data;

  React.useEffect(() => {
    const accessToken = notificationToken?.accessToken;
    const channelName = notificationToken?.channel;
    if (!accessToken || !channelName) {
      return;
    }

    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    supabasePublic.realtime.setAuth(accessToken);
    const channel = supabasePublic
      .channel(channelName, { config: { private: true } })
      .on("broadcast", { event: "new_message" }, () => {
        void queryClient.invalidateQueries({
          queryKey: orpc.commerce.chat.getNotificationSummary.queryKey(),
        });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void queryClient.invalidateQueries({
            queryKey: orpc.commerce.chat.getNotificationSummary.queryKey(),
          });
          return;
        }
        if (
          (status === "CHANNEL_ERROR" || status === "TIMED_OUT") &&
          !retryTimeout
        ) {
          retryTimeout = setTimeout(() => {
            void refetchNotificationToken();
          }, 10_000);
        }
      });

    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      void channel.unsubscribe();
      void supabasePublic.removeChannel(channel);
    };
  }, [
    notificationToken?.accessToken,
    notificationToken?.channel,
    queryClient,
    refetchNotificationToken,
  ]);

  React.useEffect(() => {
    const expiresInSeconds = notificationToken?.expiresInSeconds;
    if (!expiresInSeconds || !notificationToken?.accessToken) {
      return;
    }

    const refreshTimer = setTimeout(
      () => {
        void refetchNotificationToken();
      },
      Math.max(expiresInSeconds * 1000 - REALTIME_TOKEN_REFRESH_BUFFER_MS, 0)
    );

    return () => clearTimeout(refreshTimer);
  }, [
    notificationToken?.accessToken,
    notificationToken?.expiresInSeconds,
    refetchNotificationToken,
  ]);

  if (isSessionPending || !isAuthenticated) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger
        aria-label={
          unreadCount > 0 ? `Tin nhắn, ${unreadCount} tin nhắn mới` : "Tin nhắn"
        }
        className="relative inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChatCircleDotsIcon className="size-5.5" />
        {unreadCount > 0 ? (
          <Badge
            aria-hidden="true"
            className="pointer-events-none absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full bg-primary px-1 text-[10px] leading-none text-primary-foreground"
            variant="default"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 gap-0 overflow-hidden p-0">
        <div className="flex items-start justify-between border-b border-border/60 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">Tin nhắn</h2>
            <p
              className={cn(
                "text-xs font-medium",
                unreadCount > 0
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              )}
            >
              {unreadCount} chưa đọc
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            to="/chat"
          >
            Xem tất cả
            <CaretRightIcon className="size-3" />
          </Link>
        </div>
        <div className="space-y-1 p-2">
          {recentConversations.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Chưa có cuộc trò chuyện nào.
            </p>
          ) : (
            recentConversations.map((conversation) => (
              <Link
                className="flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-muted"
                key={conversation.orderId}
                search={{ orderId: conversation.orderId }}
                to="/chat"
              >
                <Avatar className="size-10 shrink-0">
                  {conversation.participant.image ? (
                    <AvatarImage
                      alt={conversation.participant.name}
                      src={conversation.participant.image}
                    />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                    {conversation.participant.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">
                      {conversation.service.title}
                    </p>
                    {conversation.unreadCount > 0 ? (
                      <span className="size-2 shrink-0 rounded-full bg-primary" />
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {conversation.participant.name} ·{" "}
                    {conversation.lastMessage?.content ?? "Chưa có tin nhắn"}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
