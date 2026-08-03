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
import { Skeleton } from "@avin/ui/components/skeleton";
import {
  ArrowClockwise,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";

import { formatOrderDate } from "@/features/commerce/order-status";
import { SellerOrderItemCard } from "@/features/seller/components/seller-order-item-card";
import { formatVND } from "@/utils/format";
import { orpc } from "@/utils/orpc";

const SellerOrderCard = ({ order }: { order: SellerOrderView }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Order {order.id.slice(0, 8)}</CardTitle>
      <CardDescription>
        Tạo lúc {formatOrderDate(order.createdAt)} · Buyer {order.buyerId}
      </CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      {order.items.map((item) => (
        <SellerOrderItemCard item={item} key={item.id} />
      ))}
      <div className="flex items-center justify-between border-t border-border/60 pt-4 text-sm">
        <span className="text-muted-foreground">Tổng Order</span>
        <span className="font-semibold">{formatVND(order.totalAmount)}</span>
      </div>
    </CardContent>
  </Card>
);

export const StoreOrdersPanel = () => {
  const ordersQuery = useQuery(
    orpc.commerce.orders.listMine.queryOptions({
      retry: false,
      throwOnError: false,
    })
  );

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
          <span>Vui lòng thử lại để xem các OrderItem cần xử lý.</span>
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

  const orders = ordersQuery.data ?? [];
  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Đơn hàng</CardTitle>
          <CardDescription>
            Theo dõi từng OrderItem và bàn giao kết quả cho Buyer.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <CheckCircle aria-hidden="true" className="text-primary" />
          <p className="font-medium">Chưa có Order nào cần xử lý.</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Khi Buyer Checkout một Listing của bạn, OrderItem sẽ xuất hiện ở đây
            với hạn xử lý và các bước fulfillment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">Đơn hàng</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Mỗi OrderItem có trạng thái, hạn xử lý và luồng bàn giao riêng.
          </p>
        </div>
        <Badge variant="secondary">{orders.length} Order</Badge>
      </div>
      {orders.map((order) => (
        <SellerOrderCard key={order.id} order={order} />
      ))}
    </section>
  );
};
