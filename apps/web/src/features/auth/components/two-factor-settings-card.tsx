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
import { CheckIcon, CopyIcon, KeyIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";

import { useSession } from "@/features/auth/api/session-query";
import { EnableTwoFactorForm } from "@/features/auth/components/enable-two-factor-form";
import type { TwoFactorSetup } from "@/features/auth/components/enable-two-factor-form";
import { VerifyTwoFactorForm } from "@/features/auth/components/verify-two-factor-form";

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
    if (currentSession?.user.twoFactorEnabled) {
      return (
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-600">Đã bật</Badge>
          <p className="text-muted-foreground text-sm">
            Tài khoản đang được bảo vệ bằng ứng dụng TOTP.
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
    <Card>
      <CardHeader>
        <CardTitle>Xác thực hai lớp</CardTitle>
        <CardDescription>
          Bảo vệ tài khoản bằng xác thực hai lớp.
        </CardDescription>
      </CardHeader>
      <CardContent>{renderCardContent()}</CardContent>
      {setup && (
        <CardFooter className="flex flex-col items-start gap-3 border-t bg-muted/20 pt-4">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2 font-medium text-sm">
              <KeyIcon className="size-4 text-amber-500" />
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
                  <CheckIcon className="size-3.5 text-emerald-500" />
                  Đã chép
                </>
              ) : (
                <>
                  <CopyIcon className="size-3.5" />
                  Sao chép mã
                </>
              )}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Lưu các mã này ở nơi an toàn để đăng nhập khi mất quyền truy cập
            thiết bị xác thực.
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
