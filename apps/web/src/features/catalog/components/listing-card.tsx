import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  Store,
  User,
  Wrench,
} from "lucide-react";
import { motion } from "motion/react";
import type { ComponentPropsWithoutRef } from "react";

import { formatVND } from "@/utils/format";

export interface ListingCardProps extends ComponentPropsWithoutRef<"div"> {
  listing: {
    category?: {
      id: string;
      name: string;
      slug: string;
    } | null;
    id: string;
    priceAmount: number;
    seller?: {
      id: string;
      image?: string | null;
      name?: string | null;
      storeSlug?: string | null;
    } | null;
    slug?: string;
    thumbnailUrl?: string | null;
    title: string;
    type: "SERVICE" | "COURSE";
    warrantyDurationHours?: number | null;
  };
  variant?: "grid" | "list";
}

// oxlint-disable-next-line complexity
export const ListingCard = ({
  className,
  listing,
  variant = "grid",
}: ListingCardProps) => {
  const isService = listing.type === "SERVICE";
  const sellerName = listing.seller?.name ?? "Cửa hàng dịch vụ";

  if (variant === "list") {
    return (
      <Link
        className="block"
        params={{ id: listing.slug ?? listing.id }}
        to="/listing/$id"
      >
        <motion.div
          className={className}
          transition={{ duration: 0.2 }}
          whileHover={{ y: -2 }}
        >
          <div className="group relative flex flex-col sm:flex-row items-stretch justify-between overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-xs backdrop-blur-md transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 gap-4">
            {/* Thumbnail Image with Category Overlay */}
            <div className="relative aspect-video w-full sm:w-52 shrink-0 overflow-hidden rounded-xl bg-muted/40">
              {listing.thumbnailUrl ? (
                <img
                  alt={listing.title ?? "Thumbnail"}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  src={listing.thumbnailUrl}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-muted/30 to-background p-4 text-center">
                  {isService ? (
                    <Wrench className="h-7 w-7 text-primary/70" />
                  ) : (
                    <BookOpen className="h-7 w-7 text-primary/70" />
                  )}
                  <span className="mt-1 text-[11px] font-medium text-muted-foreground">
                    {isService ? "Dịch vụ số" : "Khóa học online"}
                  </span>
                </div>
              )}

              {/* Category Overlay (Gradient text overlay) */}
              {listing.category && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2.5 pt-6 flex items-end">
                  <span className="text-[11px] font-semibold text-white/95 drop-shadow-xs truncate">
                    {listing.category.name}
                  </span>
                </div>
              )}
            </div>

            {/* Content Middle */}
            <div className="flex flex-1 flex-col justify-between space-y-2 py-0.5 min-w-0">
              <div>
                {listing.warrantyDurationHours ? (
                  <div className="mb-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      <ShieldCheck className="h-3 w-3" />
                      Bảo hành {listing.warrantyDurationHours}h
                    </span>
                  </div>
                ) : null}

                <h3 className="line-clamp-2 text-base font-bold text-foreground transition-colors group-hover:text-primary leading-snug">
                  {listing.title}
                </h3>
              </div>

              {/* Store / Seller Info */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/30">
                {listing.seller?.image ? (
                  <img
                    alt={sellerName}
                    className="h-5 w-5 rounded-full object-cover ring-1 ring-border/50 shrink-0"
                    src={listing.seller.image}
                  />
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    <Store className="h-3 w-3" />
                  </div>
                )}
                <span className="font-semibold text-foreground/90 truncate max-w-[200px]">
                  {sellerName}
                </span>
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              </div>
            </div>

            {/* Right Price & CTA */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-border/40 pt-3 sm:pt-0 sm:pl-5 shrink-0 gap-3">
              <span className="text-lg font-black text-primary tracking-tight">
                {formatVND(listing.priceAmount ?? 0)}
              </span>

              <div className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-xs group-hover:opacity-90 transition-all">
                <span>Xem chi tiết</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }

  // Default Grid Mode (Full Width Image Edge-to-Edge with Category Overlay)
  return (
    <Link
      className="block h-full"
      params={{ id: listing.slug ?? listing.id }}
      to="/listing/$id"
    >
      <motion.div
        className="h-full"
        transition={{ duration: 0.2 }}
        whileHover={{ y: -4 }}
      >
        <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xs backdrop-blur-md transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5">
          {/* Full Width Edge-to-Edge Thumbnail */}
          <div className="relative aspect-video w-full overflow-hidden bg-muted/40">
            {listing.thumbnailUrl ? (
              <img
                alt={listing.title ?? "Thumbnail"}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                src={listing.thumbnailUrl}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-muted/30 to-background p-4 text-center">
                {isService ? (
                  <Wrench className="h-8 w-8 text-primary/70" />
                ) : (
                  <BookOpen className="h-8 w-8 text-primary/70" />
                )}
                <span className="mt-1 text-xs font-medium text-muted-foreground">
                  {isService ? "Dịch vụ số" : "Khóa học online"}
                </span>
              </div>
            )}

            {/* Category Overlay Text (On top of thumbnail with gradient backdrop) */}
            {listing.category && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2.5 pt-6 flex items-end">
                <span className="text-[11px] font-semibold text-white/95 drop-shadow-xs truncate">
                  {listing.category.name}
                </span>
              </div>
            )}
          </div>

          {/* Card Body Content */}
          <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4 space-y-2.5">
            <div>
              {/* Seller Store Header */}
              <div className="flex items-center gap-2 mb-2 min-w-0">
                {listing.seller?.image ? (
                  <img
                    alt={sellerName}
                    className="h-5 w-5 rounded-full object-cover ring-1 ring-border/60 shrink-0"
                    src={listing.seller.image}
                  />
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    <User className="h-3 w-3" />
                  </div>
                )}
                <span
                  className="truncate text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors"
                  title={sellerName}
                >
                  {sellerName}
                </span>
                <CheckCircle2 className="h-3 w-3 text-blue-500 shrink-0" />
              </div>

              {/* Title */}
              <h3 className="line-clamp-2 text-sm font-bold text-foreground transition-colors group-hover:text-primary leading-snug">
                {listing.title}
              </h3>

              {/* Warranty Badge */}
              {listing.warrantyDurationHours ? (
                <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Bảo hành {listing.warrantyDurationHours}h</span>
                </div>
              ) : null}
            </div>

            {/* Price Footer */}
            <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-3">
              <span className="text-base sm:text-lg font-black text-primary tracking-tight">
                {formatVND(listing.priceAmount ?? 0)}
              </span>

              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};
