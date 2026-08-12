import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import { SidebarTrigger } from "@avin/ui/components/sidebar";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { orpc } from "@/utils/orpc";

import { StorefrontView } from "../components/storefront-view";
import { SellerLayout } from "../layout/seller-layout";

export const StorePreviewPage = () => {
  const navigate = useNavigate();
  const profileQuery = useQuery(orpc.sellerStore.getProfile.queryOptions());
  const listingsQuery = useQuery(
    orpc.listing.sellerWorkspace.listMine.queryOptions({
      retry: false,
      throwOnError: false,
    })
  );

  const renderPreview = (): ReactNode => {
    if (profileQuery.isPending || listingsQuery.isPending) {
      return (
        <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
          Đang tải bản xem trước...
        </div>
      );
    }

    if (profileQuery.isError) {
      return (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-sm text-destructive">
          Không thể tải bản xem trước. Vui lòng thử lại.
        </div>
      );
    }

    const profile = profileQuery.data?.profile;
    if (!profile) {
      return (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground">
          Hãy lưu hồ sơ gian hàng trước khi xem bản xem trước.
        </div>
      );
    }

    const publishedListings = (listingsQuery.data ?? []).filter(
      (listing) => listing.status === "PUBLISHED"
    );

    return (
      <StorefrontView
        badge={<Badge variant="outline">Bản xem trước</Badge>}
        isPreview
        listings={publishedListings}
        profile={profile}
      />
    );
  };

  return (
    <SellerLayout active="profile">
      <div className="min-w-0 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-5">
            <div className="flex items-start gap-2">
              <SidebarTrigger className="mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">
                  Hồ sơ gian hàng <span className="mx-1">/</span> Xem trước
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight">
                  Xem trước gian hàng
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Kiểm tra cách hồ sơ gian hàng hiển thị trước khi chia sẻ với
                  khách hàng.
                </p>
              </div>
            </div>
            <Badge variant="outline">Chỉ mình bạn thấy</Badge>
          </div>
          <Button
            className="mb-6 mt-5"
            onClick={() => navigate({ to: "/seller/store" })}
            type="button"
            variant="ghost"
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Quay lại chỉnh sửa
          </Button>
          <div>{renderPreview()}</div>
        </div>
      </div>
    </SellerLayout>
  );
};
