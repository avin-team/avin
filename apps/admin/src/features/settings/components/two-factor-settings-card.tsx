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
import { Check, Copy, Key, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useSession } from "@/lib/auth-client";

import { EnableTwoFactorForm } from "./enable-two-factor-form";
import type { TwoFactorSetup } from "./enable-two-factor-form";
import { VerifyTwoFactorForm } from "./verify-two-factor-form";

export const TwoFactorSettingsCard = () => {
  const { data: currentSession, refetch: refetchCurrentSession } = useSession();
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [copiedBackup, setCopiedBackup] = useState(false);

  const finishSetup = async (): Promise<void> => {
    setSetup(null);
    await refetchCurrentSession();
  };

  const handleCopyBackupCodes = async () => {
    if (!setup?.backupCodes) {
      return;
    }
    try {
      await navigator.clipboard.writeText(setup.backupCodes.join("\n"));
      setCopiedBackup(true);
      toast.success("Đã sao chép danh sách mã khôi phục.");
      setTimeout(() => setCopiedBackup(false), 2000);
    } catch {
      toast.error("Không thể sao chép mã khôi phục.");
    }
  };

  const renderCardContent = () => {
    if (currentSession?.user?.twoFactorEnabled) {
      return (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
          <Badge className="bg-emerald-600">Đã kích hoạt</Badge>
          <p className="text-muted-foreground text-sm">
            Tài khoản Admin của bạn đang được bảo vệ bởi ứng dụng Authenticator.
          </p>
        </div>
      );
    }

    if (setup) {
      return (
        <VerifyTwoFactorForm
          onCancel={() => setSetup(null)}
          onVerified={finishSetup}
          totpUri={setup.totpUri}
        />
      );
    }

    return <EnableTwoFactorForm onSetup={setSetup} />;
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <CardTitle>Xác thực hai lớp (2FA)</CardTitle>
        </div>
        <CardDescription>
          Tăng cường bảo mật cho tài khoản Quản trị viên bằng mã OTP 2FA.
        </CardDescription>
      </CardHeader>
      <CardContent>{renderCardContent()}</CardContent>
      {setup && (
        <CardFooter className="flex flex-col items-start gap-3 border-t bg-muted/20 pt-4">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Key className="size-4 text-amber-500" />
              <span>Mã khôi phục (Backup Codes)</span>
            </div>
            <Button
              className="h-8 gap-1.5 px-3 text-xs"
              onClick={handleCopyBackupCodes}
              type="button"
              variant="outline"
            >
              {copiedBackup ? (
                <>
                  <Check className="size-3.5 text-emerald-500" />
                  Đã chép
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  Sao chép mã
                </>
              )}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Lưu các mã này ở nơi an toàn. Bạn có thể dùng mã này để đăng nhập
            nếu mất quyền truy cập ứng dụng Authenticator.
          </p>
          <div className="grid w-full grid-cols-2 gap-2 rounded-lg border bg-card p-3 font-mono text-xs">
            {setup.backupCodes.map((code) => (
              <span key={code} className="text-center font-medium">
                {code}
              </span>
            ))}
          </div>
        </CardFooter>
      )}
    </Card>
  );
};
