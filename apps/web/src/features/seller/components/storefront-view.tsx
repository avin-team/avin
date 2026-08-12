import { Badge } from "@avin/ui/components/badge";
import {
  ArrowLeftIcon,
  PackageIcon,
  StarIcon,
  StorefrontIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { formatVND } from "@/utils/format";

export interface StorefrontProfileData {
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  completedOrderCount?: number | null;
  createdAt?: Date | string | null;
  ratingCount?: number | null;
  ratingScore?: number | string | null;
  storeSlug: string;
  storefrontName: string;
}

export interface StorefrontListingItem {
  id: string;
  priceAmount: number | null;
  slug: string | null;
  thumbnailUrl: string | null;
  title: string | null;
  type: string;
}

interface StorefrontViewProps {
  badge?: ReactNode;
  hasMore?: boolean;
  isPreview?: boolean;
  listings: StorefrontListingItem[];
  profile: StorefrontProfileData;
  showBackLink?: boolean;
}

const StorefrontHeaderCard = ({
  badge,
  profile,
}: {
  badge?: ReactNode;
  profile: StorefrontProfileData;
}) => {
  const formattedDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("vi-VN", {
        month: "long",
        year: "numeric",
      })
    : "";

  const ratingScoreNum = Number(profile.ratingScore ?? 0);
  const ratingText =
    ratingScoreNum > 0
      ? `${ratingScoreNum.toFixed(1)} (${profile.ratingCount ?? 0} đánh giá)`
      : "Chưa có đánh giá";

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="relative h-48 overflow-hidden bg-linear-to-br from-primary/30 via-primary/10 to-muted sm:h-56">
        {profile.bannerUrl ? (
          <img
            alt={`Ảnh bìa ${profile.storefrontName || "gian hàng"}`}
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
              alt={`Ảnh đại diện ${profile.storefrontName || "gian hàng"}`}
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
              {profile.storefrontName || "Tên gian hàng"}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>/{profile.storeSlug || "duong-dan"}</span>
              {formattedDate ? (
                <>
                  <span>•</span>
                  <span>Tham gia {formattedDate}</span>
                </>
              ) : null}
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-amber-500">
                <StarIcon className="size-3.5 fill-amber-500" />
                <span>{ratingText}</span>
              </span>
              <span>•</span>
              <span className="font-semibold text-foreground">
                {profile.completedOrderCount ?? 0} đơn đã hoàn thành
              </span>
            </div>
            <p className="mt-4 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {profile.bio || "Chưa có mô tả gian hàng."}
            </p>
          </div>
          {badge ?? <Badge variant="outline">Gian hàng công khai</Badge>}
        </div>
      </div>
    </section>
  );
};

const StorefrontListingCard = ({
  isPreview,
  listing,
}: {
  isPreview?: boolean;
  listing: StorefrontListingItem;
}) => {
  const cardContent = (
    <>
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
          {listing.type === "COURSE" ? "Khóa học online" : "Dịch vụ số"}
        </Badge>
        <h3 className="line-clamp-2 font-semibold transition-colors group-hover:text-primary">
          {listing.title ?? "Sản phẩm chưa đặt tên"}
        </h3>
        <p className="text-lg font-bold text-primary">
          {formatVND(listing.priceAmount ?? 0)}
        </p>
      </div>
    </>
  );

  if (isPreview) {
    return (
      <div className="group overflow-hidden rounded-2xl border border-border bg-card">
        {cardContent}
      </div>
    );
  }

  return (
    <Link
      className="group overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg"
      params={{ id: listing.slug ?? listing.id }}
      to="/listing/$id"
    >
      {cardContent}
    </Link>
  );
};

export const StorefrontView = ({
  badge,
  hasMore = false,
  isPreview = false,
  listings,
  profile,
  showBackLink = false,
}: StorefrontViewProps) => (
  <div className="space-y-8">
    {showBackLink ? (
      <Link
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        to="/category"
      >
        <ArrowLeftIcon className="size-4" />
        Dịch vụ
      </Link>
    ) : null}

    <StorefrontHeaderCard badge={badge} profile={profile} />

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
            {isPreview
              ? "Gian hàng sẽ hiển thị sản phẩm tại đây khi bạn xuất bản sản phẩm."
              : "Gian hàng đã public và sẽ hiển thị sản phẩm tại đây khi có sản phẩm phù hợp."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <StorefrontListingCard
              isPreview={isPreview}
              key={listing.id}
              listing={listing}
            />
          ))}
        </div>
      )}
    </section>
  </div>
);
