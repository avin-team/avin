/* eslint-disable react-doctor/effect-needs-cleanup */

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
import { PaperPlaneRight, Paperclip } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";
import { supabasePublic } from "@/utils/supabase";

interface OrderChatPanelProps {
  heightClass?: string;
  orderId: string;
  sellerName: string;
}

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
  heightClass = "h-[440px]",
  orderId,
  sellerName,
}: OrderChatPanelProps) => {
  const [inputText, setInputText] = React.useState("");
  const queryClient = useQueryClient();

  const messagesQuery = useQuery(
    orpc.commerce.chat.listMessages.queryOptions({
      input: { orderId },
    })
  );

  const sendMessageMutation = useMutation(
    orpc.commerce.chat.sendMessage.mutationOptions({
      onError: (err) => {
        toast.error(err.message || "Không thể gửi tin nhắn");
      },
      onSuccess: () => {
        setInputText("");
        void messagesQuery.refetch();
      },
    })
  );

  React.useEffect(() => {
    if (!orderId) {
      return;
    }

    const channel = supabasePublic
      .channel(`order:${orderId}`)
      .on("broadcast", { event: "new_message" }, () => {
        void queryClient.invalidateQueries({
          queryKey: [["commerce", "chat", "listMessages"]],
        });
      })
      .subscribe();

    return () => {
      void supabasePublic.removeChannel(channel);
    };
  }, [orderId, queryClient]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputText.trim();
    if (!content) {
      return;
    }

    sendMessageMutation.mutate({
      content,
      orderId,
    });
  };

  const rawMessages = messagesQuery.data?.messages;
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
          <p className="text-[10px] text-muted-foreground">Người bán</p>
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
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label="Attach file"
          className="shrink-0 text-muted-foreground"
        >
          <Paperclip className="h-3.5 w-3.5" />
        </Button>
        <Input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Nhắn tin với người bán..."
          disabled={sendMessageMutation.isPending}
          className="flex-1 h-8 text-xs bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
        />
        <Button
          type="submit"
          size="icon-xs"
          variant="ghost"
          aria-label="Send"
          disabled={sendMessageMutation.isPending || !inputText.trim()}
          className="shrink-0 text-primary hover:bg-primary/10"
        >
          <PaperPlaneRight className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
};
