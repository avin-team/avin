import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Button } from "@avin/ui/components/button";
import { Card, CardContent } from "@avin/ui/components/card";
import { Skeleton } from "@avin/ui/components/skeleton";
import {
  ArrowClockwiseIcon,
  HandshakeIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Shell } from "@/components/shell";
import { useSession } from "@/features/auth/api/session-query";
import { BuyerOrdersTable } from "@/features/commerce/components/buyer-orders-table";
import { orpc } from "@/utils/orpc";

export const OrdersPage = () => {
  const { data: session } = useSession();
  const isSeller = session?.user?.role === ACCOUNT_ROLE.SELLER;

  const ordersQuery = useQuery({
    ...orpc.commerce.orders.listMineAsBuyer.queryOptions({
      retry: false,
      throwOnError: false,
    }),
    enabled: !isSeller,
  });

  if (isSeller) {
    return (
      <Shell variant="default">
        <div className="py-16">
          <Card className="mx-auto max-w-xl">
            <CardContent className="space-y-4 px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <WarningCircleIcon className="h-7 w-7" />
              </div>
              <h2 className="font-bold text-xl">Đơn mua hàng của Người mua</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Bạn đang đăng nhập bằng tài khoản Người bán. Để xem và xử lý các
                đơn đặt hàng từ khách mua, vui lòng truy cập Kênh người bán.
              </p>
              <div className="flex justify-center pt-2">
                <Button render={<Link to="/seller/store" />}>
                  Quản lý đơn bán hàng
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Shell>
    );
  }

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
            <WarningCircleIcon aria-hidden="true" />
            <AlertTitle>Không thể tải đơn hàng</AlertTitle>
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

  return (
    <Shell variant="default">
      <div className="flex flex-col gap-8 py-8">
        <div>
          <p className="text-sm font-medium text-primary">Mua hàng</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Đơn hàng của tôi
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Theo dõi từng sản phẩm độc lập, xem bằng chứng bàn giao và thực hiện
            hành động phù hợp với trạng thái hiện tại.
          </p>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <HandshakeIcon aria-hidden="true" className="text-primary" />
              <h2 className="text-lg font-semibold">Chưa có đơn hàng</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Sau khi thanh toán thành công, các đơn hàng và sản phẩm của bạn
                sẽ xuất hiện ở đây.
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
