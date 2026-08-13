import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  StarIcon,
  StorefrontIcon,
  UserIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import * as m from "motion/react-m";
import type { ComponentPropsWithoutRef } from "react";

import { formatVND } from "@/utils/format";

export interface ListingCardProps extends ComponentPropsWithoutRef<"div"> {
  listing: {
    category?: {
      id: string;
      name: string;
      slug: string;
    } | null;
    completedOrdersCount?: number | null;
    id: string;
    priceAmount: number;
    ratingCount?: number | null;
    ratingScore?: number | null;
    seller?: {
      id: string;
      image?: string | null;
      name?: string | null;
      storeSlug?: string | null;
    } | null;
    slug?: string;
    soldCount?: number | null;
    thumbnailUrl?: string | null;
    title: string;
    type: "SERVICE" | "COURSE";
    warrantyDurationHours?: number | null;
  };
  variant?: "grid" | "list";
}

const ListingThumbnail = ({
  isService,
  listing,
}: {
  isService: boolean;
  listing: ListingCardProps["listing"];
}) => {
  if (listing.thumbnailUrl) {
    return (
      <img
        alt={listing.title}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        src={listing.thumbnailUrl}
      />
    );
  }
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-linear-to-br from-primary/10 via-muted/30 to-background p-4 text-center">
      {isService ? (
        <WrenchIcon className="h-8 w-8 text-primary/70" />
      ) : (
        <BookOpenIcon className="h-8 w-8 text-primary/70" />
      )}
      <span className="mt-1 text-xs font-medium text-muted-foreground">
        {isService ? "Dịch vụ số" : "Khóa học online"}
      </span>
    </div>
  );
};

const CategoryOverlay = ({
  category,
}: {
  category: ListingCardProps["listing"]["category"];
}) => {
  if (!category) {
    return null;
  }
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-end bg-linear-to-t from-black/85 via-black/40 to-transparent p-2.5 pt-6">
      <span className="truncate text-[11px] font-semibold text-white/95 drop-shadow-xs">
        {category.name}
      </span>
    </div>
  );
};

const RatingSummary = ({
  hasRating,
  ratingCount,
  ratingScore,
  soldCount,
}: {
  hasRating: boolean;
  ratingCount: number;
  ratingScore: number;
  soldCount: number;
}) => (
  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
    {hasRating ? (
      <div className="flex items-center gap-1 font-semibold text-amber-500 dark:text-amber-400">
        <StarIcon className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
        <span>{ratingScore.toFixed(1)}</span>
        <span className="font-normal text-muted-foreground">
          ({ratingCount})
        </span>
      </div>
    ) : (
      <span className="font-normal text-muted-foreground">
        Chưa có đánh giá
      </span>
    )}
    <span className="text-border">•</span>
    <span className="font-medium text-muted-foreground">
      Đã xử lý {soldCount}
    </span>
  </div>
);

