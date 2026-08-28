import {
  calculateRecommendedTransactionLimit,
  getProviderTier,
  providerTierLabel as providerTierLabels,
} from "@avin/api/protection/provider-tier";
import { Button } from "@avin/ui/components/button";
import { Input } from "@avin/ui/components/input";
import {
  ArrowLeftIcon,
  CheckCircle,
  Clock,
  ShieldCheck,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Shell } from "@/components/shell";

import {
  useProviderBondWithdrawalActions,
  useProviderBondActions,
  useProviderProfileRevisionActions,
  useProviderProtectionPolicyActions,
  useProviderWorkspace,
} from "../api/provider-api";
import type { ProviderWorkspace } from "../api/provider-api";
import {
  ProviderApplicationForm,
  ProviderApplicationFormSkeleton,
} from "../components/provider-application-form";
import { ProviderRiskIncidentPanel } from "../components/provider-risk-incident-panel";

const PROFILE_STATUS_LABELS = {
  ACTIVE: "Đang hoạt động",
  REMOVED_FOR_FRAUD: "Đã gỡ do vi phạm",
  SUSPENDED_PENDING_REVIEW: "Tạm ngưng, chờ xét duyệt",
  WITHDRAWAL_PENDING: "Đang chờ rút quỹ bảo hiểm",
  WITHDRAWN: "Đã ngừng hợp tác",
} as const;

const BOND_WITHDRAWAL_STATUS_LABELS = {
  COMPLETED: "Đã hoàn tất thanh toán",
  COOLING: "Đang chờ đối soát (30 ngày)",
  PENDING_APPROVAL: "Chờ quản trị viên duyệt",
  REJECTED: "Đã bị từ chối",
} as const;

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  currency: "VND",
  maximumFractionDigits: 0,
  style: "currency",
});

const getCurrentPolicyVersion = (
  workspace: ProviderWorkspace | undefined
): string | undefined => workspace?.policy?.version;

const ProviderPolicyPanel = ({
  policy,
}: {
  policy: ProviderWorkspace["policy"];
}) => {
  const { accept } = useProviderProtectionPolicyActions();
  if (!policy || !policy.requiresReacceptance) {
    return null;
  }

  const acceptPolicy = async () => {
    try {
      await accept.mutateAsync({ policyVersionId: policy.id });
      toast.success("Đã ghi nhận việc chấp nhận chính sách hiện hành.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể ghi nhận việc chấp nhận chính sách."
      );
    }
  };

  return (
    <article className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-medium text-primary text-sm">
            Chính sách & Quy chế
          </p>
          <h2 className="mt-1 font-semibold text-xl">
            {policy.title} · {policy.version}
          </h2>
          <p className="mt-2 text-muted-foreground text-sm">
            Có hiệu lực từ{" "}
            {new Date(policy.effectiveAt).toLocaleString("vi-VN")}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm">{policy.summary}</p>
      {policy.acceptanceOverdue ? (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">
          Đã quá hạn chấp nhận. Hồ sơ bị tạm ngưng để Quản trị viên xem xét.
        </p>
      ) : (
        <Button
          className="mt-4"
          disabled={accept.isPending}
          onClick={() => void acceptPolicy()}
          type="button"
        >
          {accept.isPending
            ? "Đang ghi nhận..."
            : "Chấp nhận chính sách hiện hành"}
        </Button>
      )}
    </article>
  );
};

