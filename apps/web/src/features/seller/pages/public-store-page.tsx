import { Badge } from "@avin/ui/components/badge";
import {
  WarningCircleIcon,
  ArrowLeftIcon,
  PackageIcon,
  StorefrontIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";

import { Shell } from "@/components/shell";
import { formatVND } from "@/utils/format";
import { orpc } from "@/utils/orpc";

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
      <div className="space-y-8 py-8">
        <Link
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          to="/category"
        >
          <ArrowLeftIcon className="size-4" />
          Dịch vụ
        </Link>

        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="relative h-48 overflow-hidden bg-linear-to-br from-primary/30 via-primary/10 to-muted sm:h-56">
            {profile.bannerUrl ? (
              <img
                alt={`Ảnh bìa ${profile.storefrontName}`}
                className="size-full object-cover"
                loading="lazy"
                src={profile.bannerUrl}
              />
            ) : null}
            <div className="absolute inset-0 bg-linear-to-t from-black/45 to-transparent" />
          </div>
          <div className="relative px-6 pb-6 sm:px-8">
            <div className="-mt-12 flex size-24 items-center justify-center overflow-hidden rounded-3xl border-4 border-card bg-primary text-primary-foreground shadow-lg">
              {profile.avatarUrl ? (
                <img
                  alt={`Ảnh đại diện ${profile.storefrontName}`}
                  className="size-full object-cover"
                  loading="lazy"
                  src={profile.avatarUrl}
                />
              ) : (
                <StorefrontIcon className="size-10" />
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {profile.storefrontName}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  /{profile.storeSlug}
                </p>
                <p className="mt-4 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {profile.bio}
                </p>
              </div>
              <Badge variant="outline">Gian hàng public</Badge>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Sản phẩm</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasMore
                  ? `Hiển thị ${listings.length} sản phẩm đầu tiên`
                  : `${listings.length} sản phẩm đang được giới thiệu`}
              </p>
            </div>
          </div>

          {listings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <PackageIcon className="mx-auto size-10 text-muted-foreground" />
              <h3 className="mt-4 font-semibold">Chưa có sản phẩm</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Gian hàng đã public và sẽ hiển thị sản phẩm tại đây khi có sản
                phẩm phù hợp.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <Link
                  className="group overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg"
                  key={listing.id}
                  params={{ id: listing.slug }}
                  to="/listing/$id"
                >
                  <div className="aspect-video overflow-hidden bg-muted">
                    {listing.thumbnailUrl ? (
                      <img
                        alt={listing.title ?? "Ảnh sản phẩm"}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        src={listing.thumbnailUrl}
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-linear-to-br from-primary/10 to-muted">
                        <PackageIcon className="size-10 text-primary/50" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 p-4">
                    <Badge variant="secondary">
                      {listing.type === "COURSE"
                        ? "Khóa học online"
                        : "Dịch vụ số"}
                    </Badge>
                    <h3 className="line-clamp-2 font-semibold transition-colors group-hover:text-primary">
                      {listing.title ?? "Sản phẩm chưa đặt tên"}
                    </h3>
                    <p className="text-lg font-bold text-primary">
                      {formatVND(listing.priceAmount ?? 0)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
};
