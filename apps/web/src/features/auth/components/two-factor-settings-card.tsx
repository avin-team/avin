import { Badge } from "@avin/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { useState } from "react";

import { authClient } from "@/features/auth/api/auth-client";
import { EnableTwoFactorForm } from "@/features/auth/components/enable-two-factor-form";
import type { TwoFactorSetup } from "@/features/auth/components/enable-two-factor-form";
import { VerifyTwoFactorForm } from "@/features/auth/components/verify-two-factor-form";

export const TwoFactorSettingsCard = () => {
  const { data: currentSession, refetch: refetchCurrentSession } =
    authClient.useSession();
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);

  const finishSetup = async (): Promise<void> => {
    setSetup(null);
    await refetchCurrentSession();
  };

  return (
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
          <EnableTwoFactorForm onSetup={setSetup} />
        )}

        {setup && (
          <VerifyTwoFactorForm
            onVerified={finishSetup}
            totpUri={setup.totpUri}
          />
        )}
      </CardContent>
      {setup && (
        <CardFooter className="flex flex-col items-start gap-2">
          <p className="font-medium">Mã khôi phục — lưu ở nơi an toàn</p>
          <code className="whitespace-pre-wrap text-sm">
            {setup.backupCodes.join("\n")}
          </code>
        </CardFooter>
      )}
    </Card>
  );
};
