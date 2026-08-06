import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@avin/ui/components/avatar";
import { Button } from "@avin/ui/components/button";
import { Input } from "@avin/ui/components/input";
import { cn } from "@avin/ui/lib/utils";
import {
  ArrowLeftIcon,
  ChatTeardropTextIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { OrderChatPanel } from "@/features/commerce/components/order-chat-panel";
import { orpc } from "@/utils/orpc";

export const ChatPage = () => {
  const conversationsQuery = useQuery(
    orpc.commerce.chat.listConversations.queryOptions()
  );
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(
    null
  );

  const conversations = conversationsQuery.data ?? [];
  const filteredConversations = conversations.filter((conversation) =>
    conversation.participant.name
      .toLocaleLowerCase()
      .includes(searchTerm.toLocaleLowerCase())
  );
  const selectedConversation = selectedOrderId
    ? conversations.find(
        (conversation) => conversation.orderId === selectedOrderId
      )
    : null;

  return (
    <div className="fixed inset-0 top-16 flex bg-background text-foreground">
      <div className="flex h-full w-full overflow-hidden px-4 py-4 sm:gap-4 sm:px-6">
        <aside
          className={cn(
            "flex w-full shrink-0 flex-col gap-3 sm:w-72",
            selectedConversation ? "hidden sm:flex" : "flex"
          )}
        >
          <div className="flex items-center gap-2">
            <ChatTeardropTextIcon className="size-5 text-primary" />
            <h1 className="text-xl font-bold">Tin nhắn</h1>
          </div>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-8"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm người mua hoặc người bán..."
              value={searchTerm}
            />
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto">
            {conversationsQuery.isPending ? (
              <p className="p-3 text-sm text-muted-foreground">
                Đang tải tin nhắn...
              </p>
            ) : null}
            {!conversationsQuery.isPending &&
            filteredConversations.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                Chưa có cuộc trò chuyện theo đơn hàng.
              </p>
            ) : null}
            {filteredConversations.map((conversation) => {
              const isSelected =
                conversation.orderId === selectedConversation?.orderId;
              return (
                <button
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-accent",
                    isSelected && "bg-accent"
                  )}
                  key={conversation.orderId}
                  onClick={() => setSelectedOrderId(conversation.orderId)}
                  type="button"
                >
                  <Avatar size="sm" className="size-9">
                    {conversation.participant.image ? (
                      <AvatarImage
                        alt={conversation.participant.name}
                        src={conversation.participant.image}
                      />
                    ) : null}
                    <AvatarFallback>
                      {conversation.participant.name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {conversation.participant.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      Đơn hàng ·{" "}
                      {conversation.participantRole === "seller"
                        ? "Người bán"
                        : "Người mua"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div
          className={cn(
            "min-w-0 flex-1 sm:border-l sm:border-border sm:pl-4",
            selectedConversation ? "flex" : "hidden sm:flex"
          )}
        >
          {selectedConversation ? (
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex items-center gap-2 sm:hidden">
                <Button
                  aria-label="Quay lại danh sách tin nhắn"
                  onClick={() => setSelectedOrderId(null)}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  <ArrowLeftIcon />
                </Button>
                <span className="text-sm font-semibold">
                  {selectedConversation.participant.name}
                </span>
              </div>
              <OrderChatPanel
                heightClass="h-full"
                orderId={selectedConversation.orderId}
                participantLabel={
                  selectedConversation.participantRole === "seller"
                    ? "Người bán"
                    : "Người mua"
                }
                sellerName={selectedConversation.participant.name}
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Chọn một đơn hàng để bắt đầu trò chuyện.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