export const ListingCard = ({
  className,
  listing,
  variant = "grid",
}: ListingCardProps) => {
  const isService = listing.type === "SERVICE";
  const sellerName = listing.seller?.name ?? "Cửa hàng dịch vụ";
  const hasRating = Boolean(
    listing.ratingCount && listing.ratingCount > 0 && listing.ratingScore
  );
  const ratingScore = listing.ratingScore ?? 0;
  const ratingCount = listing.ratingCount ?? 0;
  const soldCount = listing.soldCount ?? listing.completedOrdersCount ?? 0;
  const listingPathId = listing.slug ?? listing.id;

  if (variant === "list") {
    return (
      <Link className="block" params={{ id: listingPathId }} to="/listing/$id">
        <m.div
          className={className}
          transition={{ duration: 0.2 }}
          whileHover={{ y: -2 }}
        >
          <div className="group relative flex flex-col sm:flex-row items-stretch justify-between overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-xs backdrop-blur-md transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 gap-4">
            {/* Thumbnail Image with Category Overlay */}
            <div className="relative aspect-video w-full sm:w-52 shrink-0 overflow-hidden rounded-xl bg-muted/40">
              <ListingThumbnail isService={isService} listing={listing} />

              {/* Category Overlay (Gradient text overlay) */}
              <CategoryOverlay category={listing.category} />
            </div>

            {/* Content Middle */}
            <div className="flex flex-1 flex-col justify-between space-y-2 py-0.5 min-w-0">
              <div>
                {listing.warrantyDurationHours ? (
                  <div className="mb-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      <ShieldCheckIcon className="h-3 w-3" />
                      Bảo hành {listing.warrantyDurationHours}h
                    </span>
                  </div>
                ) : null}

                <h3 className="line-clamp-2 text-base font-bold text-foreground transition-colors group-hover:text-primary leading-snug">
                  {listing.title}
                </h3>
              </div>

              {/* StorefrontIcon / Seller Info */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/30">
                {listing.seller?.image ? (
                  <img
                    alt={sellerName}
                    className="h-5 w-5 rounded-full object-cover ring-1 ring-border/50 shrink-0"
                    src={listing.seller.image}
                  />
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    <StorefrontIcon className="h-3 w-3" />
                  </div>
                )}
                <span className="font-semibold text-foreground/90 truncate max-w-50">
                  {sellerName}
                </span>
                <CheckCircleIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              </div>
            </div>

            {/* Right Price, Rating & CTA */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-border/40 pt-3 sm:pt-0 sm:pl-5 shrink-0 gap-2">
              <span className="text-lg font-black text-primary tracking-tight">
                {formatVND(listing.priceAmount ?? 0)}
              </span>

              {/* Rating ⭐ & Total Sold */}
              <RatingSummary
                hasRating={hasRating}
                ratingCount={ratingCount}
                ratingScore={ratingScore}
                soldCount={soldCount}
              />

              <div className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-xs group-hover:opacity-90 transition-all mt-1">
                <span>Xem chi tiết</span>
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </m.div>
      </Link>
    );
  }

  // Default Grid Mode (Full Width Image Edge-to-Edge with Category Overlay)
  return (
    <Link
      className="block h-full"
      params={{ id: listingPathId }}
      to="/listing/$id"
    >
      <m.div
        className="h-full"
        transition={{ duration: 0.2 }}
        whileHover={{ y: -4 }}
      >
        <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xs backdrop-blur-md transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5">
          {/* Full Width Edge-to-Edge Thumbnail */}
          <div className="relative aspect-video w-full overflow-hidden bg-muted/40">
            <ListingThumbnail isService={isService} listing={listing} />

            {/* Category Overlay Text (On top of thumbnail with gradient backdrop) */}
            <CategoryOverlay category={listing.category} />
          </div>

          {/* Card Body Content */}
          <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4 space-y-2.5">
            <div>
              {/* Seller StorefrontIcon Header */}
              <div className="flex items-center gap-2 mb-2 min-w-0">
                {listing.seller?.image ? (
                  <img
                    alt={sellerName}
                    className="h-5 w-5 rounded-full object-cover ring-1 ring-border/60 shrink-0"
                    src={listing.seller.image}
                  />
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    <UserIcon className="h-3 w-3" />
                  </div>
                )}
                <span className="truncate text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                  {sellerName}
                </span>
                <CheckCircleIcon className="h-3 w-3 text-blue-500 shrink-0" />
              </div>

              {/* Title */}
              <h3 className="line-clamp-2 text-sm font-bold text-foreground transition-colors group-hover:text-primary leading-snug">
                {listing.title}
              </h3>

              {/* Warranty Badge */}
              {listing.warrantyDurationHours ? (
                <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Bảo hành {listing.warrantyDurationHours}h</span>
                </div>
              ) : null}
            </div>

            {/* Bottom Price & Rating Footer */}
            <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-3 gap-2">
              <div className="min-w-0">
                <span className="text-base sm:text-lg font-black text-primary tracking-tight block">
                  {formatVND(listing.priceAmount ?? 0)}
                </span>
                {/* Rating ⭐ & Total Sold at bottom with price */}
                <RatingSummary
                  hasRating={hasRating}
                  ratingCount={ratingCount}
                  ratingScore={ratingScore}
                  soldCount={soldCount}
                />
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all shrink-0">
                <ArrowRightIcon className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </m.div>
    </Link>
  );
};
