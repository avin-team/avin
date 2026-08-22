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
  useAdminDecideProviderProfileRevision,
  useAdminProviderProfileRevision,
} from "../api/provider-profile-revisions-api";

type RevisionDetail = Awaited<
  ReturnType<
    AppRouterClient["protection"]["adminProviderProfileRevisions"]["get"]
  >
>;

const STATUS_LABELS = {
  APPROVED: "Đã duyệt",
  CHANGES_REQUESTED: "Cần chỉnh sửa",
  DRAFT: "Bản nháp",
  PENDING_REVIEW: "Chờ duyệt",
  REJECTED: "Từ chối",
} as const;

const PROFILE_STATUS_LABELS = {
  ACTIVE: "Đang hoạt động",
  REMOVED_FOR_FRAUD: "Đã gỡ vì gian lận",
  SUSPENDED_PENDING_REVIEW: "Tạm ngưng, chờ xem xét",
  WITHDRAWAL_PENDING: "Đang chờ rút khỏi chương trình",
  WITHDRAWN: "Đã rút khỏi chương trình",
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

const RevisionFacts = ({ detail }: { detail: RevisionDetail }) => {
  const revision = detail.profileRevision;
  const channels = revision.officialChannels ?? {};
  const payment = revision.paymentAccount as {
    accountName?: string;
    accountNumber?: string;
    accountType?: string;
    institution?: string;
  } | null;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Thông tin revision và bằng chứng</CardTitle>
          <CardDescription>
            Đây là dữ liệu private chỉ hiển thị trong khu vực Reviewer có 2FA.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <DetailField label="Provider" value={detail.applicant.name} />
          <DetailField label="Email" value={detail.applicant.email} />
          <DetailField label="Version nền" value={revision.baseVersionId} />
          <DetailField
            label="Tên hiển thị mới"
            value={displayValue(revision.fullName)}
          />
          <DetailField
            label="Bằng chứng định danh"
            value={displayValue(revision.identityEvidenceReference)}
          />
          <DetailField
            label="Bằng chứng đủ tuổi"
            value={displayValue(revision.ageEvidenceReference)}
          />
          <DetailField
            label="Bằng chứng lịch sử"
            value={displayValue(revision.operatingHistoryEvidenceReference)}
          />
          <DetailField
            label="Bằng chứng kênh chính thức"
            value={displayValue(revision.officialChannelEvidenceReference)}
          />
          <DetailField
            label="Bằng chứng thanh toán"
            value={displayValue(revision.paymentEvidenceReference)}
          />
          <DetailField
            label="Chính sách"
            value={`${displayValue(revision.policyVersion)} · ${revision.policyAcceptedAt ? "Đã chấp nhận" : "Chưa chấp nhận"}`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dữ liệu dự kiến phát hành</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {channels.avatarUrl ? (
            <div className="flex items-center gap-3 sm:col-span-2">
              <span className="font-medium text-muted-foreground text-sm">
                Ảnh đại diện:
              </span>
              <img
                alt="Avatar"
                className="size-14 rounded-full border object-cover shadow-xs"
                src={channels.avatarUrl}
              />
            </div>
          ) : null}
          <DetailField
            label="Lời nhắn / Ghi chú"
            value={displayValue(channels.note)}
          />
          <DetailField
            label="Dịch vụ & STK công khai"
            value={displayValue(revision.services)}
          />
          <DetailField
            label="Facebook"
            value={displayValue(channels.facebookUrl)}
          />
          <DetailField
            label="Facebook UID"
            value={displayValue(channels.facebookId)}
          />
          <DetailField label="Zalo" value={displayValue(channels.zalo)} />
          <DetailField
            label="Telegram cộng đồng"
            value={displayValue(channels.telegramCommunityUrl)}
          />
          <DetailField
            label="Bio Shop"
            value={displayValue(channels.bioShop)}
          />
          <DetailField
            label="Website"
            value={displayValue(channels.websiteUrl)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tài khoản thanh toán đã đăng ký</CardTitle>
          <CardDescription>
            Dữ liệu này chỉ dùng cho re-verification, không đưa vào public
            version.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <DetailField
            label="Loại"
            value={displayValue(payment?.accountType)}
          />
          <DetailField
            label="Tổ chức"
            value={displayValue(payment?.institution)}
          />
          <DetailField
            label="Tên tài khoản"
            value={displayValue(payment?.accountName)}
          />
          <DetailField
            label="Số tài khoản (che một phần)"
            value={maskAccountNumber(payment?.accountNumber)}
          />
        </CardContent>
      </Card>

      {revision.reviewReason ? (
        <Card>
          <CardHeader>
            <CardTitle>Lý do phản hồi gần nhất</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="rounded-2xl bg-muted p-4 text-sm leading-6">
              {revision.reviewReason}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

const RevisionDecisionPanel = ({
  revisionId,
  status,
}: {
  revisionId: string;
  status: RevisionDetail["profileRevision"]["status"];
}) => {
  const [decision, setDecision] = useState<ProviderApplicationDecision | null>(
    null
  );
  const [reason, setReason] = useState("");
  const decideMutation = useAdminDecideProviderProfileRevision();
  const canDecide = status === "PENDING_REVIEW";
  const requiresReason = decision !== null && decision !== "APPROVED";

  const confirmDecision = async () => {
    if (!decision || (requiresReason && reason.trim().length === 0)) {
      return;
    }

    try {
      await decideMutation.mutateAsync({
        decision,
        id: revisionId,
        reason: requiresReason ? reason : undefined,
      });
      toast.success("Đã cập nhật quyết định revision Provider.");
      setDecision(null);
      setReason("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể cập nhật revision."
      );
    }
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Quyết định Reviewer</CardTitle>
        <CardDescription>
          {canDecide
            ? "Phê duyệt sẽ tạo version public immutable kế tiếp."
            : "Chỉ revision đang chờ duyệt mới có thể nhận quyết định."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {canDecide ? (
          <>
            <Button onClick={() => setDecision("APPROVED")}>
              <ShieldCheckIcon />
              Phê duyệt & phát hành version mới
            </Button>
            <Button
              onClick={() => setDecision("CHANGES_REQUESTED")}
              variant="outline"
            >
              Yêu cầu chỉnh sửa
            </Button>
            <Button
              onClick={() => setDecision("REJECTED")}
              variant="destructive"
            >
              Từ chối yêu cầu
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
                <Label htmlFor="provider-revision-review-reason">
                  Lý do (bắt buộc)
                </Label>
                <Textarea
                  id="provider-revision-review-reason"
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

export const ProviderProfileRevisionDetailPage = () => {
  const { revisionId } = useParams({
    from: "/_authenticated/avin-check/provider-revisions/$revisionId",
  });
  const revisionQuery = useAdminProviderProfileRevision(revisionId);

  return (
    <>
      <Header fixed>
        <div className="ml-auto">
          <ThemeSwitch />
        </div>
      </Header>
      <Main className="flex flex-1 flex-col gap-6">
        <Button
          render={<Link to="/avin-check/provider-revisions" />}
          className="w-fit"
          variant="ghost"
        >
          <ArrowLeftIcon />
          Quay lại hàng đợi
        </Button>
        {revisionQuery.isPending ? (
          <output aria-live="polite">Đang tải revision Provider...</output>
        ) : null}
        {revisionQuery.isError ? (
          <p className="text-destructive" role="alert">
            Không thể tải revision Provider.
          </p>
        ) : null}
        {revisionQuery.data ? (
          <>
            <div>
              <p className="font-medium text-primary text-sm">
                AVIN CHECK · PROFILE REVISION
              </p>
              <h1 className="mt-1 font-semibold text-3xl tracking-tight">
                {revisionQuery.data.profileRevision.fullName ??
                  revisionQuery.data.applicant.name}
              </h1>
              <p className="mt-2 text-muted-foreground">
                Revision {revisionQuery.data.profileRevision.revisionNumber} ·{" "}
                {STATUS_LABELS[revisionQuery.data.profileRevision.status]}
              </p>
            </div>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <RevisionFacts detail={revisionQuery.data} />
              <div className="grid content-start gap-6">
                <RevisionDecisionPanel
                  revisionId={revisionId}
                  status={revisionQuery.data.profileRevision.status}
                />
                <Card>
                  <CardHeader>
                    <CardTitle>Public version hiện tại</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm">
                    <p>
                      Version {revisionQuery.data.publicProfile.versionNumber} ·{" "}
                      {
                        PROFILE_STATUS_LABELS[
                          revisionQuery.data.publicProfile.status
                        ]
                      }
                    </p>
                    <a
                      className="text-primary underline underline-offset-4"
                      href={`/avin-check/provider/${revisionQuery.data.publicProfile.profileSlug}`}
                    >
                      Mở profile public
                    </a>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        ) : null}
      </Main>
    </>
  );
};
