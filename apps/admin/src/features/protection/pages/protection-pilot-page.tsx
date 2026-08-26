import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Input } from "@avin/ui/components/input";
import { useState } from "react";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";

import {
  useInviteProtectionPilotProvider,
  useProtectionPilotConfiguration,
  useProtectionPilotInvitations,
  useUpdateProtectionPilotConfiguration,
} from "../api/pilot-api";

const formatDate = (value: string | null): string =>
  value ? new Date(value).toLocaleString("vi-VN") : "Chưa sử dụng";

const PilotConfigurationForm = ({
  initialApprovalCap,
  initialEnabled,
  isPending,
  onSave,
}: {
  initialApprovalCap: number;
  initialEnabled: boolean;
  isPending: boolean;
  onSave: (approvalCap: number, enabled: boolean) => Promise<void>;
}) => {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [approvalCap, setApprovalCap] = useState(String(initialApprovalCap));

  const save = async (): Promise<void> => {
    const parsedCap = Number(approvalCap);
    if (!Number.isInteger(parsedCap) || parsedCap < 10 || parsedCap > 20) {
      toast.error("Approval cap phải nằm trong khoảng 10–20 Provider.");
      return;
    }
    await onSave(parsedCap, enabled);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cấu hình giới hạn approval</CardTitle>
        <CardDescription>
          Tắt pilot chỉ dùng khi Protection Manager đã có quyết định vận hành
          mới; thay đổi được audit bởi procedure quản trị.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="grid gap-2 text-sm" htmlFor="pilot-approval-cap">
          <span className="font-medium">Approval cap (10–20)</span>
          <Input
            id="pilot-approval-cap"
            inputMode="numeric"
            max={20}
            min={10}
            onChange={(event) => setApprovalCap(event.target.value)}
            type="number"
            value={approvalCap}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              type="checkbox"
            />
            Giới hạn invitation đang bật
          </label>
          <Button
            disabled={isPending}
            onClick={() => void save()}
            type="button"
          >
            {isPending ? "Đang lưu…" : "Lưu cấu hình"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const ProtectionPilotPage = () => {
  const configurationQuery = useProtectionPilotConfiguration();
  const invitationsQuery = useProtectionPilotInvitations();
  const updateConfiguration = useUpdateProtectionPilotConfiguration();
  const inviteProvider = useInviteProtectionPilotProvider();
  const [email, setEmail] = useState("");

  const saveConfiguration = async (
    approvalCap: number,
    enabled: boolean
  ): Promise<void> => {
    try {
      await updateConfiguration.mutateAsync({
        approvalCap,
        enabled,
      });
      toast.success("Đã lưu giới hạn invitation pilot.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể lưu cấu hình pilot."
      );
    }
  };

  const invite = async (): Promise<void> => {
    if (!email.trim()) {
      toast.error("Cần nhập email Provider.");
      return;
    }
    try {
      await inviteProvider.mutateAsync({ email: email.trim() });
      toast.success("Đã thêm Provider vào danh sách invitation.");
      setEmail("");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể tạo invitation cho Provider."
      );
    }
  };

  return (
    <>
      <Header fixed />
      <Main className="flex flex-1 flex-col gap-6">
        <div>
          <p className="font-medium text-primary text-sm">AVIN CHECK · PILOT</p>
          <h1 className="mt-1 font-semibold text-3xl tracking-tight">
            Invitation-limited Provider pilot
          </h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Application vẫn mở quanh năm, nhưng chỉ Provider đã được mời mới có
            thể được duyệt trong pilot và tổng số profile được duyệt không vượt
            quá cap 10–20.
          </p>
        </div>

        <PilotConfigurationForm
          initialApprovalCap={configurationQuery.data?.approvalCap ?? 10}
          initialEnabled={configurationQuery.data?.enabled ?? true}
          isPending={updateConfiguration.isPending}
          key={configurationQuery.data?.updatedAt ?? "default"}
          onSave={saveConfiguration}
        />

        <Card>
          <CardHeader>
            <CardTitle>Mời Provider</CardTitle>
            <CardDescription>
              Chỉ tài khoản có role Provider hiện hữu mới được thêm vào pilot.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Input
              aria-label="Email Provider cần mời"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="provider@example.com"
              type="email"
              value={email}
            />
            <Button
              disabled={inviteProvider.isPending}
              onClick={() => void invite()}
              type="button"
            >
              {inviteProvider.isPending ? "Đang thêm…" : "Thêm invitation"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách invitation</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {invitationsQuery.data?.map((invitation) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                key={invitation.id}
              >
                <div>
                  <p className="font-medium">{invitation.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {invitation.email} · tạo {formatDate(invitation.createdAt)}
                  </p>
                </div>
                <Badge variant={invitation.usedAt ? "secondary" : "outline"}>
                  {invitation.usedAt
                    ? `Đã dùng ${formatDate(invitation.usedAt)}`
                    : "Chưa dùng"}
                </Badge>
              </div>
            ))}
            {invitationsQuery.data?.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Chưa có Provider nào được mời.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </Main>
    </>
  );
};
