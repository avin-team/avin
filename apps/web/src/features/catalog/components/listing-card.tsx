import { Link } from "@tanstack/react-router";
import { BookOpen, Shield, User, Wrench } from "lucide-react";
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
    } | null;
    thumbnailUrl?: string | null;
    slug?: string;
    title: string;
    type: "SERVICE" | "COURSE";
    warrantyDurationHours?: number | null;
  };
}

export const ListingCard = ({ className, listing }: ListingCardProps) => {
  const isService = listing.type === "SERVICE";

  return (
    <motion.div
      className={className}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -4 }}
    >
      <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-xs backdrop-blur-md transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
        <div>
          {/* Image / Thumbnail placeholder */}
          <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-xl bg-muted/50">
            {listing.thumbnailUrl ? (
              <img
                alt={listing.title ?? "Listing thumbnail"}
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

            {/* Type badge */}
            <div className="absolute top-2.5 left-2.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-xs backdrop-blur-md ${
                  isService
                    ? "bg-blue-500/90 text-white"
                    : "bg-purple-500/90 text-white"
                }`}
              >
                {isService ? (
                  <>
                    <Wrench className="h-3 w-3" /> Dịch vụ
                  </>
                ) : (
                  <>
                    <BookOpen className="h-3 w-3" /> Khóa học
                  </>
                )}
              </span>
            </div>

            {/* Category tag */}
            {listing.category ? (
              <div className="absolute bottom-2.5 left-2.5">
                <span className="inline-flex items-center rounded-md bg-background/80 px-2 py-0.5 text-xs font-medium text-foreground shadow-xs backdrop-blur-md">
                  {listing.category.name}
                </span>
              </div>
            ) : null}
          </div>

          {/* Listing Title */}
          <Link params={{ id: listing.slug ?? listing.id }} to="/listing/$id">
            <h3 className="line-clamp-2 text-base font-bold text-foreground transition-colors group-hover:text-primary">
              {listing.title}
            </h3>
          </Link>
        </div>

        <div>
          {/* Warranty tag if available */}
          {listing.warrantyDurationHours ? (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              <span>Bảo hành {listing.warrantyDurationHours}h</span>
            </div>
          ) : null}

          {/* Price & Seller Info Footer */}
          <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
            <div className="flex items-center gap-2">
              {listing.seller?.image ? (
                <img
                  alt={listing.seller.name ?? "Seller"}
                  className="h-6 w-6 rounded-full object-cover"
                  src={listing.seller.image}
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
              <span className="max-w-[100px] truncate text-xs font-medium text-muted-foreground">
                {listing.seller?.name ?? "Người bán uy tín"}
              </span>
            </div>

            <div className="text-right">
              <span className="text-base font-extrabold text-primary">
                {formatVND(listing.priceAmount ?? 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
