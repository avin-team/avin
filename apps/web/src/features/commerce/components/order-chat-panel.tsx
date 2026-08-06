/* eslint-disable react-doctor/effect-needs-cleanup */

import type { OrderItemStatus } from "@avin/api/commerce/orders";
import { ORDER_CHAT_ATTACHMENT_UPLOAD_ROUTE } from "@avin/api/storage";
import { env } from "@avin/env/web";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@avin/ui/components/avatar";
import { Badge } from "@avin/ui/components/badge";
import { Bubble, BubbleContent } from "@avin/ui/components/bubble";
import { Button } from "@avin/ui/components/button";
import { Input } from "@avin/ui/components/input";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
} from "@avin/ui/components/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@avin/ui/components/message-scroller";
import { cn } from "@avin/ui/lib/utils";
import { useUploadFiles } from "@better-upload/client";
import {
  ArrowUpRightIcon,
  PaperclipIcon,
  PaperPlaneRightIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import * as React from "react";
import { toast } from "sonner";

import {
  getOrderItemStatusColorClassName,
  getOrderItemStatusLabel,
} from "@/features/commerce/order-status";
import { orpc } from "@/utils/orpc";
import { supabasePublic } from "@/utils/supabase";

interface OrderChatPanelProps {
  heightClass?: string;
  orderId: string;
  orderStatus?: string;
  participantLabel?: string;
  sellerImage?: string | null;
  sellerName: string;
  sellerStoreSlug?: string | null;
  serviceTitle?: string;
  showOrderHeaderLink?: boolean;
}

interface AttachmentDraft {
  id: string;
  name: string;
}

const TYPING_BROADCAST_INTERVAL_MS = 500;
const TYPING_INDICATOR_TIMEOUT_MS = 1500;
const REALTIME_TOKEN_REFRESH_BUFFER_MS = 30_000;

const getBubbleVariant = (
  senderRole: string
): "default" | "destructive" | "muted" => {
  if (senderRole === "buyer") {
    return "default";
  }
  if (senderRole === "admin") {
    return "destructive";
  }
  return "muted";
};

interface OrderChatHeaderProps {
  isOtherParticipantPresent: boolean;
  isOtherTyping?: boolean;
  orderId: string;
  orderStatus?: string;
  participantLabel: string;
  sellerImage?: string | null;
  sellerName: string;
  sellerStoreSlug?: string | null;
  serviceTitle?: string;
  showOrderHeaderLink: boolean;
}

const renderHeaderStatus = (
  isOtherTyping: boolean,
  isOtherParticipantPresent: boolean,
  participantLabel: string
) => {
  if (isOtherTyping) {
    return (
      <>
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        <span className="font-medium text-emerald-600 dark:text-emerald-400">
          Đang nhập...
        </span>
      </>
    );
  }

  if (isOtherParticipantPresent) {
    return (
      <>
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        <span className="font-medium text-emerald-600 dark:text-emerald-400">
          Đang hoạt động
        </span>
      </>
    );
  }

  return (
    <>
      <span className="size-2 rounded-full bg-muted-foreground/30 shrink-0" />
      <span>{participantLabel}</span>
    </>
  );
};

const OrderChatHeader = ({
  isOtherParticipantPresent,
  isOtherTyping = false,
  orderId,
  orderStatus,
  participantLabel,
  sellerImage,
  sellerName,
  sellerStoreSlug,
  serviceTitle,
  showOrderHeaderLink,
}: OrderChatHeaderProps) => (
  <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border/60 bg-muted/30 shrink-0">
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="relative shrink-0">
        <Avatar size="sm" className="size-8 shrink-0 border border-border/50">
          {sellerImage ? (
            <AvatarImage src={sellerImage} alt={sellerName} />
          ) : null}
          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
            {sellerName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {isOtherParticipantPresent ? (
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background"
          />
        ) : null}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {sellerStoreSlug ? (
            <Link
              to="/store/$slug"
              params={{ slug: sellerStoreSlug }}
              className="text-xs font-semibold text-foreground truncate hover:text-primary hover:underline"
            >
              {sellerName}
            </Link>
          ) : (
            <p className="text-xs font-semibold text-foreground truncate">
              {sellerName}
            </p>
          )}
          {serviceTitle ? (
            <>
              <span className="text-muted-foreground text-[10px]">•</span>
              <span className="text-xs text-muted-foreground truncate">
                {serviceTitle}
              </span>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5 shrink-0">
            {renderHeaderStatus(
              isOtherTyping,
              isOtherParticipantPresent,
              participantLabel
            )}
          </div>
          {orderStatus ? (
            <Badge
              className={cn(
                "text-[9px] px-1.5 py-0 font-normal shrink-0",
                getOrderItemStatusColorClassName(orderStatus as OrderItemStatus)
              )}
              variant="outline"
            >
              {getOrderItemStatusLabel(orderStatus as OrderItemStatus)}
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
    {showOrderHeaderLink ? (
      <Link
        className="shrink-0 whitespace-nowrap text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        params={{ id: orderId }}
        to="/orders/$id"
      >
        <span>Xem đơn hàng</span>
        <ArrowUpRightIcon className="size-3 shrink-0" />
      </Link>
    ) : null}
  </div>
);

export const OrderChatPanel = ({
  heightClass = "h-110",
  orderId,
  orderStatus,
  participantLabel = "Người bán",
  sellerImage,
  sellerName,
  sellerStoreSlug,
  serviceTitle,
  showOrderHeaderLink = false,
}: OrderChatPanelProps) => {
  const attachmentInputRef = React.useRef<HTMLInputElement>(null);
  const channelRef = React.useRef<ReturnType<
    typeof supabasePublic.channel
  > | null>(null);
  const lastMessageIdRef = React.useRef<string | null>(null);
  const lastMarkedReadRef = React.useRef<string | null>(null);
  const messageListEndRef = React.useRef<HTMLDivElement>(null);
  const lastTypingBroadcastAtRef = React.useRef(0);
  const typingIndicatorTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [attachmentDrafts, setAttachmentDrafts] = React.useState<
    AttachmentDraft[]
  >([]);
  const [isOtherParticipantPresent, setIsOtherParticipantPresent] =
    React.useState(false);
  const [isOtherTyping, setIsOtherTyping] = React.useState(false);
  const [isNewestMessageVisible, setIsNewestMessageVisible] =
    React.useState(false);
  const [inputText, setInputText] = React.useState("");
  const queryClient = useQueryClient();

  const { mutate: markChatRead } = useMutation(
    orpc.commerce.chat.markRead.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: orpc.commerce.chat.listConversations.queryKey(),
        });
      },
    })
  );

  const messagesQueryOptions = React.useMemo(
    () =>
      orpc.commerce.chat.listMessages.queryOptions({
        input: { orderId },
      }),
    [orderId]
  );
  const messagesQuery = useQuery(messagesQueryOptions);
  const rawMessages = messagesQuery.data?.messages;
  const latestMessageId = rawMessages?.[0]?.id;

  React.useEffect(() => {
    lastMessageIdRef.current = latestMessageId ?? null;
    if (!latestMessageId || !isNewestMessageVisible) {
      return;
    }

    const readCursorKey = `${orderId}:${latestMessageId}`;
    if (lastMarkedReadRef.current === readCursorKey) {
      return;
    }

    lastMarkedReadRef.current = readCursorKey;
    markChatRead({
      messageId: latestMessageId,
      orderId,
    });
  }, [isNewestMessageVisible, latestMessageId, markChatRead, orderId]);

  React.useLayoutEffect(() => {
    if (typeof messageListEndRef.current?.scrollIntoView === "function") {
      messageListEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [latestMessageId]);

  React.useEffect(() => {
    const messageListEnd = messageListEndRef.current;
    if (!(latestMessageId && messageListEnd)) {
      setIsNewestMessageVisible(false);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIsNewestMessageVisible(entry?.isIntersecting === true);
    });
    observer.observe(messageListEnd);

    return () => observer.disconnect();
  }, [latestMessageId]);

  const sendMessageMutation = useMutation(
    orpc.commerce.chat.sendMessage.mutationOptions({
      onError: (err) => {
        toast.error(err.message || "Không thể gửi tin nhắn");
      },
      onSuccess: () => {
        setInputText("");
        setAttachmentDrafts([]);
        void messagesQuery.refetch();
      },
    })
  );
  const createAttachmentMutation = useMutation(
    orpc.commerce.chat.createAttachment.mutationOptions()
  );
  const attachmentUrlMutation = useMutation(
    orpc.commerce.chat.getAttachmentUrl.mutationOptions()
  );
  const realtimeTokenQuery = useQuery(
    orpc.commerce.chat.getRealtimeToken.queryOptions({ input: { orderId } })
  );
  const { data: realtimeToken, refetch: refetchRealtimeToken } =
    realtimeTokenQuery;
  const attachmentUpload = useUploadFiles({
    api: `${env.VITE_SERVER_URL}/api/order-chat-upload`,
    credentials: "include",
    route: ORDER_CHAT_ATTACHMENT_UPLOAD_ROUTE,
  });

  const broadcastTyping = React.useCallback((typing: boolean) => {
    const now = Date.now();
    if (
      typing &&
      now - lastTypingBroadcastAtRef.current < TYPING_BROADCAST_INTERVAL_MS
    ) {
      return;
    }

    lastTypingBroadcastAtRef.current = now;
    void channelRef.current?.send({
      event: "typing",
      payload: { typing },
      type: "broadcast",
    });
  }, []);

  React.useEffect(() => {
    const accessToken = realtimeToken?.accessToken;
    const channelName = realtimeToken?.channel;
    if (!accessToken || !channelName) {
      return;
    }

    supabasePublic.realtime.setAuth(accessToken);
    const channel = supabasePublic
      .channel(channelName, { config: { private: true } })
      .on("broadcast", { event: "new_message" }, () => {
        void queryClient.invalidateQueries({
          queryKey: messagesQueryOptions.queryKey,
        });
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        setIsOtherTyping(Boolean(payload.payload.typing));
        if (typingIndicatorTimeoutRef.current) {
          clearTimeout(typingIndicatorTimeoutRef.current);
        }
        if (payload.payload.typing) {
          typingIndicatorTimeoutRef.current = setTimeout(() => {
            setIsOtherTyping(false);
          }, TYPING_INDICATOR_TIMEOUT_MS);
        }
      })
      .on("presence", { event: "sync" }, () => {
        const participants = Object.keys(channel.presenceState());
        setIsOtherParticipantPresent(participants.length > 1);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ typing: false });
          const after = lastMessageIdRef.current;
          if (after) {
            void (async () => {
              await queryClient.fetchQuery(
                orpc.commerce.chat.getAfter.queryOptions({
                  input: { after, orderId },
                })
              );
              await queryClient.invalidateQueries({
                queryKey: messagesQueryOptions.queryKey,
              });
            })();
            return;
          }
          void queryClient.invalidateQueries({
            queryKey: messagesQueryOptions.queryKey,
          });
        }
      });
    channelRef.current = channel;

    return () => {
      broadcastTyping(false);
      if (typingIndicatorTimeoutRef.current) {
        clearTimeout(typingIndicatorTimeoutRef.current);
      }
      channelRef.current = null;
      setIsOtherTyping(false);
      setIsOtherParticipantPresent(false);
      void supabasePublic.removeChannel(channel);
    };
  }, [
    broadcastTyping,
    orderId,
    queryClient,
    messagesQueryOptions.queryKey,
    realtimeToken?.accessToken,
    realtimeToken?.channel,
  ]);

  React.useEffect(() => {
    const expiresInSeconds = realtimeToken?.expiresInSeconds;
    if (!expiresInSeconds) {
      return;
    }

    const refreshDelayMs = Math.max(
      expiresInSeconds * 1000 - REALTIME_TOKEN_REFRESH_BUFFER_MS,
      0
    );
    const refreshTimer = setTimeout(() => {
      void refetchRealtimeToken();
    }, refreshDelayMs);
    return () => clearTimeout(refreshTimer);
  }, [realtimeToken?.expiresInSeconds, refetchRealtimeToken]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputText.trim();
    if (!content && attachmentDrafts.length === 0) {
      return;
    }

    broadcastTyping(false);
    sendMessageMutation.mutate({
      attachmentFileIds: attachmentDrafts.map((attachment) => attachment.id),
      content,
      orderId,
    });
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setInputText(nextValue);
    broadcastTyping(Boolean(nextValue.trim()));
  };

  const handleFilesSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length === 0) {
      return;
    }

    try {
      const result = await attachmentUpload.uploadAsync(files, {
        metadata: { orderId },
      });
      const attachments = await Promise.all(
        result.files.map(async (uploadedFile) => {
          const attachment = await createAttachmentMutation.mutateAsync({
            byteSize: uploadedFile.raw.size,
            contentType: uploadedFile.raw.type || "application/octet-stream",
            fileName: uploadedFile.raw.name,
            orderId,
            storageKey: uploadedFile.objectInfo.key,
          });
          return { id: attachment.id, name: uploadedFile.raw.name };
        })
      );
      setAttachmentDrafts((currentAttachments) => [
        ...currentAttachments,
        ...attachments,
      ]);
      if (result.failedFiles.length > 0) {
        toast.error("Một số tệp đính kèm chưa tải lên được");
      }
    } catch {
      toast.error("Không thể tải tệp đính kèm lên");
    }
  };

  const handleAttachmentOpen = async (attachmentId: string): Promise<void> => {
    try {
      const { url } = await attachmentUrlMutation.mutateAsync({ attachmentId });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Không thể mở tệp đính kèm");
    }
  };

  const displayMessages = React.useMemo(() => {
    if (!rawMessages) {
      return [];
    }
    return [...rawMessages].toReversed();
  }, [rawMessages]);

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs",
        heightClass
      )}
    >
      <OrderChatHeader
        isOtherParticipantPresent={isOtherParticipantPresent}
        isOtherTyping={isOtherTyping}
        orderId={orderId}
        orderStatus={orderStatus}
        participantLabel={participantLabel}
        sellerImage={sellerImage}
        sellerName={sellerName}
        sellerStoreSlug={sellerStoreSlug}
        serviceTitle={serviceTitle}
        showOrderHeaderLink={showOrderHeaderLink}
      />

      <MessageScrollerProvider>
        <MessageScroller className="flex-1 min-h-0">
          <MessageScrollerViewport className="px-4 py-3">
            <MessageScrollerContent className="gap-3">
              {displayMessages.length === 0 && !messagesQuery.isPending && (
                <MessageScrollerItem className="flex justify-center py-4">
                  <span className="text-[10px] text-muted-foreground bg-muted/60 border border-border/50 rounded-full px-3 py-1">
                    Bắt đầu trò chuyện với người bán cho đơn hàng này.
                  </span>
                </MessageScrollerItem>
              )}

              {displayMessages.map((msg) => {
                if (msg.type === "system") {
                  return (
                    <MessageScrollerItem
                      key={msg.id}
                      className="flex justify-center"
                    >
                      <span className="text-[10px] text-muted-foreground bg-muted/60 border border-border/50 rounded-full px-3 py-1">
                        {msg.content}
                      </span>
                    </MessageScrollerItem>
                  );
                }

                const isBuyer = msg.senderRole === "buyer";

                return (
                  <MessageScrollerItem key={msg.id}>
                    <Message align={isBuyer ? "end" : "start"}>
                      {!isBuyer && (
                        <MessageAvatar>
                          <Avatar size="sm" className="size-7">
                            <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                              {msg.senderRole === "admin"
                                ? "AD"
                                : sellerName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </MessageAvatar>
                      )}
                      <MessageContent>
                        <Bubble
                          variant={getBubbleVariant(msg.senderRole)}
                          align={isBuyer ? "end" : "start"}
                        >
                          <BubbleContent>{msg.content}</BubbleContent>
                        </Bubble>
                        {msg.attachments.length > 0 && (
                          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                            {msg.attachments.map((attachment) => (
                              <li key={attachment.id}>
                                <button
                                  className="hover:underline"
                                  onClick={() =>
                                    void handleAttachmentOpen(attachment.id)
                                  }
                                  type="button"
                                >
                                  {attachment.fileName}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <MessageFooter className="text-[10px] text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </MessageFooter>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                );
              })}
              {isOtherTyping && (
                <MessageScrollerItem className="flex justify-start">
                  <Message align="start">
                    <MessageAvatar>
                      <Avatar size="sm" className="size-7">
                        <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                          {sellerName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </MessageAvatar>
                    <MessageContent>
                      <div className="flex items-center gap-1 rounded-2xl bg-muted/60 border border-border/40 px-3 py-2 text-xs text-muted-foreground">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse [animation-delay:-0.3s]" />
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse [animation-delay:-0.15s]" />
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="ml-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          Đang nhập...
                        </span>
                      </div>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              )}
              <div className="h-px" ref={messageListEndRef} />
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton direction="end" />
        </MessageScroller>
      </MessageScrollerProvider>

      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 px-3 py-2.5 border-t border-border/60 bg-background/50 shrink-0"
      >
        <input
          aria-label="Chọn tệp đính kèm"
          className="sr-only"
          multiple
          onChange={handleFilesSelected}
          ref={attachmentInputRef}
          type="file"
        />
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label="Attach file"
          disabled={
            attachmentUpload.isPending || createAttachmentMutation.isPending
          }
          onClick={() => attachmentInputRef.current?.click()}
          className="shrink-0 text-muted-foreground"
        >
          <PaperclipIcon className="h-3.5 w-3.5" />
        </Button>
        <Input
          value={inputText}
          onChange={handleInputChange}
          onBlur={() => broadcastTyping(false)}
          placeholder="Nhắn tin với người bán..."
          disabled={sendMessageMutation.isPending}
          className="flex-1 h-8 text-xs bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
        />
        <Button
          type="submit"
          size="icon-xs"
          variant="ghost"
          aria-label="Send"
          disabled={
            sendMessageMutation.isPending ||
            (!inputText.trim() && attachmentDrafts.length === 0)
          }
          className="shrink-0 text-primary hover:bg-primary/10"
        >
          <PaperPlaneRightIcon className="h-3.5 w-3.5" />
        </Button>
      </form>
      {attachmentDrafts.length > 0 && (
        <p className="px-3 pb-2 text-xs text-muted-foreground">
          Đính kèm:{" "}
          {attachmentDrafts.map((attachment) => attachment.name).join(", ")}
        </p>
      )}
    </div>
  );
};
