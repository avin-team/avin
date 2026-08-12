import { ArrowLeftIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";

import { Shell } from "@/components/shell";
import { orpc } from "@/utils/orpc";

import { StorefrontView } from "../components/storefront-view";

export const PublicStorePage = () => {
  const { slug } = useParams({ from: "/(public)/store/$slug" });
  const storeQuery = useQuery(
    orpc.sellerStore.getPublicBySlug.queryOptions({
      input: { slug },
    })
  );

  if (storeQuery.isPending) {
    return (
      <Shell variant="default">
        <div className="space-y-6 py-8">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-56 animate-pulse rounded-3xl bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="h-64 animate-pulse rounded-2xl bg-muted" />
            <div className="h-64 animate-pulse rounded-2xl bg-muted" />
          </div>
        </div>
      </Shell>
    );
  }

  if (storeQuery.isError || !storeQuery.data) {
    return (
      <Shell variant="default">
        <div className="py-16">
          <div className="mx-auto max-w-xl rounded-3xl border border-destructive/20 bg-destructive/5 p-12 text-center">
            <WarningCircleIcon className="mx-auto size-12 text-destructive" />
            <h1 className="mt-4 text-xl font-bold">Không tìm thấy gian hàng</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Gian hàng này chưa public hoặc không còn khả dụng.
            </p>
            <Link
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              to="/category"
            >
              <ArrowLeftIcon className="size-4" />
              Quay lại Dịch vụ
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  const { hasMore, listings, profile } = storeQuery.data;

  return (
    <Shell variant="default">
      <div className="py-8">
        <StorefrontView
          hasMore={hasMore}
          listings={listings}
          profile={profile}
          showBackLink
        />
      </div>
    </Shell>
  );
};
