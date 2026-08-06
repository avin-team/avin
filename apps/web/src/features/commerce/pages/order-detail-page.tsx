import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import { Card, CardContent } from "@avin/ui/components/card";
import { Skeleton } from "@avin/ui/components/skeleton";
import { cn } from "@avin/ui/lib/utils";
import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  CalendarIcon,
  ChatTeardropTextIcon,
  ReceiptIcon,
  StorefrontIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import * as React from "react";

import { Shell } from "@/components/shell";
import { BuyerOrderItemCard } from "@/features/commerce/components/buyer-order-item-card";
import { OrderChatPanel } from "@/features/commerce/components/order-chat-panel";
import {
  formatOrderDate,
  getOrderItemStatusColorClassName,
  getOrderItemStatusLabel,
  getOrderItemStatusVariant,
} from "@/features/commerce/order-status";
import { formatVND } from "@/utils/format";
import { orpc } from "@/utils/orpc";

export const OrderDetailPage = () => {
  const { id } = useParams({ strict: false }) as { id?: string };

  const ordersQuery = useQuery(
    orpc.commerce.orders.listMineAsBuyer.queryOptions({
      retry: false,
      throwOnError: false,
    })
  );

  if (ordersQuery.isPending) {
    return (
      <Shell variant="default">
        <div className="flex flex-col gap-6 py-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </Shell>
    );
  }

  if (ordersQuery.isError) {
    return (
      <Shell variant="default">
        <div className="py-16">
          <Alert variant="destructive">
            <WarningCircleIcon aria-hidden="true" />
            <AlertTitle>Không thể tải chi tiết đơn hàng</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              <span>Vui lòng thử lại sau.</span>
              <Button
                onClick={() => void ordersQuery.refetch()}
                size="sm"
                variant="outline"
              >
                <ArrowClockwiseIcon aria-hidden="true" />
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </Shell>
    );
  }

  const orders = ordersQuery.data ?? [];
  // Find order and item by id matching order.id or item.id
  let targetOrder = orders.find((o) => o.id === id);
  let targetItem = targetOrder?.items[0];

  if (!targetOrder) {
    for (const order of orders) {
      const item = order.items.find((i) => i.id === id);
      if (item) {
        targetOrder = order;
        targetItem = item;
        break;
      }
    }
  }

  if (!targetOrder || !targetItem) {
    return (
      <Shell variant="default">
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <WarningCircleIcon className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-bold">Không tìm thấy đơn hàng</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Đơn hàng #{id} không tồn tại hoặc bạn không có quyền truy cập.
          </p>
          <Button render={<Link to="/orders" />}>
            <ArrowLeftIcon className="h-4 w-4" />
            Quay lại danh sách đơn hàng
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell variant="default">
      <div className="flex flex-col gap-6 py-8 pb-24">
        {/* Navigation Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <Button render={<Link to="/orders" />} size="sm" variant="outline">
              <ArrowLeftIcon className="h-4 w-4" />
              Quay lại danh sách
            </Button>
            <div className="h-4 w-px bg-border/60" />
            <span className="text-xs text-muted-foreground">
              Trang mua hàng / Đơn hàng #{targetOrder.id.slice(0, 8)}
            </span>
          </div>
          <Badge
            className={cn(
              "whitespace-nowrap",
              getOrderItemStatusColorClassName(targetItem.status)
            )}
            variant={getOrderItemStatusVariant(targetItem.status)}
          >
            {getOrderItemStatusLabel(targetItem.status)}
          </Badge>
        </div>

        {/* Page Header Info */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Chi tiết đơn hàng #{targetOrder.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm text-muted-foreground">
            Mã OrderItem:{" "}
            <strong className="text-foreground">{targetItem.id}</strong>
          </p>
        </div>

        {/* Order Header Summary Card */}
        <Card className="border-border/70 bg-card shadow-xs">
          <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <StorefrontIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Cửa hàng (Store)
                </p>
                {targetOrder.seller.storeSlug ? (
                  <Link
                    to="/store/$slug"
                    params={{ slug: targetOrder.seller.storeSlug }}
                    className="font-semibold text-foreground hover:text-primary hover:underline"
                  >
                    {targetOrder.seller.storefrontName ??
                      targetOrder.seller.name}
                  </Link>
                ) : (
                  <p className="font-semibold text-foreground">
                    {targetOrder.seller.storefrontName ??
                      targetOrder.seller.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ReceiptIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tổng tiền Item</p>
                <p className="font-semibold text-foreground">
                  {formatVND(targetItem.priceAmount)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ngày đặt hàng</p>
                <p className="font-semibold text-foreground">
                  {formatOrderDate(targetOrder.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Split layout: order detail left, chat right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <BuyerOrderItemCard item={targetItem} />
          </div>
          <div className="lg:col-span-5 sticky top-20">
            <div className="flex flex-col gap-2">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <ChatTeardropTextIcon className="h-4 w-4 text-primary" />
                <span>Trao đổi với Người bán</span>
              </h2>
              <OrderChatPanel
                heightClass="h-130"
                orderId={targetOrder.id}
                sellerImage={
                  targetOrder.seller.avatarUrl ?? targetOrder.seller.image
                }
                sellerName={
                  targetOrder.seller.storefrontName ?? targetOrder.seller.name
                }
                sellerStoreSlug={targetOrder.seller.storeSlug}
              />
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
};
