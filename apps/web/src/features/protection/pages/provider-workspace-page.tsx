import { Button } from "@avin/ui/components/button";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Shell } from "@/components/shell";

import {
  useProviderBondWithdrawalActions,
  useProviderProfileRevisionActions,
  useProviderProtectionPolicyActions,
  useProviderWorkspace,
} from "../api/provider-api";
import type { ProviderWorkspace } from "../api/provider-api";
import { ProviderApplicationForm } from "../components/provider-application-form";
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
  withdrawal,
}: {
  bond: NonNullable<ProviderWorkspace["bond"]>;
  withdrawal: ProviderWorkspace["bondWithdrawal"];
}) => {
  const { request } = useProviderBondWithdrawalActions();

  const requestWithdrawal = async () => {
    try {
      await request.mutateAsync({
        reason: "Đối tác yêu cầu rút toàn bộ tiền bảo hiểm ký quỹ.",
      });
      toast.success(
        "Đã gửi yêu cầu rút tiền ký quỹ; thời gian đối soát bắt đầu từ hôm nay."
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể gửi yêu cầu rút tiền ký quỹ."
      );
    }
  };

  return (
    <article className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-xl">Quỹ Bảo Hiểm Ký Quỹ (Bond)</h2>
          <p className="mt-2 text-muted-foreground text-sm">
            Số tiền bảo hiểm được Avin xác nhận lưu ký để bảo vệ quyền lợi người
            mua khi giao dịch.
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-2xl">
            {vndFormatter.format(bond.recognizedAmount)}
          </p>
          <p className="text-muted-foreground text-xs">Tiền bảo hiểm ký quỹ</p>
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
        <p className="font-medium">Rút quỹ bảo hiểm</p>
        <p className="mt-1 text-muted-foreground">
          Yêu cầu rút quỹ sẽ có thời gian đối soát 30 ngày để đảm bảo không phát
          sinh khiếu nại giao dịch tồn đọng. Phí thẩm định duy trì không hoàn
          lại.
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
    {applicationStatus === "PENDING_REVIEW" ? (
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
      <article className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 shadow-sm">
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
      aria-labelledby="provider-workspace-title"
      as="section"
      className="flex w-full flex-col items-start gap-6"
    >
      <Link
        className="inline-flex items-center gap-1.5 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
        to="/avin-check"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Quay lại
      </Link>

      <header className="flex w-full max-w-3xl flex-col items-start gap-2 text-left">
        <p className="font-medium text-primary text-sm">Avin Check</p>
        <h1
          className="font-bold text-3xl tracking-tight text-foreground"
          id="provider-workspace-title"
        >
          Không gian riêng của Đối tác Avin
        </h1>
        <p className="text-muted-foreground">
          Đăng ký và quản lý hồ sơ xác minh uy tín đối tác giao dịch an toàn
          trên Avin Check.
        </p>
      </header>

      {workspace.isPending ? (
        <output aria-live="polite">Đang tải hồ sơ đối tác...</output>
      ) : null}

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
                key={
                  workspace.data.application?.id ?? "new-provider-application"
                }
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
