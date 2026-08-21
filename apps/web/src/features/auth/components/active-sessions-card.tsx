import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Separator } from "@avin/ui/components/separator";
import { Spinner } from "@avin/ui/components/spinner";

import { useSession } from "@/features/auth/api/session-query";
import { useActiveSessions } from "@/features/auth/hooks/use-active-sessions";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export const ActiveSessionsCard = () => {
  const { data: currentSession } = useSession();
  const { revokeSession, revokingToken, sessionsQuery } = useActiveSessions(
    currentSession?.session.token
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phiên đang hoạt động</CardTitle>
        <CardDescription>
          Thu hồi ngay những thiết bị hoặc trình duyệt bạn không nhận ra.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {sessionsQuery.isPending && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Spinner />
            Đang tải phiên đăng nhập…
          </div>
        )}
        {sessionsQuery.error && (
          <p className="text-destructive text-sm">
            {sessionsQuery.error.message}
          </p>
        )}
        {sessionsQuery.data?.map((session, index) => {
          const isCurrent = session.token === currentSession?.session.token;

          return (
            <div className="flex flex-col gap-4" key={session.id}>
              {index > 0 && <Separator />}
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">
                      {session.userAgent ?? "Thiết bị không xác định"}
                    </p>
                    {isCurrent && <Badge>Phiên hiện tại</Badge>}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {session.ipAddress ?? "IP không xác định"} · hết hạn{" "}
                    {dateFormatter.format(new Date(session.expiresAt))}
                  </p>
                </div>
                <Button
                  disabled={revokingToken === session.token}
                  onClick={() => {
                    revokeSession(session.token);
                  }}
                  size="sm"
                  type="button"
                  variant="destructive"
                >
                  {revokingToken === session.token && (
                    <Spinner data-icon="inline-start" />
                  )}
                  Thu hồi
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
