import type { ProviderApplicationDecision } from "@avin/api/protection/provider-application";
import type { AppRouterClient } from "@avin/api/router";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Label } from "@avin/ui/components/label";
import { Textarea } from "@avin/ui/components/textarea";
import { ArrowLeftIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";

import {
  useAdminDecideProviderApplication,
  useAdminProviderApplication,
} from "../api/provider-applications-api";

type ProviderApplicationDetail = Awaited<
  ReturnType<AppRouterClient["protection"]["adminProviderApplications"]["get"]>
>;
type ProviderApplication = ProviderApplicationDetail["application"];

const STATUS_LABELS = {
  APPROVED: "Đã duyệt",
  CHANGES_REQUESTED: "Cần chỉnh sửa",
  DRAFT: "Bản nháp",
  PENDING_REVIEW: "Chờ duyệt",
  REJECTED: "Từ chối",
} as const;

const DetailField = ({ label, value }: { label: string; value: string }) => (
  <div className="grid gap-1.5">
    <p className="font-medium text-sm">{label}</p>
    <p className="text-muted-foreground text-sm break-words">{value}</p>
  </div>
);

const displayValue = (value: unknown): string =>
  typeof value === "string" && value.length > 0 ? value : "Chưa cung cấp";

const maskAccountNumber = (value: string | null | undefined): string => {
  if (!value) {
    return "Chưa cung cấp";
  }
  if (value.length <= 4) {
    return value;
  }
  return `${"•".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
};

const ProviderApplicationFacts = ({
  applicant,
  application,
}: {
  applicant: ProviderApplicationDetail["applicant"];
  application: ProviderApplication;
}) => {
  const officialChannels = application.officialChannels ?? {};
  const paymentAccount = application.paymentAccount as {
    accountName?: string;
    accountNumber?: string;
    accountType?: string;
    institution?: string;
  } | null;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Thông tin applicant và bằng chứng</CardTitle>
          <CardDescription>
            Dữ liệu private chỉ hiển thị trong khu vực Reviewer có 2FA.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <DetailField
            label="Họ và tên"
            value={displayValue(application.fullName)}
          />
          <DetailField label="Email" value={applicant.email} />
          <DetailField
            label="Bắt đầu hoạt động"
            value={displayValue(application.operatingSince)}
          />
          <DetailField
            label="Bằng chứng định danh"
            value={displayValue(application.identityEvidenceReference)}
          />
          <DetailField
            label="Bằng chứng đủ tuổi"
            value={displayValue(application.ageEvidenceReference)}
          />
          <DetailField
            label="Bằng chứng lịch sử"
            value={displayValue(application.operatingHistoryEvidenceReference)}
          />
          <DetailField
            label="Bằng chứng kênh chính thức"
            value={displayValue(application.officialChannelEvidenceReference)}
          />
          <DetailField
            label="Bằng chứng tài khoản thanh toán"
            value={displayValue(application.paymentEvidenceReference)}
          />
          <DetailField
            label="Chính sách"
            value={`${displayValue(application.policyVersion)} · ${application.policyAcceptedAt ? "Đã chấp nhận" : "Chưa chấp nhận"}`}
          />
          <DetailField
            label="Số lần resubmit"
            value={String(application.revisionCount)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kênh và dịch vụ dự kiến công khai</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          {officialChannels.avatarUrl ? (
            <div className="flex items-center gap-3">
              <span className="font-medium text-muted-foreground text-sm">
                Ảnh đại diện:
              </span>
              <img
                alt="Avatar"
                className="size-14 rounded-full border object-cover shadow-xs"
                src={officialChannels.avatarUrl}
              />
            </div>
          ) : null}
          <DetailField
            label="Lời nhắn / Ghi chú"
            value={displayValue(officialChannels.note)}
          />
          <DetailField
            label="Dịch vụ & STK công khai"
            value={displayValue(application.services)}
          />
          <DetailField
            label="Facebook"
            value={displayValue(officialChannels.facebookUrl)}
          />
          <DetailField
            label="Facebook UID"
            value={displayValue(officialChannels.facebookId)}
          />
          <DetailField
            label="Zalo"
            value={displayValue(officialChannels.zalo)}
          />
          <DetailField
            label="Nhóm Telegram"
            value={displayValue(officialChannels.telegramCommunityUrl)}
          />
          <DetailField
            label="Bio Shop"
            value={displayValue(officialChannels.bioShop)}
          />
          <DetailField
            label="Website"
            value={displayValue(officialChannels.websiteUrl)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tài khoản thanh toán đã đăng ký</CardTitle>
          <CardDescription>
            Reviewer có thể đối chiếu nhưng dữ liệu này không được đưa vào
            profile public.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <DetailField
            label="Loại"
            value={displayValue(paymentAccount?.accountType)}
          />
          <DetailField
            label="Tổ chức"
            value={displayValue(paymentAccount?.institution)}
          />
          <DetailField
            label="Tên tài khoản"
            value={displayValue(paymentAccount?.accountName)}
          />
          <DetailField
            label="Số tài khoản (che một phần)"
            value={maskAccountNumber(paymentAccount?.accountNumber)}
          />
          <DetailField
            label="Đồng ý dùng cho kiểm tra"
            value={application.paymentDisclosureConsent ? "Có" : "Không"}
          />
        </CardContent>
      </Card>

      {application.reviewReason ? (
        <Card>
          <CardHeader>
            <CardTitle>Lý do phản hồi gần nhất</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="rounded-2xl bg-muted p-4 text-sm leading-6">
              {application.reviewReason}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

const ProviderDecisionPanel = ({
  applicationId,
  status,
}: {
  applicationId: string;
  status: ProviderApplication["status"];
}) => {
  const [decision, setDecision] = useState<ProviderApplicationDecision | null>(
    null
  );
  const [reason, setReason] = useState("");
  const decideMutation = useAdminDecideProviderApplication();
  const canDecide = status === "PENDING_REVIEW";
  const requiresReason = decision !== null && decision !== "APPROVED";

  const chooseDecision = (nextDecision: ProviderApplicationDecision) => {
    setDecision(nextDecision);
    setReason("");
  };

  const confirmDecision = async () => {
    if (!decision || (requiresReason && reason.trim().length === 0)) {
      return;
    }

    try {
      await decideMutation.mutateAsync({
        decision,
        id: applicationId,
        reason: requiresReason ? reason : undefined,
      });
      toast.success("Đã cập nhật quyết định Provider.");
      setDecision(null);
      setReason("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể cập nhật hồ sơ."
      );
    }
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Quyết định Reviewer</CardTitle>
        <CardDescription>
          {canDecide
            ? "Phê duyệt sẽ tạo profile tối thiểu và phát hành stable URL trên server."
            : "Chỉ hồ sơ đang chờ duyệt mới có thể nhận quyết định."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {canDecide ? (
          <>
            <Button onClick={() => chooseDecision("APPROVED")}>
              <ShieldCheckIcon />
              Phê duyệt & phát hành
            </Button>
            <Button
              onClick={() => chooseDecision("CHANGES_REQUESTED")}
              variant="outline"
            >
              Yêu cầu chỉnh sửa
            </Button>
            <Button
              onClick={() => chooseDecision("REJECTED")}
              variant="destructive"
            >
              Từ chối hồ sơ
            </Button>
          </>
        ) : null}

        {decision ? (
          <div className="grid gap-3 rounded-xl border bg-muted/20 p-4">
            <p className="font-medium text-sm">
              Xác nhận: {STATUS_LABELS[decision]}
            </p>
            {requiresReason ? (
              <div className="grid gap-2">
                <Label htmlFor="provider-review-reason">Lý do (bắt buộc)</Label>
                <Textarea
                  id="provider-review-reason"
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Nêu rõ bằng chứng hoặc thông tin cần bổ sung..."
                  rows={4}
                  value={reason}
                />
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button
                disabled={decideMutation.isPending}
                onClick={() => setDecision(null)}
                type="button"
                variant="outline"
              >
                Hủy
              </Button>
              <Button
                disabled={
                  decideMutation.isPending ||
                  (requiresReason && reason.trim().length === 0)
                }
                onClick={confirmDecision}
                type="button"
                variant={decision === "REJECTED" ? "destructive" : "default"}
              >
                {decideMutation.isPending ? "Đang lưu..." : "Xác nhận"}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export const ProviderApplicationDetailPage = () => {
  const { applicationId } = useParams({
    from: "/_authenticated/avin-check/providers/$applicationId",
  });
  const { data, isPending } = useAdminProviderApplication(applicationId);

  if (isPending) {
    return (
      <Main className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Đang tải hồ sơ Provider...
        </p>
      </Main>
    );
  }

  if (!data) {
    return (
      <Main className="flex flex-1 flex-col items-start justify-center gap-4">
        <p className="font-medium text-primary text-sm">
          AVIN CHECK · PROVIDER
        </p>
        <h1 className="font-semibold text-3xl tracking-tight">
          Không tìm thấy hồ sơ Provider
        </h1>
        <Button render={<Link to="/avin-check/providers" />} variant="outline">
          <ArrowLeftIcon />
          Quay lại hàng đợi
        </Button>
      </Main>
    );
  }

  const { applicant, application, publicProfile } = data;
  const applicantName = application.fullName ?? applicant.name;

  return (
    <>
      <Header fixed>
        <div className="ml-auto">
          <ThemeSwitch />
        </div>
      </Header>
      <Main className="flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Button
              aria-label="Quay lại hàng đợi Provider"
              render={<Link to="/avin-check/providers" />}
              size="icon"
              variant="outline"
            >
              <ArrowLeftIcon />
            </Button>
            <div>
              <p className="font-medium text-primary text-sm">HỒ SƠ PROVIDER</p>
              <h1 className="font-semibold text-3xl tracking-tight">
                {applicantName}
              </h1>
              <p className="text-muted-foreground">
                {applicant.email} · {STATUS_LABELS[application.status]}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <ProviderApplicationFacts
            applicant={applicant}
            application={application}
          />
          <ProviderDecisionPanel
            applicationId={application.id}
            status={application.status}
          />
        </div>

        {publicProfile ? (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader>
              <CardTitle>Profile public đã phát hành</CardTitle>
              <CardDescription>
                Stable URL: {publicProfile.publicUrl}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </Main>
    </>
  );
};
