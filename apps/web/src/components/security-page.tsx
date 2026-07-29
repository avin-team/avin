import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@avin/ui/components/field";
import { Input } from "@avin/ui/components/input";
import { Separator } from "@avin/ui/components/separator";
import { Spinner } from "@avin/ui/components/spinner";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

type ActiveSession = NonNullable<
  Awaited<ReturnType<typeof authClient.listSessions>>["data"]
>[number];

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export const SecurityPage = () => {
  const navigate = useNavigate();
  const { data: currentSession, refetch: refetchCurrentSession } =
    authClient.useSession();
  const [revokingToken, setRevokingToken] = useState<string | null>(null);
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isEnablingTwoFactor, setIsEnablingTwoFactor] = useState(false);
  const [isVerifyingTwoFactor, setIsVerifyingTwoFactor] = useState(false);
  const sessionsQuery = useQuery({
    queryFn: async (): Promise<ActiveSession[]> => {
      const result = await authClient.listSessions();
      if (result.error) {
        throw new Error(
          result.error.message ?? "Không thể tải phiên đăng nhập."
        );
      }
      return result.data ?? [];
    },
    queryKey: ["auth", "sessions"],
  });

  const revokeSession = async (token: string) => {
    setRevokingToken(token);
    try {
      const result = await authClient.revokeSession({ token });

      if (result.error) {
        toast.error(result.error.message ?? "Không thể thu hồi phiên.");
        return;
      }

      toast.success("Đã thu hồi phiên đăng nhập.");
      if (token === currentSession?.session.token) {
        await navigate({ to: "/login" });
        return;
      }

      await sessionsQuery.refetch();
    } catch {
      toast.error("Không thể thu hồi phiên lúc này. Vui lòng thử lại.");
    } finally {
      setRevokingToken(null);
    }
  };

  const enableTwoFactor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password"));
    setIsEnablingTwoFactor(true);
    try {
      const result = await authClient.twoFactor.enable({
        password: password || undefined,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Không thể bật xác thực hai lớp.");
        return;
      }

      setTotpUri(result.data.totpURI);
      setBackupCodes(result.data.backupCodes);
    } catch {
      toast.error("Không thể bắt đầu thiết lập 2FA. Vui lòng thử lại.");
    } finally {
      setIsEnablingTwoFactor(false);
    }
  };

  const verifyTwoFactor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code"));
    setIsVerifyingTwoFactor(true);
    try {
      const result = await authClient.twoFactor.verifyTotp({
        code,
        trustDevice: true,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Mã xác thực không hợp lệ.");
        return;
      }

      setTotpUri(null);
      setBackupCodes([]);
      toast.success("Đã bật xác thực hai lớp.");
      await refetchCurrentSession();
    } catch {
      toast.error("Không thể xác minh 2FA lúc này. Vui lòng thử lại.");
    } finally {
      setIsVerifyingTwoFactor(false);
    }
  };

  return (
    <main className="container mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-bold text-2xl">Bảo mật tài khoản</h1>
        <p className="text-muted-foreground">
          Quản lý thiết bị đăng nhập và xác thực hai lớp.
        </p>
      </header>

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
                    onClick={() => revokeSession(session.token)}
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

      <Card>
        <CardHeader>
          <CardTitle>Xác thực hai lớp</CardTitle>
          <CardDescription>
            Admin phải hoàn tất bước này trước khi dùng chức năng quản trị.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentSession?.user.twoFactorEnabled ? (
            <div className="flex items-center gap-2">
              <Badge>Đã bật</Badge>
              <p className="text-muted-foreground text-sm">
                Tài khoản đang được bảo vệ bằng ứng dụng TOTP.
              </p>
            </div>
          ) : (
            <form className="flex flex-col gap-6" onSubmit={enableTwoFactor}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="two-factor-password">
                    Mật khẩu hiện tại
                  </FieldLabel>
                  <Input
                    autoComplete="current-password"
                    id="two-factor-password"
                    minLength={8}
                    name="password"
                    type="password"
                  />
                  <FieldDescription>
                    Tài khoản chỉ dùng Google có thể để trống mật khẩu.
                  </FieldDescription>
                </Field>
                <Button disabled={isEnablingTwoFactor} type="submit">
                  {isEnablingTwoFactor && <Spinner data-icon="inline-start" />}
                  Bắt đầu thiết lập
                </Button>
              </FieldGroup>
            </form>
          )}

          {totpUri && (
            <form
              className="mt-6 flex flex-col gap-6"
              onSubmit={verifyTwoFactor}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="totp-uri">
                    Khóa thiết lập TOTP
                  </FieldLabel>
                  <Input id="totp-uri" readOnly value={totpUri} />
                  <FieldDescription>
                    Thêm URI này vào ứng dụng xác thực, sau đó nhập mã 6 số.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="two-factor-code">Mã xác thực</FieldLabel>
                  <Input
                    autoComplete="one-time-code"
                    id="two-factor-code"
                    inputMode="numeric"
                    maxLength={6}
                    minLength={6}
                    name="code"
                    pattern="[0-9]{6}"
                    required
                  />
                </Field>
                <Button disabled={isVerifyingTwoFactor} type="submit">
                  {isVerifyingTwoFactor && <Spinner data-icon="inline-start" />}
                  Xác nhận và bật 2FA
                </Button>
              </FieldGroup>
            </form>
          )}
        </CardContent>
        {backupCodes.length > 0 && (
          <CardFooter className="flex flex-col items-start gap-2">
            <p className="font-medium">Mã khôi phục — lưu ở nơi an toàn</p>
            <code className="whitespace-pre-wrap text-sm">
              {backupCodes.join("\n")}
            </code>
          </CardFooter>
        )}
      </Card>
    </main>
  );
};
