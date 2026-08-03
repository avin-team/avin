import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Button } from "@avin/ui/components/button";
import { Card, CardContent } from "@avin/ui/components/card";
import { Skeleton } from "@avin/ui/components/skeleton";
import {
  ArrowClockwise,
  Handshake,
  WarningCircle,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";

import { Shell } from "@/components/shell";
import { BuyerOrdersTable } from "@/features/commerce/components/buyer-orders-table";
import { orpc } from "@/utils/orpc";

export const OrdersPage = () => {
  const ordersQuery = useQuery(
    orpc.commerce.orders.listMineAsBuyer.queryOptions({
      retry: false,
      throwOnError: false,
    })
  );

  if (ordersQuery.isPending) {
    return (
      <Shell variant="default">
        <div className="flex flex-col gap-4 py-8">
          <Skeleton className="h-12 w-56" />
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
            <WarningCircle aria-hidden="true" />
            <AlertTitle>Không thể tải đơn hàng</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              <span>Vui lòng thử lại sau.</span>
              <Button
                onClick={() => void ordersQuery.refetch()}
                size="sm"
                variant="outline"
              >
                <ArrowClockwise aria-hidden="true" />
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </Shell>
    );
  }

  const orders = ordersQuery.data ?? [];

  return (
    <Shell variant="default">
      <div className="flex flex-col gap-8 py-8">
        <div>
          <p className="text-sm font-medium text-primary">Mua hàng</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Đơn hàng của tôi
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Theo dõi từng OrderItem độc lập, xem bằng chứng bàn giao và thực
            hiện hành động phù hợp với trạng thái hiện tại.
          </p>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <Handshake aria-hidden="true" className="text-primary" />
              <h2 className="text-lg font-semibold">Chưa có đơn hàng</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Sau khi Checkout thành công, các Order và OrderItem của bạn sẽ
                xuất hiện ở đây.
              </p>
            </CardContent>
          </Card>
        ) : (
          <BuyerOrdersTable orders={orders} />
        )}
      </div>
    </Shell>
  );
};
