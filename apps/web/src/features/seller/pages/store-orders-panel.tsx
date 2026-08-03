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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@avin/ui/components/sheet";
import { Skeleton } from "@avin/ui/components/skeleton";
import {
  ArrowClockwise,
  CaretRight,
  CheckCircle,
  Clock,
  Funnel,
  MagnifyingGlass,
  PaperPlaneRight,
  Play,
  WarningCircle,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import {
  formatOrderDeadline,
  getOrderItemStatusLabel,
  getOrderItemStatusVariant,
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
  orderId: string;
};

type FilterTab =
  | "ALL"
  | "AWAITING_SELLER"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "COMPLETED"
  | "OTHER";

const formatInputValue = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  try {
    return JSON.stringify(value) ?? "—";
  } catch {
    return "—";
  }
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
      (ordersQuery.data ?? []).flatMap((o) => {
        const buyerObj = (o as { buyer?: OrderItemFlat["buyer"] }).buyer;
        return o.items.map((i) => ({
          ...i,
          buyer: buyerObj,
          buyerId: o.buyerId,
          orderId: o.id,
        }));
      }),
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
          buyerEmail.toLowerCase().includes(query) ||
          item.customInputs.some((input) =>
            String(input.value).toLowerCase().includes(query)
          );

        if (!matchesSearch) {
          return false;
        }

        if (activeTab === "ALL") {
          return true;
        }
        if (activeTab === "AWAITING_SELLER") {
          return item.status === "AWAITING_SELLER";
        }
        if (activeTab === "IN_PROGRESS") {
          return item.status === "IN_PROGRESS";
        }
        if (activeTab === "DELIVERED") {
          return item.status === "DELIVERED";
        }
        if (activeTab === "COMPLETED") {
          return item.status === "CLOSED" || item.status === "IN_WARRANTY";
        }
        if (activeTab === "OTHER") {
          return (
            item.status !== "AWAITING_SELLER" &&
            item.status !== "IN_PROGRESS" &&
            item.status !== "DELIVERED" &&
            item.status !== "CLOSED" &&
            item.status !== "IN_WARRANTY"
          );
        }

        return true;
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
        <WarningCircle aria-hidden="true" />
        <AlertTitle>Không thể tải đơn hàng</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>Vui lòng thử lại để xem các đơn hàng cần xử lý.</span>
          <Button
            onClick={() => void ordersQuery.refetch()}
            size="sm"
            type="button"
            variant="outline"
          >
            <ArrowClockwise aria-hidden="true" />
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
          <CheckCircle aria-hidden="true" className="size-10 text-primary" />
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
              <button
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
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
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar: Search & Item count */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
        <div className="flex flex-1 items-center gap-2.5 rounded-xl bg-muted/30 px-3.5 py-2 text-sm">
          <MagnifyingGlass
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
          <input
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên sản phẩm, tên khách hàng..."
            value={searchTerm}
          />
          {searchTerm ? (
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setSearchTerm("")}
              type="button"
            >
              Xóa
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
          <Funnel aria-hidden="true" className="size-4" />
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
                <th className="p-4">Khách hàng & Yêu cầu</th>
                <th className="p-4">Hạn xử lý</th>
                <th className="p-4">Tạm giữ (Escrow) & Giá</th>
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
                  <td className="p-4 max-w-[280px]">
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

                  <td className="p-4 max-w-[320px]">
                    <div className="font-semibold text-foreground text-sm">
                      {getBuyerLabel(item.buyerId, item.buyer?.name)}
                    </div>
                    {item.buyer?.email ? (
                      <div className="text-[11px] text-muted-foreground">
                        {item.buyer.email}
                      </div>
                    ) : null}
                    {item.customInputs.length > 0 ? (
                      <div className="mt-1.5 flex flex-col gap-1 rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-[11px]">
                        <span className="font-semibold text-primary text-[10px] uppercase tracking-wider">
                          Yêu cầu từ khách hàng:
                        </span>
                        {item.customInputs.map((input) => (
                          <div key={input.fieldKey} className="break-words">
                            <span className="text-muted-foreground font-medium">
                              {input.fieldKey}:{" "}
                            </span>
                            <span className="font-semibold text-foreground">
                              {formatInputValue(input.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        Không có yêu cầu thêm
                      </span>
                    )}
                  </td>

                  <td className="p-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 font-semibold rounded-lg px-2.5 py-1 ${getProcessingDeadlineClass(item.status)}`}
                    >
                      <Clock aria-hidden="true" className="size-3.5" />
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
                    <Badge variant={getOrderItemStatusVariant(item.status)}>
                      {getOrderItemStatusLabel(item.status)}
                    </Badge>
                  </td>

                  <td
                    className="p-4 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-2">
                      {item.status === "AWAITING_SELLER" ? (
                        <Button size="sm" onClick={() => setSelectedItem(item)}>
                          <Play aria-hidden="true" />
                          Bắt đầu
                        </Button>
                      ) : null}

                      {item.status === "IN_PROGRESS" ? (
                        <Button size="sm" onClick={() => setSelectedItem(item)}>
                          <PaperPlaneRight aria-hidden="true" />
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
                          <CaretRight aria-hidden="true" />
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
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
    </section>
  );
};
