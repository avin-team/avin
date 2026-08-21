import {
  useProviderNotifications,
  useProviderWorkspace,
} from "../api/provider-api";
import { ProviderApplicationForm } from "../components/provider-application-form";

const APPLICATION_STATUS_LABELS = {
  APPROVED: "Đã được duyệt",
  CHANGES_REQUESTED: "Cần bổ sung/chỉnh sửa",
  DRAFT: "Bản nháp",
  PENDING_REVIEW: "Đang chờ Reviewer",
  REJECTED: "Đã bị từ chối",
} as const;

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
                Chỉ các trường tối thiểu đã được Admin duyệt mới xuất hiện ở
                profile công khai.
              </p>
              <a
                className="mt-4 inline-flex font-medium text-primary text-sm underline underline-offset-4"
                href={workspace.data.publicProfile.publicUrl}
              >
                Mở profile công khai
              </a>
            </article>
          ) : null}

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
