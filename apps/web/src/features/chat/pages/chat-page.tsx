import type { OrderItemStatus } from "@avin/api/commerce/orders";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@avin/ui/components/avatar";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import { Input } from "@avin/ui/components/input";
import { cn } from "@avin/ui/lib/utils";
import {
  ArrowLeftIcon,
  ChatTeardropTextIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import * as React from "react";

import { OrderChatPanel } from "@/features/commerce/components/order-chat-panel";
import {
  getOrderItemStatusColorClassName,
  getOrderItemStatusLabel,
} from "@/features/commerce/order-status";
import { orpc } from "@/utils/orpc";

type FilterTab = "all" | "active" | "completed";

export const ChatPage = () => {
  const { orderId: orderIdFromSearch } = useSearch({
    from: "/_authenticated/chat",
  });
  const conversationsQuery = useQuery(
    orpc.commerce.chat.listConversations.queryOptions()
  );
  const [searchTerm, setSearchTerm] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<FilterTab>("all");
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(
    orderIdFromSearch ?? null
  );

  const rawConversations = conversationsQuery.data;

  const filteredConversations = React.useMemo(
    () =>
      (rawConversations ?? []).filter((conversation) => {
        const matchesSearch =
          conversation.participant.name
            .toLocaleLowerCase()
            .includes(searchTerm.toLocaleLowerCase()) ||
          conversation.service.title
            .toLocaleLowerCase()
            .includes(searchTerm.toLocaleLowerCase());

        if (!matchesSearch) {
          return false;
        }

        if (activeTab === "active") {
          return (
            conversation.orderStatus !== "CLOSED" &&
            conversation.orderStatus !== "CANCELLED" &&
            conversation.orderStatus !== "REFUNDED"
          );
        }
        if (activeTab === "completed") {
          return conversation.orderStatus === "CLOSED";
        }

        return true;
      }),
    [rawConversations, searchTerm, activeTab]
  );

  const selectedConversation = selectedOrderId
    ? (rawConversations ?? []).find(
        (conversation) => conversation.orderId === selectedOrderId
      )
    : null;

  return (
    <div className="fixed inset-0 top-16 flex bg-background text-foreground">
      <div className="flex h-full w-full overflow-hidden px-4 py-4 sm:gap-4 sm:px-6">
        <aside
          className={cn(
            "flex w-full shrink-0 flex-col gap-3 sm:w-80 border-r border-border/40 pr-0 sm:pr-4",
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
              className="h-9 pl-8 text-xs"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm theo người hoặc tên dịch vụ..."
              value={searchTerm}
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1 text-xs">
            <button
              className={cn(
                "flex-1 rounded-md px-2.5 py-1 font-medium transition-colors",
                activeTab === "all"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("all")}
              type="button"
            >
              Tất cả
            </button>
            <button
              className={cn(
                "flex-1 rounded-md px-2.5 py-1 font-medium transition-colors",
                activeTab === "active"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("active")}
              type="button"
            >
              Đang xử lý
            </button>
            <button
              className={cn(
                "flex-1 rounded-md px-2.5 py-1 font-medium transition-colors",
                activeTab === "completed"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("completed")}
              type="button"
            >
              Hoàn thành
            </button>
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
                Không tìm thấy cuộc trò chuyện nào.
              </p>
            ) : null}
            {filteredConversations.map((conversation) => {
              const isSelected =
                conversation.orderId === selectedConversation?.orderId;
              const dateStr = new Date(
                conversation.createdAt
              ).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });
              const showUnread = conversation.unreadCount > 0 && !isSelected;

              return (
                <button
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-accent/80",
                    isSelected && "bg-accent"
                  )}
                  key={conversation.orderId}
                  onClick={() => setSelectedOrderId(conversation.orderId)}
                  type="button"
                >
                  <div className="relative shrink-0">
                    <Avatar size="sm" className="size-10">
                      {conversation.participant.image ? (
                        <AvatarImage
                          alt={conversation.participant.name}
                          src={conversation.participant.image}
                        />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {conversation.participant.name
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {showUnread ? (
                      <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-xs">
                        {conversation.unreadCount > 9
                          ? "9+"
                          : conversation.unreadCount}
                      </span>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {conversation.service.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="truncate font-medium text-foreground/80">
                        {conversation.participant.name}
                      </span>
                      <span>•</span>
                      <span className="shrink-0">{dateStr}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <Badge
                        className={cn(
                          "text-[10px] px-1.5 py-0 font-normal shrink-0",
                          getOrderItemStatusColorClassName(
                            conversation.orderStatus as OrderItemStatus
                          )
                        )}
                        variant="outline"
                      >
                        {getOrderItemStatusLabel(
                          conversation.orderStatus as OrderItemStatus
                        )}
                      </Badge>
                      {conversation.lastMessage ? (
                        <span className="truncate text-[11px] text-muted-foreground">
                          {conversation.lastMessage.content ?? "Tệp đính kèm"}
                        </span>
                      ) : (
                        <span className="text-[11px] italic text-muted-foreground">
                          Chưa có tin nhắn
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <div
          className={cn(
            "min-w-0 flex-1",
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
                <span className="text-sm font-semibold truncate">
                  {selectedConversation.service.title}
                </span>
              </div>
              <OrderChatPanel
                heightClass="h-full"
                orderId={selectedConversation.orderId}
                orderStatus={selectedConversation.orderStatus}
                participantLabel={
                  selectedConversation.participantRole === "seller"
                    ? "Cửa hàng"
                    : "Người mua"
                }
                sellerImage={
                  (
                    selectedConversation.participant as {
                      avatarUrl?: string | null;
                      image: string | null;
                    }
                  ).avatarUrl ?? selectedConversation.participant.image
                }
                sellerName={
                  (
                    selectedConversation.participant as {
                      name: string;
                      storefrontName?: string | null;
                    }
                  ).storefrontName ?? selectedConversation.participant.name
                }
                sellerStoreSlug={
                  (
                    selectedConversation.participant as {
                      storeSlug?: string | null;
                    }
                  ).storeSlug
                }
                serviceTitle={selectedConversation.service.title}
                showOrderHeaderLink
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Chọn một cuộc trò chuyện để bắt đầu.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
