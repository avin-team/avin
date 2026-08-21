import { useProviderWorkspace } from "../api/provider-api";

export const ProviderWorkspacePage = () => {
  const workspace = useProviderWorkspace();

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
        <div className="grid gap-6 md:grid-cols-2">
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

          <article className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-xl">Hồ sơ công khai</h2>
            <p className="mt-2 text-muted-foreground text-sm">
              Phiên bản công khai chưa được phát hành.
            </p>
            <p className="mt-4 text-sm">
              Hồ sơ công khai là projection riêng, chỉ xuất hiện sau quy trình
              xét duyệt và phát hành của Admin.
            </p>
          </article>
        </div>
      ) : null}
    </section>
  );
};