const ProviderProfileRevisionPanel = ({
  currentPolicyVersion,
  profileRevision,
  publicProfile,
}: {
  currentPolicyVersion?: string;
  profileRevision: ProviderWorkspace["profileRevision"];
  publicProfile: ProviderWorkspace["publicProfile"];
}) => {
  const { start: startRevision } = useProviderProfileRevisionActions();
  const canEditRevision =
    profileRevision?.status === "DRAFT" ||
    profileRevision?.status === "CHANGES_REQUESTED";
  const canStartRevision = Boolean(
    publicProfile &&
    (!profileRevision ||
      profileRevision.status === "APPROVED" ||
      profileRevision.status === "REJECTED")
  );

  const handleStartRevision = async () => {
    try {
      await startRevision.mutateAsync({});
      toast.success("Đã tạo bản nháp yêu cầu cập nhật hồ sơ.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể tạo yêu cầu cập nhật hồ sơ."
      );
    }
  };

  return (
    <>
      {profileRevision?.status === "PENDING_REVIEW" ? (
        <article className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 shadow-sm">
          <h2 className="font-semibold text-xl">
            Yêu cầu cập nhật hồ sơ đang chờ xét duyệt
          </h2>
          <p className="mt-2 text-muted-foreground text-sm">
            Hồ sơ công khai hiện tại vẫn giữ nguyên cho tới khi Quản trị viên
            phê duyệt bản cập nhật mới.
          </p>
        </article>
      ) : null}

      {canStartRevision ? (
        <article className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="font-semibold text-xl">Cập nhật hồ sơ công khai</h2>
          <p className="mt-2 text-muted-foreground text-sm">
            Đối tác có thể gửi yêu cầu chỉnh sửa thông tin. Mọi thay đổi về định
            danh, kênh liên hệ hoặc dịch vụ sẽ được duyệt lại để đảm bảo tính
            chính xác.
          </p>
          <Button
            className="mt-4"
            disabled={startRevision.isPending}
            onClick={handleStartRevision}
            type="button"
          >
            {startRevision.isPending
              ? "Đang tạo bản nháp..."
              : "Yêu cầu chỉnh sửa hồ sơ"}
          </Button>
        </article>
      ) : null}

      {canEditRevision && profileRevision ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-xs">
            <h2 className="font-semibold text-lg">
              Cập nhật hồ sơ đối tác · Bản {profileRevision.revisionNumber}
            </h2>
            <p className="mt-1 text-muted-foreground text-xs">
              Hồ sơ công khai hiện tại giữ nguyên cho tới khi bản cập nhật này
              được duyệt.
            </p>
          </div>
          <ProviderApplicationForm
            application={profileRevision}
            currentPolicyVersion={currentPolicyVersion}
            key={profileRevision.id}
            mode="revision"
          />
        </div>
      ) : null}
    </>
  );
};

