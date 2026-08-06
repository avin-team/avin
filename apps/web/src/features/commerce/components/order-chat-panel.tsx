/* eslint-disable react-doctor/effect-needs-cleanup */

import { ORDER_CHAT_ATTACHMENT_UPLOAD_ROUTE } from "@avin/api/storage";
import { env } from "@avin/env/web";
import { Avatar, AvatarFallback } from "@avin/ui/components/avatar";
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
import { PaperPlaneRightIcon, PaperclipIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";
import { supabasePublic } from "@/utils/supabase";

interface OrderChatPanelProps {
  heightClass?: string;
  orderId: string;
  participantLabel?: string;
  sellerName: string;
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

export const OrderChatPanel = ({
  heightClass = "h-110",
  orderId,
  participantLabel = "Người bán",
  sellerName,
}: OrderChatPanelProps) => {
  const attachmentInputRef = React.useRef<HTMLInputElement>(null);
  const channelRef = React.useRef<ReturnType<
    typeof supabasePublic.channel
  > | null>(null);
  const lastMessageIdRef = React.useRef<string | null>(null);
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
  const [inputText, setInputText] = React.useState("");
  const queryClient = useQueryClient();

  const messagesQueryOptions = React.useMemo(
    () =>
      orpc.commerce.chat.listMessages.queryOptions({
        input: { orderId },
      }),
    [orderId]
  );
  const messagesQuery = useQuery(messagesQueryOptions);
  const rawMessages = messagesQuery.data?.messages;

  React.useEffect(() => {
    lastMessageIdRef.current = rawMessages?.[0]?.id ?? null;
  }, [rawMessages]);

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
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/60 bg-muted/30 shrink-0">
        <Avatar size="sm" className="size-7">
          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
            {sellerName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-xs font-semibold text-foreground">{sellerName}</p>
          <p className="text-[10px] text-muted-foreground">
            {isOtherParticipantPresent ? "Đang hoạt động" : participantLabel}
          </p>
        </div>
      </div>

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
      {isOtherTyping && (
        <p className="px-3 pb-2 text-xs text-muted-foreground">
          Người tham gia khác đang nhập…
        </p>
      )}
    </div>
  );
};
