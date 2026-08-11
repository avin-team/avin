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
  BellIcon,
  CaretRightIcon,
  CheckCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useState } from "react";

import { Shell } from "@/components/shell";

import {
  useNotificationActions,
  useNotifications,
} from "../api/notifications-api";

const formatDate = (value: string): string =>
  new Date(value).toLocaleString("vi-VN");

const capitalizeFirst = (str: string): string =>
  str.length > 0 ? str.charAt(0).toUpperCase() + str.slice(1) : str;

const formatNotificationTitle = (title: string): string => {
  if (title === "Cập nhật OrderItem") {
    return "Cập nhật đơn hàng";
  }
  if (title === "Dispute mới cần xử lý") {
    return "Khiếu nại mới cần xử lý";
  }
  if (title === "OrderItem đã được giao") {
    return "Sản phẩm đã được bàn giao";
  }
  if (title === "Buyer đã xác nhận giao hàng") {
    return "Đã xác nhận nhận hàng";
  }
  const formatted = title
    .replaceAll(/\bOrderItem\b/gu, "Đơn hàng")
    .replaceAll(/\borderItem\b/gu, "đơn hàng")
    .replaceAll(/\bDispute\b/gu, "Khiếu nại")
    .replaceAll(/\bBuyer\b/gu, "Người mua")
    .replaceAll(/\bSeller\b/gu, "Người bán");
  return capitalizeFirst(formatted);
};

const formatNotificationText = (text: string): string => {
  const formatted = text
    .replaceAll(/\bOrderItem\b/gu, "Đơn hàng")
    .replaceAll(/\borderItem\b/gu, "đơn hàng")
    .replaceAll(/\bIN_PROGRESS\b/gu, "Đang xử lý")
    .replaceAll(/\bAWAITING_SELLER\b/gu, "Chờ người bán xác nhận")
    .replaceAll(/\bDELIVERED\b/gu, "Đã bàn giao")
    .replaceAll(/\bIN_WARRANTY\b/gu, "Đang bảo hành")
    .replaceAll(/\bCLOSED\b/gu, "Hoàn tất")
    .replaceAll(/\bCANCELLED\b/gu, "Đã hủy")
    .replaceAll(/\bREFUNDED\b/gu, "Đã hoàn tiền")
    .replaceAll(/\bDISPUTED\b/gu, "Đang khiếu nại")
    .replaceAll(/\bBuyer\b/gu, "Người mua")
    .replaceAll(/\bSeller\b/gu, "Người bán")
    .replaceAll(/\bDispute\b/gu, "Khiếu nại")
    .replaceAll(/\bDeliverySubmission\b/gu, "thông tin bàn giao")
    .replaceAll(/\bSeller Enforcement\b/gu, "xử lý vi phạm gian hàng");
  return capitalizeFirst(formatted);
};

export const NotificationsPage = () => {
  const [cursor, setCursor] = useState<string>();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const notificationsQuery = useNotifications({
    cursor,
    unreadOnly: unreadOnly || undefined,
  });
  const { markAllRead, markRead } = useNotificationActions();

  if (notificationsQuery.isError) {
    return (
      <Shell>
        <Alert className="mt-8" variant="destructive">
          <WarningCircleIcon />
          <AlertTitle>Không thể tải thông báo</AlertTitle>
          <AlertDescription>
            Vui lòng thử lại sau.
            <Button
              className="mt-3"
              onClick={() => void notificationsQuery.refetch()}
              size="sm"
              variant="outline"
            >
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      </Shell>
    );
  }

  const items = notificationsQuery.data?.items ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  return (
    <Shell>
      <div className="flex flex-col gap-6 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Tài khoản</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Thông báo
            </h1>
            <p className="mt-2 text-muted-foreground">
              Các cập nhật quan trọng về đơn hàng, ví, hồ sơ và gian hàng.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setUnreadOnly((current) => !current);
                setCursor(undefined);
              }}
              variant={unreadOnly ? "secondary" : "outline"}
            >
              {unreadOnly ? "Tất cả thông báo" : "Chỉ chưa đọc"}
            </Button>
            <Button
              disabled={unreadCount === 0 || markAllRead.isPending}
              onClick={() => markAllRead.mutate({})}
              variant="outline"
            >
              <CheckCircleIcon /> Đánh dấu tất cả đã đọc
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellIcon /> Hộp thư thông báo
            </CardTitle>
            <CardDescription>
              {unreadCount > 0
                ? `${unreadCount} thông báo chưa đọc`
                : "Bạn đã đọc hết thông báo"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {notificationsQuery.isPending ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Đang tải thông báo…
              </p>
            ) : null}
            {notificationsQuery.isPending === false && items.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Chưa có thông báo nào.
              </p>
            ) : null}
            {items.map((item) => (
              <a
                aria-label={`Mở thông báo: ${item.title}`}
                className={`group block rounded-xl border p-4 transition-colors hover:border-primary/30 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  item.readAt ? "bg-background" : "bg-muted/40"
                }`}
                href={item.deepLink}
                key={item.id}
                onClick={() => {
                  if (!item.readAt) {
                    markRead.mutate({ notificationId: item.id });
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">
                        {formatNotificationTitle(item.title)}
                      </h2>
                      {item.readAt ? null : <Badge>Chưa đọc</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatNotificationText(item.body)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                  <CaretRightIcon className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
              </a>
            ))}
            {cursor || notificationsQuery.data?.nextCursor ? (
              <div className="flex justify-end gap-2 border-t pt-3">
                {cursor ? (
                  <Button
                    onClick={() => setCursor(undefined)}
                    size="sm"
                    variant="ghost"
                  >
                    Trang đầu
                  </Button>
                ) : null}
                {notificationsQuery.data?.nextCursor ? (
                  <Button
                    disabled={notificationsQuery.isFetching}
                    onClick={() =>
                      setCursor(
                        notificationsQuery.data?.nextCursor ?? undefined
                      )
                    }
                    size="sm"
                    variant="outline"
                  >
                    Tải thêm
                  </Button>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
};