const ProviderBondSummary = ({
  bond,
  depositIntent,
  withdrawal,
}: {
  bond: NonNullable<ProviderWorkspace["bond"]>;
  depositIntent: ProviderWorkspace["depositIntent"];
  withdrawal: ProviderWorkspace["bondWithdrawal"];
}) => {
  const { request } = useProviderBondWithdrawalActions();
  const { createTopUpIntent } = useProviderBondActions();
  const [topUpAmount, setTopUpAmount] = useState(1_000_000);

  const createTopUp = async () => {
    try {
      await createTopUpIntent.mutateAsync({ amount: topUpAmount });
      toast.success(
        "Đã tạo lệnh nạp thêm vào quỹ đảm bảo. Hãy chuyển đúng số tiền trong 24 giờ."
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể tạo lệnh nạp vào quỹ đảm bảo."
      );
    }
  };

  const requestWithdrawal = async () => {
    try {
      await request.mutateAsync({
        reason: "Đối tác yêu cầu rút toàn bộ quỹ đảm bảo.",
      });
      toast.success(
        "Đã gửi yêu cầu rút quỹ đảm bảo; thời gian đối soát bắt đầu từ hôm nay."
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể gửi yêu cầu rút quỹ đảm bảo."
      );
    }
  };

  return (
    <article className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-xl">Quỹ đảm bảo của Đối tác</h2>
          <p className="mt-2 text-muted-foreground text-sm">
            Số tiền Avin đã xác nhận trong quỹ đảm bảo, dùng để xác định hạng và
            hạn mức giao dịch đề xuất.
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-2xl">
            {vndFormatter.format(bond.recognizedAmount)}
          </p>
          <p className="text-muted-foreground text-xs">
            Số tiền quỹ đảm bảo đã xác nhận
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="font-medium">Hạn mức khuyến nghị / giao dịch</p>
          <p className="mt-1 text-muted-foreground">
            {vndFormatter.format(bond.recommendedTransactionLimit)}
          </p>
        </div>
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="font-medium">Lịch sử biến động</p>
          <p className="mt-1 text-muted-foreground">
            {bond.adjustments.length} bản ghi xác nhận
          </p>
        </div>
      </div>
      <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <p className="font-medium">Nạp thêm vào quỹ đảm bảo</p>
        <p className="mt-1 text-muted-foreground">
          Tạo một lệnh riêng và chuyển đúng số tiền theo QR trong 24 giờ. Hệ
          thống tự cập nhật hạng và hạn mức sau khi đối soát.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            className="max-w-48"
            inputMode="numeric"
            min={1_000_000}
            onChange={(event) =>
              setTopUpAmount(
                Number(event.target.value.replaceAll(/\D/gu, "")) || 0
              )
            }
            type="number"
            value={topUpAmount || ""}
          />
          <Button
            disabled={createTopUpIntent.isPending || topUpAmount < 1_000_000}
            onClick={() => void createTopUp()}
            type="button"
            variant="outline"
          >
            {createTopUpIntent.isPending
              ? "Đang tạo..."
              : "Tạo lệnh nạp vào quỹ đảm bảo"}
          </Button>
        </div>
        {depositIntent?.kind === "TOP_UP" &&
        depositIntent.status === "PENDING" ? (
          <div className="mt-3 rounded-xl border bg-background p-3 text-sm">
            <p>
              Lệnh đang chờ:{" "}
              <strong>{vndFormatter.format(depositIntent.amount)}</strong>
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              Nội dung: {depositIntent.paymentCode}
            </p>
            {depositIntent.qrUrl ? (
              <img
                alt="Mã QR nạp thêm vào quỹ đảm bảo"
                className="mt-3 size-44 rounded-xl border bg-white p-2"
                src={depositIntent.qrUrl}
              />
            ) : null}
          </div>
        ) : null}
        <p className="mt-5 font-medium">Rút toàn bộ quỹ đảm bảo</p>
        <p className="mt-1 text-muted-foreground">
          Yêu cầu rút toàn bộ quỹ đảm bảo sẽ cần 30 ngày đối soát để xử lý các
          giao dịch còn tồn đọng.
        </p>
        {withdrawal ? (
          <div className="mt-3 grid gap-1 text-muted-foreground">
            <p>
              Trạng thái: {BOND_WITHDRAWAL_STATUS_LABELS[withdrawal.status]}
            </p>
            <p>
              Thời gian yêu cầu:{" "}
              {new Date(withdrawal.requestedAt).toLocaleString("vi-VN")}
            </p>
            <p>
              Đối soát đến ngày:{" "}
              {new Date(withdrawal.coolingEndsAt).toLocaleString("vi-VN")}
            </p>
            <p>
              Số tiền bảo hiểm tại thời điểm yêu cầu:{" "}
              {vndFormatter.format(withdrawal.recognizedAmountAtRequest)}
            </p>
            {withdrawal.returnedAmount !== null && (
              <p>
                Số tiền đã hoàn trả:{" "}
                {vndFormatter.format(withdrawal.returnedAmount)}
              </p>
            )}
            {withdrawal.rejectionReason ? (
              <p className="text-destructive">{withdrawal.rejectionReason}</p>
            ) : null}
          </div>
        ) : (
          <Button
            className="mt-3"
            disabled={request.isPending || bond.recognizedAmount <= 0}
            onClick={() => void requestWithdrawal()}
            type="button"
            variant="outline"
          >
            {request.isPending ? "Đang gửi..." : "Yêu cầu rút quỹ bảo hiểm"}
          </Button>
        )}
      </div>
    </article>
  );
};

