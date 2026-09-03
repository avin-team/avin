import type { SellerOrderView } from "@avin/api/commerce/orders";
import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Input } from "@avin/ui/components/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@avin/ui/components/sheet";
import { Skeleton } from "@avin/ui/components/skeleton";
import {
  ArrowClockwiseIcon,
  CaretRightIcon,
  CheckCircleIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PaperPlaneRightIcon,
  PlayIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { OrderChatPanel } from "@/features/commerce/components/order-chat-panel";
import {
  formatOrderDeadline,
  getOrderItemStatusLabel,
  getOrderItemStatusVariant,
  getOrderItemStatusColorClassName,
} from "@/features/commerce/order-status";
import { SellerOrderItemCard } from "@/features/seller/components/seller-order-item-card";
import { formatVND } from "@/utils/format";
import { orpc } from "@/utils/orpc";

type OrderItemFlat = SellerOrderView["items"][number] & {
  buyer?: {
    email: string | null;
    id: string;
    image: string | null;
    name: string;
  };
  buyerId: string;
  orderCreatedAt: string;
  orderId: string;
};

type FilterTab =
  | "ALL"
  | "AWAITING_SELLER"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "COMPLETED"
  | "OTHER";

const matchesTabFilterHelper = (
  status: OrderItemFlat["status"],
  tab: FilterTab
): boolean => {
  if (tab === "ALL") {
    return true;
  }
  if (tab === "AWAITING_SELLER") {
    return status === "AWAITING_SELLER";
  }
  if (tab === "IN_PROGRESS") {
    return status === "IN_PROGRESS";
  }
  if (tab === "DELIVERED") {
    return status === "DELIVERED";
  }
  if (tab === "COMPLETED") {
    return status === "CLOSED" || status === "IN_WARRANTY";
  }
  if (tab === "OTHER") {
    return (
      status !== "AWAITING_SELLER" &&
      status !== "IN_PROGRESS" &&
      status !== "DELIVERED" &&
      status !== "CLOSED" &&
      status !== "IN_WARRANTY"
    );
  }
  return true;
};

const getListingTypeLabel = (type: string): string => {
  if (type === "SERVICE") {
    return "Dịch vụ";
  }
  if (type === "COURSE") {
    return "Khóa học";
  }
  return type;
};

const getEscrowStatusLabel = (status: string): string => {
  if (status === "HELD") {
    return "Đang tạm giữ";
  }
  if (status === "RELEASED") {
    return "Đã giải ngân";
  }
  if (status === "REFUNDED") {
    return "Đã hoàn tiền";
  }
  if (status === "CANCELLED") {
    return "Đã hủy";
  }
  return status;
};

const getBuyerLabel = (buyerId: string, buyerName?: string): string => {
  if (buyerName && buyerName.trim()) {
    return buyerName;
  }
  if (buyerId.startsWith("buyer-") || buyerId.startsWith("Buyer_")) {
    return buyerId.replace("buyer-", "Khách hàng ").replace("Buyer_", "Khách ");
  }
  return "Khách hàng";
};

const getProcessingDeadlineClass = (status: string): string => {
  if (status === "AWAITING_SELLER") {
    return "bg-amber-500/15 text-amber-400 border border-amber-500/30";
  }
  if (status === "IN_PROGRESS") {
    return "bg-blue-500/15 text-blue-400 border border-blue-500/30";
  }
  return "text-muted-foreground";
};

export const StoreOrdersPanel = () => {
  const ordersQuery = useQuery(
    orpc.commerce.orders.listMine.queryOptions({
      retry: false,
      throwOnError: false,
    })
  );

  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<OrderItemFlat | null>(null);

  const orders = ordersQuery.data ?? [];

  // Flatten all items for high-density operational view
  const allItems: OrderItemFlat[] = useMemo(
    () =>
      (ordersQuery.data ?? [])
        .flatMap((o) => {
          const buyerObj = (o as { buyer?: OrderItemFlat["buyer"] }).buyer;
          return o.items.map((i) => ({
            ...i,
            buyer: buyerObj,
            buyerId: o.buyerId,
            orderCreatedAt: o.createdAt,
            orderId: o.id,
          }));
        })
        .sort(
          (a, b) =>
            new Date(b.orderCreatedAt).getTime() -
            new Date(a.orderCreatedAt).getTime()
        ),
    [ordersQuery.data]
  );

  const filteredItems = useMemo(
    () =>
      allItems.filter((item) => {
        const query = searchTerm.toLowerCase().trim();
        const buyerName = item.buyer?.name ?? "";
        const buyerEmail = item.buyer?.email ?? "";
        const matchesSearch =
          !query ||
          item.listing.title.toLowerCase().includes(query) ||
          item.buyerId.toLowerCase().includes(query) ||
          buyerName.toLowerCase().includes(query) ||
          buyerEmail.toLowerCase().includes(query);

        if (!matchesSearch) {
          return false;
        }

        return matchesTabFilterHelper(item.status, activeTab);
      }),
    [allItems, searchTerm, activeTab]
  );

  const getTabCount = (tab: FilterTab) => {
    if (tab === "ALL") {
      return allItems.length;
    }
    if (tab === "AWAITING_SELLER") {
      return allItems.filter((i) => i.status === "AWAITING_SELLER").length;
    }
    if (tab === "IN_PROGRESS") {
      return allItems.filter((i) => i.status === "IN_PROGRESS").length;
    }
    if (tab === "DELIVERED") {
      return allItems.filter((i) => i.status === "DELIVERED").length;
    }
    if (tab === "COMPLETED") {
      return allItems.filter(
        (i) => i.status === "CLOSED" || i.status === "IN_WARRANTY"
      ).length;
    }
    return allItems.filter(
      (i) =>
        i.status !== "AWAITING_SELLER" &&
        i.status !== "IN_PROGRESS" &&
        i.status !== "DELIVERED" &&
        i.status !== "CLOSED" &&
        i.status !== "IN_WARRANTY"
    ).length;
  };

  if (ordersQuery.isPending) {
    return (
      <section className="flex flex-col gap-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </section>
    );
  }

  if (ordersQuery.isError) {
    return (
      <Alert variant="destructive">
        <WarningCircleIcon aria-hidden="true" />
        <AlertTitle>Không thể tải đơn hàng</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>Vui lòng thử lại để xem các đơn hàng cần xử lý.</span>
          <Button
            onClick={() => void ordersQuery.refetch()}
            size="sm"
            type="button"
            variant="outline"
          >
            <ArrowClockwiseIcon aria-hidden="true" />
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Đơn hàng</CardTitle>
          <CardDescription>
            Theo dõi và bàn giao kết quả đơn hàng cho khách hàng.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <CheckCircleIcon
            aria-hidden="true"
            className="size-10 text-primary"
          />
          <p className="font-medium">Chưa có đơn hàng nào cần xử lý.</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Khi khách hàng mua sản phẩm của bạn, thông tin đơn hàng sẽ xuất hiện
            ở đây cùng hạn xử lý và luồng bàn giao.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      {/* Header & Status KPI metrics */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Đơn hàng</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý và thực hiện các đơn hàng theo trạng thái và thời hạn xử lý.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{allItems.length} sản phẩm</Badge>
          <Badge variant="outline">{orders.length} đơn hàng</Badge>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "ALL" as const, label: "Tất cả" },
            { id: "AWAITING_SELLER" as const, label: "Chờ tiếp nhận" },
            { id: "IN_PROGRESS" as const, label: "Đang thực hiện" },
            { id: "DELIVERED" as const, label: "Đã bàn giao" },
            { id: "COMPLETED" as const, label: "Hoàn thành" },
            { id: "OTHER" as const, label: "Khiếu nại / Khác" },
          ].map((tab) => {
            const count = getTabCount(tab.id);
            const isActive = activeTab === tab.id;
            return (
              <Button
                className={`gap-2 rounded-xl text-xs font-semibold ${
                  isActive
                    ? ""
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                size="sm"
                type="button"
                variant={isActive ? "default" : "ghost"}
              >
                {tab.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-background text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Toolbar: Search & Item count */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
        <div className="flex flex-1 items-center gap-2.5 rounded-xl bg-muted/30 px-3.5 py-1.5 text-sm">
          <MagnifyingGlassIcon
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
          <Input
            className="w-full border-0 bg-transparent shadow-none focus-visible:ring-0"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên sản phẩm, tên khách hàng..."
            value={searchTerm}
          />
          {searchTerm ? (
            <Button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setSearchTerm("")}
              size="xs"
              type="button"
              variant="ghost"
            >
              Xóa
            </Button>
          ) : null}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
          <FunnelIcon aria-hidden="true" className="size-4" />
          <span>Hiển thị {filteredItems.length} đơn hàng</span>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/60 bg-muted/40 font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="p-4">Sản phẩm</th>
                <th className="p-4">Khách hàng</th>
                <th className="p-4">Hạn xử lý</th>
                <th className="p-4">Số tiền tạm giữ & Giá</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredItems.map((item) => (
                <tr
                  className="transition-colors hover:bg-muted/30 cursor-pointer"
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                >
                  <td className="p-4 max-w-70">
                    <div className="font-bold text-foreground text-sm line-clamp-2">
                      {item.listing.title}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      <Badge
                        variant="outline"
                        className="text-[10px] py-0 px-1.5 font-normal"
                      >
                        {getListingTypeLabel(item.listing.type)}
                      </Badge>
                    </div>
                  </td>

                  <td className="p-4 max-w-80">
                    <div className="font-semibold text-foreground text-sm">
                      {getBuyerLabel(item.buyerId, item.buyer?.name)}
                    </div>
                    {item.buyer?.email ? (
                      <div className="text-[11px] text-muted-foreground">
                        {item.buyer.email}
                      </div>
                    ) : null}
                  </td>

                  <td className="p-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 font-semibold rounded-lg px-2.5 py-1 ${getProcessingDeadlineClass(item.status)}`}
                    >
                      <ClockIcon aria-hidden="true" className="size-3.5" />
                      {formatOrderDeadline(item.processingDeadlineAt)}
                    </span>
                  </td>

                  <td className="p-4 whitespace-nowrap">
                    <div className="font-bold text-sm text-foreground">
                      {formatVND(item.priceAmount)}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Tạm giữ: {getEscrowStatusLabel(item.escrowHold.status)}
                    </div>
                  </td>

                  <td className="p-4 whitespace-nowrap">
                    <Badge
                      className={getOrderItemStatusColorClassName(item.status)}
                      variant={getOrderItemStatusVariant(item.status)}
                    >
                      {getOrderItemStatusLabel(item.status, "seller")}
                    </Badge>
                  </td>

                  <td
                    className="p-4 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-2">
                      {item.status === "AWAITING_SELLER" ? (
                        <Button size="sm" onClick={() => setSelectedItem(item)}>
                          <PlayIcon aria-hidden="true" />
                          Bắt đầu
                        </Button>
                      ) : null}

                      {item.status === "IN_PROGRESS" ? (
                        <Button size="sm" onClick={() => setSelectedItem(item)}>
                          <PaperPlaneRightIcon aria-hidden="true" />
                          Bàn giao
                        </Button>
                      ) : null}

                      {item.status !== "AWAITING_SELLER" &&
                      item.status !== "IN_PROGRESS" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedItem(item)}
                        >
                          Chi tiết
                          <CaretRightIcon aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    className="p-12 text-center text-muted-foreground"
                    colSpan={6}
                  >
                    Không tìm thấy đơn hàng nào phù hợp.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row Action Sheet / Slide-over Detail View */}
      {selectedItem ? (
        <Sheet
          open={Boolean(selectedItem)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedItem(null);
            }
          }}
        >
          <SheetContent
            className="w-full sm:max-w-4xl data-[side=right]:sm:max-w-4xl overflow-y-auto"
            side="right"
          >
            <SheetHeader>
              <SheetTitle className="text-base font-bold">
                Chi tiết đơn hàng
              </SheetTitle>
            </SheetHeader>
            <div className="p-6 pt-0">
              <SellerOrderItemCard item={selectedItem} />
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold">
                  Trao đổi với khách hàng
                </h3>
                <OrderChatPanel
                  heightClass="h-130"
                  orderId={selectedItem.orderId}
                  participantLabel="Người mua"
                  sellerName={getBuyerLabel(
                    selectedItem.buyerId,
                    selectedItem.buyer?.name
                  )}
                  viewerRole="seller"
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
    </section>
  );
};
