import { Button } from "@avin/ui/components/button";
import { toast } from "sonner";

import {
  useProviderNotifications,
  useProviderProfileRevisionActions,
  useProviderWorkspace,
} from "../api/provider-api";
import type { ProviderWorkspace } from "../api/provider-api";
import { ProviderApplicationForm } from "../components/provider-application-form";

const APPLICATION_STATUS_LABELS = {
  APPROVED: "Đã được duyệt",
  CHANGES_REQUESTED: "Cần bổ sung/chỉnh sửa",
  DRAFT: "Bản nháp",
  PENDING_REVIEW: "Đang chờ Reviewer",
  REJECTED: "Đã bị từ chối",
} as const;

const PROFILE_STATUS_LABELS = {
  ACTIVE: "Đang hoạt động",
  REMOVED_FOR_FRAUD: "Đã gỡ vì gian lận",
  SUSPENDED_PENDING_REVIEW: "Tạm ngưng, chờ xem xét",
  WITHDRAWAL_PENDING: "Đang chờ rút khỏi chương trình",
  WITHDRAWN: "Đã rút khỏi chương trình",
} as const;

const ProviderProfileRevisionPanel = ({
  profileRevision,
  publicProfile,
}: {
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
      toast.success("Đã tạo bản nháp yêu cầu cập nhật profile.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể tạo yêu cầu cập nhật profile."
      );
    }
  };

  return (
    <>
      {profileRevision?.status === "PENDING_REVIEW" ? (
        <article className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 shadow-sm">
          <h2 className="font-semibold text-xl">
            Yêu cầu cập nhật profile đang chờ duyệt
          </h2>
          <p className="mt-2 text-muted-foreground text-sm">
            Version public hiện tại vẫn là nguồn chính thức cho tới khi Reviewer
            phát hành version mới.
          </p>
        </article>
      ) : null}

      {canStartRevision ? (
        <article className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="font-semibold text-xl">Cập nhật profile công khai</h2>
          <p className="mt-2 text-muted-foreground text-sm">
            Provider chỉ có thể gửi yêu cầu. Mọi thay đổi định danh, dịch vụ
            hoặc thanh toán đều phải được Reviewer xác minh lại.
          </p>
          <Button
            className="mt-4"
            disabled={startRevision.isPending}
            onClick={handleStartRevision}
            type="button"
          >
            {startRevision.isPending
              ? "Đang tạo bản nháp..."
              : "Yêu cầu chỉnh sửa profile"}
          </Button>
        </article>
      ) : null}

      {canEditRevision && profileRevision ? (
        <article className="rounded-2xl border border-primary/30 bg-primary/5 p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="font-semibold text-xl">
              Yêu cầu cập nhật profile · bản {profileRevision.revisionNumber}
            </h2>
            <p className="mt-2 text-muted-foreground text-sm">
              Bản public hiện tại không thay đổi trong lúc yêu cầu này chờ
              duyệt.
            </p>
          </div>
          <ProviderApplicationForm
            application={profileRevision}
            key={profileRevision.id}
            mode="revision"
          />
        </article>
      ) : null}
    </>
  );
};

export const ProviderWorkspacePage = () => {
  const workspace = useProviderWorkspace();
  const notifications = useProviderNotifications();
  const applicationStatus = workspace.data?.application?.status;
  const canEditApplication =
    applicationStatus === undefined ||
    applicationStatus === "DRAFT" ||
    applicationStatus === "CHANGES_REQUESTED";

  return (
    <section
      aria-labelledby="provider-workspace-title"
      className="flex flex-col gap-8"
    >
      <header className="flex max-w-3xl flex-col gap-2">
        <p className="font-medium text-primary text-sm">Avin Check</p>
        <h1
          className="font-bold text-3xl tracking-tight"
          id="provider-workspace-title"
        >
          Không gian riêng của Đối tác Avin
        </h1>
        <p className="text-muted-foreground">
          Khu vực này chỉ dành cho Provider. Không có số dư marketplace, thao
          tác Seller, thao tác Buyer hoặc quy trình Admin trong workspace này.
        </p>
      </header>

      {workspace.isPending ? (
        <output aria-live="polite">Đang tải hồ sơ Provider...</output>
      ) : null}

      {workspace.isError ? (
        <p className="text-destructive" role="alert">
          Không thể tải workspace Provider. Vui lòng thử lại.
        </p>
      ) : null}

      {workspace.data ? (
        <div className="grid gap-6">
          <article className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-xl">Hồ sơ Provider riêng</h2>
            <p className="mt-2 text-muted-foreground text-sm">
              {workspace.data.identity.name} · mã tài khoản{" "}
              {workspace.data.identity.id}
            </p>
            <p className="mt-4 text-sm">
              Dữ liệu này có phạm vi <strong>riêng tư</strong> và chỉ xuất hiện
              trong workspace của Provider.
            </p>
          </article>

          {workspace.data.application?.status ? (
            <article className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <h2 className="font-semibold text-xl">Trạng thái hồ sơ</h2>
              <p className="mt-2 text-muted-foreground text-sm">
                {APPLICATION_STATUS_LABELS[workspace.data.application.status]}
              </p>
              {workspace.data.application.reviewReason ? (
                <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                  <strong>Lý do của Reviewer:</strong>{" "}
                  {workspace.data.application.reviewReason}
                </p>
              ) : null}
            </article>
          ) : null}

          {workspace.data.application?.status === "APPROVED" &&
          workspace.data.publicProfile ? (
            <article className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 shadow-sm">
              <h2 className="font-semibold text-xl">
                Hồ sơ công khai đã phát hành
              </h2>
              <p className="mt-2 text-muted-foreground text-sm">
                Version hiện tại: {workspace.data.publicProfile.versionNumber} ·{" "}
                {PROFILE_STATUS_LABELS[workspace.data.publicProfile.status]}
              </p>
              <a
                className="mt-4 inline-flex font-medium text-primary text-sm underline underline-offset-4"
                href={workspace.data.publicProfile.publicUrl}
              >
                Mở profile công khai
              </a>
            </article>
          ) : null}

          <ProviderProfileRevisionPanel
            profileRevision={workspace.data.profileRevision}
            publicProfile={workspace.data.publicProfile}
          />

          {notifications.data ? (
            <article className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-semibold text-xl">Thông báo xét duyệt</h2>
                <span className="text-muted-foreground text-sm">
                  Chưa đọc: {notifications.data.unreadCount}
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {notifications.data.items.length > 0 ? (
                  notifications.data.items.map((notification) => (
                    <div
                      className="rounded-xl border bg-muted/20 p-4"
                      key={notification.id}
                    >
                      <p className="font-medium text-sm">
                        {notification.title}
                      </p>
                      <p className="mt-1 text-muted-foreground text-sm">
                        {notification.body}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Chưa có thông báo mới.
                  </p>
                )}
              </div>
            </article>
          ) : null}

          {canEditApplication ? (
            <article className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="font-semibold text-xl">Đăng ký Provider</h2>
                <p className="mt-2 text-muted-foreground text-sm">
                  Hoàn thiện hồ sơ, lưu nháp khi cần và gửi để Reviewer xem xét.
                  Provider không thể tự phát hành profile công khai.
                </p>
              </div>
              <ProviderApplicationForm
                application={workspace.data.application}
                key={
                  workspace.data.application?.id ?? "new-provider-application"
                }
              />
            </article>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};