const SubmittedOfficialChannels = ({
  channels,
}: {
  channels: NonNullable<ProviderWorkspace["application"]>["officialChannels"];
}) => {
  if (!channels) {
    return null;
  }
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-foreground text-sm">
        Kênh liên hệ chính thức
      </h4>
      <div className="grid gap-2 text-xs sm:grid-cols-2">
        {channels.hotline ? (
          <div className="rounded-xl border bg-background p-3">
            <span className="text-muted-foreground">Hotline / SĐT:</span>{" "}
            <strong className="text-foreground">{channels.hotline}</strong>
          </div>
        ) : null}
        {channels.zalo ? (
          <div className="rounded-xl border bg-background p-3">
            <span className="text-muted-foreground">Zalo:</span>{" "}
            <strong className="text-foreground">{channels.zalo}</strong>
          </div>
        ) : null}
        {channels.facebookUrl ? (
          <div className="rounded-xl border bg-background p-3">
            <span className="text-muted-foreground">Facebook:</span>{" "}
            <a
              className="font-medium text-primary underline"
              href={channels.facebookUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {channels.facebookUrl}
            </a>
          </div>
        ) : null}
        {channels.telegramCommunityUrl ? (
          <div className="rounded-xl border bg-background p-3">
            <span className="text-muted-foreground">Telegram:</span>{" "}
            <a
              className="font-medium text-primary underline"
              href={channels.telegramCommunityUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {channels.telegramCommunityUrl}
            </a>
          </div>
        ) : null}
        {channels.tiktokUrl ? (
          <div className="rounded-xl border bg-background p-3">
            <span className="text-muted-foreground">TikTok:</span>{" "}
            <a
              className="font-medium text-primary underline"
              href={channels.tiktokUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {channels.tiktokUrl}
            </a>
          </div>
        ) : null}
        {channels.websiteUrl ? (
          <div className="rounded-xl border bg-background p-3">
            <span className="text-muted-foreground">Website:</span>{" "}
            <a
              className="font-medium text-primary underline"
              href={channels.websiteUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {channels.websiteUrl}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const SubmittedBankAccounts = ({
  bankAccounts,
}: {
  bankAccounts: NonNullable<
    ProviderWorkspace["application"]
  >["registeredBankAccounts"];
}) => {
  if (!bankAccounts || bankAccounts.length === 0) {
    return null;
  }
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-foreground text-sm">
        Tài khoản ngân hàng đăng ký
      </h4>
      <div className="grid gap-2 text-xs sm:grid-cols-2">
        {bankAccounts.map((acc) => (
          <div
            className="flex items-center justify-between rounded-xl border bg-background p-3"
            key={`${acc.bankCode}-${acc.accountNumber}`}
          >
            <div>
              <p className="font-bold text-foreground">
                {acc.bankCode} - {acc.accountNumber}
              </p>
              <p className="text-muted-foreground">{acc.accountName}</p>
            </div>
            {acc.isPrimary ? (
              <span className="rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
                Tài khoản chính
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

const SubmittedDetailsSummary = ({
  application,
}: {
  application: NonNullable<ProviderWorkspace["application"]>;
}) => {
  const recognizedBond =
    application.recognizedBondAmount || application.bondAmount || 0;
  const tier = application.tier ?? getProviderTier(recognizedBond);

  return (
    <section
      aria-labelledby="submitted-details-heading"
      className="space-y-6 rounded-3xl border bg-card p-6 shadow-sm sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-border/60 border-b pb-4">
        <div>
          <h3
            className="font-bold text-foreground text-lg"
            id="submitted-details-heading"
          >
            Thông tin hồ sơ đã gửi
          </h3>
          <p className="text-muted-foreground text-xs">
            Các thông tin định danh, kênh liên hệ và quỹ đảm bảo đã đăng ký.
          </p>
        </div>
        {application.submittedAt ? (
          <span className="text-muted-foreground text-xs">
            Thời gian gửi:{" "}
            {new Date(application.submittedAt).toLocaleString("vi-VN")}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border bg-muted/20 p-4">
          <p className="text-muted-foreground text-xs">Họ và tên đối tác</p>
          <p className="mt-1 font-semibold text-foreground text-base">
            {application.fullName || "Chưa cập nhật"}
          </p>
          {application.bio ? (
            <p className="mt-1 text-muted-foreground text-xs italic">
              &ldquo;{application.bio}&rdquo;
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border bg-muted/20 p-4">
          <p className="text-muted-foreground text-xs">Địa điểm hoạt động</p>
          <p className="mt-1 font-semibold text-foreground text-base">
            {application.location || "Chưa cập nhật"}
          </p>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-muted-foreground text-xs">
                Quỹ đảm bảo đã nạp · Hạng đối tác dự kiến
              </p>
              <p className="mt-1 font-bold text-primary text-xl">
                {vndFormatter.format(recognizedBond)} · Hạng{" "}
                {providerTierLabels[tier] ?? tier}
              </p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-xs">
                Hạn mức khuyến nghị / giao dịch
              </p>
              <p className="mt-1 font-semibold text-foreground text-sm">
                {vndFormatter.format(
                  application.recommendedTransactionLimit ||
                    calculateRecommendedTransactionLimit({
                      recognizedBondAmount: recognizedBond,
                    })
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <SubmittedOfficialChannels channels={application.officialChannels} />
      <SubmittedBankAccounts
        bankAccounts={application.registeredBankAccounts}
      />

      {application.services ? (
        <div className="space-y-2">
          <h4 className="font-semibold text-foreground text-sm">
            Dịch vụ cung cấp
          </h4>
          <div className="whitespace-pre-wrap rounded-2xl border bg-muted/10 p-4 text-muted-foreground text-xs leading-relaxed">
            {application.services}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-border/60 border-t pt-4">
        <Link
          className="inline-flex items-center gap-1.5 font-medium text-primary text-sm underline underline-offset-4"
          to="/avin-check/directory"
        >
          Khám phá danh bạ Đối tác Avin Check →
        </Link>
        <Link
          className="text-muted-foreground text-xs hover:text-foreground"
          to="/avin-check/partner-policy"
        >
          Xem Quy chế hoạt động Đối tác
        </Link>
      </div>
    </section>
  );
};

const ProviderApplicationPendingReviewPanel = ({
  application,
}: {
  application: NonNullable<ProviderWorkspace["application"]>;
}) => {
  const recognizedBond =
    application.recognizedBondAmount || application.bondAmount || 0;

  return (
    <div className="space-y-6">
      <article
        className="rounded-3xl border border-amber-500/40 bg-linear-to-br from-amber-500/10 via-amber-500/5 to-transparent p-6 shadow-sm sm:p-8"
        data-testid="provider-application-pending-review"
      >
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500">
            <Clock className="size-7" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-medium text-emerald-600 text-xs dark:text-emerald-400">
                <CheckCircle className="size-3.5" />
                Đã thanh toán quỹ đảm bảo
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 font-medium text-amber-700 text-xs dark:text-amber-300">
                <Clock className="size-3.5" />
                Đang chờ xét duyệt
              </span>
            </div>
            <h2 className="font-bold text-2xl text-foreground sm:text-3xl">
              Đăng ký đối tác thành công
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
              Hồ sơ đăng ký của bạn đã được ghi nhận và đang trong hàng đợi kiểm
              duyệt của Reviewer Avin Check. Thời gian xét duyệt thường trong
              vòng <strong>24 giờ làm việc</strong>.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 border-border/60 border-t pt-6 sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-background/80 p-4">
            <CheckCircle className="mt-0.5 size-5 shrink-0 text-emerald-500" />
            <div>
              <p className="font-semibold text-foreground text-xs">
                1. Nộp hồ sơ & Quỹ đảm bảo
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                Đã hoàn tất thanh toán {vndFormatter.format(recognizedBond)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <Clock className="mt-0.5 size-5 shrink-0 text-amber-500 animate-pulse" />
            <div>
              <p className="font-semibold text-amber-600 text-xs dark:text-amber-400">
                2. Kiểm duyệt hồ sơ
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                Reviewer đang đối soát danh tính & kênh liên hệ
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-background/50 p-4 opacity-75">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-semibold text-muted-foreground text-xs">
                3. Phát hành hồ sơ & Huy hiệu
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                Công khai trên danh bạ Đối tác Avin Check
              </p>
            </div>
          </div>
        </div>
      </article>

      <SubmittedDetailsSummary application={application} />
    </div>
  );
};

const InactiveOrApprovedWorkspaceContent = ({
  applicationStatus,
  currentPolicyVersion,
  workspaceData,
}: {
  applicationStatus: string | undefined;
  currentPolicyVersion: string | undefined;
  workspaceData: NonNullable<ProviderWorkspace>;
}) => (
  <>
    {applicationStatus === "PENDING_REVIEW" && workspaceData.application ? (
      <ProviderApplicationPendingReviewPanel
        application={workspaceData.application}
      />
    ) : null}

    {applicationStatus === "PENDING_REVIEW" && !workspaceData.application ? (
      <article className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 shadow-sm">
        <h2 className="font-semibold text-xl">Hồ sơ đang chờ xét duyệt</h2>
        <p className="mt-2 text-muted-foreground text-sm">
          Đơn đăng ký đối tác của bạn đã được gửi và đang trong hàng đợi kiểm
          duyệt bởi Reviewer.
        </p>
      </article>
    ) : null}

    {applicationStatus === "REJECTED" ? (
      <article className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 shadow-sm">
        <h2 className="font-semibold text-destructive text-xl">
          Hồ sơ đã bị từ chối
        </h2>
        {workspaceData.application?.reviewReason ? (
          <p className="mt-2 text-muted-foreground text-sm">
            <strong>Lý do từ chối:</strong>{" "}
            {workspaceData.application.reviewReason}
          </p>
        ) : null}
      </article>
    ) : null}

    {applicationStatus === "APPROVED" && workspaceData.publicProfile ? (
      <article
        className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 shadow-sm"
        data-testid="provider-profile-approved"
      >
        <h2 className="font-semibold text-xl">Hồ sơ công khai đã phát hành</h2>
        <p className="mt-2 text-muted-foreground text-sm">
          Phiên bản hiện tại: {workspaceData.publicProfile.versionNumber} ·{" "}
          {PROFILE_STATUS_LABELS[workspaceData.publicProfile.status]}
        </p>
        <a
          className="mt-4 inline-flex font-medium text-primary text-sm underline underline-offset-4"
          href={workspaceData.publicProfile.publicUrl}
        >
          Xem hồ sơ công khai
        </a>
      </article>
    ) : null}

    <ProviderProfileRevisionPanel
      currentPolicyVersion={currentPolicyVersion}
      profileRevision={workspaceData.profileRevision}
      publicProfile={workspaceData.publicProfile}
    />

    <ProviderPolicyPanel policy={workspaceData.policy} />

    {workspaceData.bond ? (
      <ProviderBondSummary
        bond={workspaceData.bond}
        depositIntent={workspaceData.depositIntent}
        withdrawal={workspaceData.bondWithdrawal}
      />
    ) : null}

    <ProviderRiskIncidentPanel incidents={workspaceData.riskIncidents ?? []} />
  </>
);

export const ProviderWorkspacePage = () => {
  const workspace = useProviderWorkspace();
  const currentPolicyVersion = getCurrentPolicyVersion(workspace.data);
  const applicationStatus = workspace.data?.application?.status;
  const canEditApplication =
    applicationStatus === undefined ||
    applicationStatus === "DRAFT" ||
    applicationStatus === "CHANGES_REQUESTED";

  return (
    <Shell
      aria-label="Khu vực đối tác Avin Check"
      as="section"
      className="flex w-full flex-col items-start gap-6"
    >
      <Link
        className="inline-flex items-center gap-1.5 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
        to="/avin-check/directory"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Quay lại
      </Link>

      {workspace.isPending ? <ProviderApplicationFormSkeleton /> : null}

      {workspace.isError ? (
        <p className="text-destructive" role="alert">
          Không thể tải thông tin đối tác. Vui lòng thử lại.
        </p>
      ) : null}

      {workspace.data ? (
        <div className="grid w-full gap-6">
          {canEditApplication ? (
            <>
              {workspace.data.application?.reviewReason ? (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm">
                  <p className="font-bold text-foreground">
                    Yêu cầu bổ sung từ Reviewer:
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {workspace.data.application.reviewReason}
                  </p>
                </div>
              ) : null}

              <ProviderApplicationForm
                application={workspace.data.application}
                currentPolicyVersion={currentPolicyVersion}
              />
            </>
          ) : (
            <InactiveOrApprovedWorkspaceContent
              applicationStatus={applicationStatus}
              currentPolicyVersion={currentPolicyVersion}
              workspaceData={workspace.data}
            />
          )}
        </div>
      ) : null}
    </Shell>
  );
};
