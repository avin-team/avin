import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { BellIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";

import {
  useAdminNotificationActions,
  useAdminNotifications,
} from "../api/notifications-api";

const formatDate = (value: string): string =>
  new Date(value).toLocaleString("vi-VN");

export const NotificationsPage = () => {
  const [cursor, setCursor] = useState<string>();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const notificationsQuery = useAdminNotifications({
    cursor,
    unreadOnly: unreadOnly || undefined,
  });
  const { markAllRead, markRead } = useAdminNotificationActions();
  const items = notificationsQuery.data?.items ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  return (
    <>
      <Header fixed>
        <div className="ml-auto">
          <ThemeSwitch />
        </div>
      </Header>
      <Main className="flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">OPERATIONS</p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Thông báo Admin
            </h1>
            <p className="text-muted-foreground">
              Hộp thư riêng của Admin, không dùng chung read-state.
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
              <BellIcon /> Hộp thư Admin
            </CardTitle>
            <CardDescription>{unreadCount} thông báo chưa đọc</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {notificationsQuery.isPending ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Đang tải thông báo…
              </p>
            ) : null}
            {notificationsQuery.isError ? (
              <p className="py-8 text-center text-sm text-destructive">
                Không thể tải thông báo Admin.
              </p>
            ) : null}
            {notificationsQuery.isPending === false &&
            notificationsQuery.isError === false &&
            items.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Chưa có thông báo.
              </p>
            ) : null}
            {items.map((item) => (
              <article
                className={`rounded-xl border p-4 ${item.readAt ? "bg-background" : "bg-muted/40"}`}
                key={item.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{item.title}</h2>
                      {item.readAt ? null : <Badge>Chưa đọc</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.body}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {item.readAt ? null : (
                      <Button
                        disabled={markRead.isPending}
                        onClick={() =>
                          markRead.mutate({ notificationId: item.id })
                        }
                        size="sm"
                        variant="ghost"
                      >
                        Đã đọc
                      </Button>
                    )}
                    <Button
                      render={
                        <a
                          aria-label={`Mở thông báo: ${item.title}`}
                          href={item.deepLink}
                        />
                      }
                      size="sm"
                      variant="outline"
                    >
                      Mở
                    </Button>
                  </div>
                </div>
              </article>
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
      </Main>
    </>
  );
};
