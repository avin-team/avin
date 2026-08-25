import { Button } from "@avin/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avin/ui/components/empty";
import { Skeleton } from "@avin/ui/components/skeleton";
import { cn } from "@avin/ui/lib/utils";
import {
  CrownIcon,
  SealCheck,
  ShieldCheckIcon,
  StarIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import type { MockProvider } from "../data/mock-providers";
import { ProviderTierFrame } from "./provider-tier-frame";
import type { ProviderTier } from "./provider-tier-frame";

const DiamondBadgeIcon = () => (
  <svg aria-hidden="true" className="size-3.5 text-sky-500" viewBox="0 0 24 24">
    <polygon fill="currentColor" points="3,8 8,2 16,2 21,8 12,22" />
  </svg>
);

const TIER_FILTERS: {
  customClass?: string;
  icon: React.ReactNode;
  label: string;
  tier: ProviderTier | "ALL";
}[] = [
  {
    icon: (
      <span className="size-2.5 rounded-full bg-linear-to-tr from-amber-700 to-amber-400 shadow-xs" />
    ),
    label: "Đồng",
    tier: "BRONZE",
  },
  {
    icon: (
      <span className="size-2.5 rounded-full bg-linear-to-tr from-slate-500 to-slate-200 shadow-xs" />
    ),
    label: "Bạc",
    tier: "SILVER",
  },
  {
    icon: (
      <StarIcon
        aria-hidden="true"
        className="size-3.5 text-amber-500"
        weight="fill"
      />
    ),
    label: "Vàng",
    tier: "GOLD",
  },
  {
    customClass:
      "border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100/80 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-200 dark:hover:bg-sky-900/50",
    icon: <DiamondBadgeIcon />,
    label: "Kim cương",
    tier: "DIAMOND",
  },
  {
    customClass:
      "border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100/80 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-900/50",
    icon: (
      <CrownIcon
        aria-hidden="true"
        className="size-3.5 text-emerald-600 dark:text-emerald-400"
        weight="fill"
      />
    ),
    label: "VIP",
    tier: "VIP",
  },
];

export const ProviderGridItemSkeleton = () => (
  <div className="flex flex-col items-center p-1 text-center">
    <div className="relative flex size-32 items-center justify-center sm:size-36 md:size-40">
      <div className="absolute inset-0 rounded-full border-2 border-border/40" />
      <Skeleton className="size-[86%] rounded-full" />
    </div>

    <div className="mt-3.5 flex min-h-10 w-full max-w-36 flex-col items-center justify-start gap-1.5 px-1 sm:max-w-40 md:max-w-44">
      <Skeleton className="h-4 w-24 rounded-md sm:w-28" />
    </div>
  </div>
);

interface ProviderGridItemProps {
  onSelect?: (provider: MockProvider) => void;
  provider: MockProvider;
}

const ProviderGridItem = ({ onSelect, provider }: ProviderGridItemProps) => {
  const fullDisplayName = provider.rank
    ? `${provider.rank}. ${provider.displayName}`
    : provider.displayName;

  const itemBody = (
    <>
      <ProviderTierFrame
        className="transition-transform duration-300 group-hover:scale-105"
        isVerified={provider.isVerified}
        recognizedBondAmount={provider.recognizedBondAmount}
        recommendedTransactionLimit={provider.recommendedTransactionLimit}
        tier={provider.tier}
      >
        {provider.avatarUrl ? (
          <img
            alt={provider.displayName}
            className="size-full object-cover"
            loading="lazy"
            src={provider.avatarUrl}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-muted font-bold text-muted-foreground text-sm">
            {provider.displayName.slice(0, 2).toUpperCase()}
          </div>
        )}
      </ProviderTierFrame>

      <div className="mt-3.5 flex min-h-10 w-full max-w-36 items-start justify-center px-1 text-center sm:max-w-40 md:max-w-44">
        <span className="line-clamp-2 font-semibold text-foreground text-xs leading-snug tracking-tight transition-colors group-hover:text-primary sm:text-xs md:text-sm">
          {fullDisplayName}
        </span>
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button
        aria-label="Xem hồ sơ"
        className="group flex flex-col items-center rounded-2xl p-1 text-center outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onSelect(provider)}
        type="button"
      >
        {itemBody}
      </button>
    );
  }

  const targetHref = `/avin-check/provider/${provider.slug}`;

  return (
    <Link
      aria-label="Xem hồ sơ"
      className="group flex flex-col items-center rounded-2xl p-1 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      params={{ slug: provider.slug }}
      to={targetHref as "/avin-check/provider/$slug"}
    >
      {itemBody}
    </Link>
  );
};

const EMPTY_PROVIDERS: MockProvider[] = [];

interface ProviderShowcaseSectionProps {
  className?: string;
  initialProviders?: MockProvider[];
  isLoading?: boolean;
  onSelectProvider?: (provider: MockProvider) => void;
  title?: string;
}

export const ProviderShowcaseSection = ({
  className,
  initialProviders = EMPTY_PROVIDERS,
  isLoading = false,
  onSelectProvider,
  title = "Đối tác đã xác minh",
}: ProviderShowcaseSectionProps) => {
  const [selectedTier, setSelectedTier] = useState<ProviderTier | "ALL">("ALL");

  const filteredProviders =
    selectedTier === "ALL"
      ? initialProviders
      : initialProviders.filter((p) => p.tier === selectedTier);

  const totalCount = initialProviders.length;
  const currentCount = filteredProviders.length;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div
          aria-busy="true"
          className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-10 md:grid-cols-4 lg:grid-cols-6 lg:gap-x-6 xl:gap-x-8"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <ProviderGridItemSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (filteredProviders.length > 0) {
      return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-10 md:grid-cols-4 lg:grid-cols-6 lg:gap-x-6 xl:gap-x-8">
          {filteredProviders.map((provider) => (
            <ProviderGridItem
              key={provider.id}
              onSelect={onSelectProvider}
              provider={provider}
            />
          ))}
        </div>
      );
    }

    return (
      <Empty className="border-none py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShieldCheckIcon
              aria-hidden="true"
              className="size-8 text-muted-foreground"
            />
          </EmptyMedia>
          <EmptyTitle>
            {selectedTier === "ALL"
              ? "Chưa có đối tác đã xác minh"
              : "Không tìm thấy đối tác"}
          </EmptyTitle>
          <EmptyDescription>
            {selectedTier === "ALL"
              ? "Danh sách đối tác sẽ được cập nhật khi có đối tác mới tham gia."
              : "Chưa có đối tác nào thuộc hạng đã chọn."}
          </EmptyDescription>
        </EmptyHeader>
        {selectedTier !== "ALL" && (
          <EmptyContent>
            <Button
              onClick={() => setSelectedTier("ALL")}
              size="sm"
              variant="outline"
            >
              Xem tất cả đối tác
            </Button>
          </EmptyContent>
        )}
      </Empty>
    );
  };

  return (
    <section
      aria-labelledby="showcase-providers-heading"
      className={cn("flex flex-col gap-6", className)}
    >
      {/* Section Header Aligned with Page Structure */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            className="flex items-center gap-2 font-bold text-2xl tracking-tight text-foreground sm:text-3xl"
            id="showcase-providers-heading"
          >
            <span>{title}</span>
            <SealCheck
              aria-hidden="true"
              className="size-6 shrink-0 text-primary sm:size-7"
              weight="fill"
            />
          </h2>
          {isLoading ? (
            <div className="mt-1 flex items-center gap-2">
              <Skeleton className="h-4 w-48 rounded-md" />
            </div>
          ) : (
            <p className="mt-1 text-muted-foreground text-sm">
              Danh sách đang hoạt động theo trang hiện tại · {currentCount}/
              {totalCount} đối tác
            </p>
          )}
        </div>

        {/* Tier Legend & Interactive Filter Pills */}
        <div
          aria-label="Lọc theo hạng đối tác"
          className="flex flex-wrap items-center gap-2"
          role="toolbar"
        >
          {selectedTier !== "ALL" && !isLoading && (
            <button
              className="inline-flex h-9 items-center rounded-xl border border-border/70 bg-muted/60 px-3 font-medium text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setSelectedTier("ALL")}
              type="button"
            >
              Tất cả
            </button>
          )}

          {TIER_FILTERS.map((item) => {
            const isSelected = selectedTier === item.tier;

            return (
              <button
                aria-pressed={isSelected}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3.5 font-medium text-xs sm:text-sm transition-all outline-none",
                  item.customClass ??
                    "border-border/80 bg-background text-foreground hover:bg-muted/60",
                  isSelected &&
                    "ring-2 ring-primary ring-offset-2 ring-offset-background font-semibold",
                  isLoading && "cursor-not-allowed opacity-60"
                )}
                disabled={isLoading}
                key={item.tier}
                onClick={() =>
                  setSelectedTier((prev) =>
                    prev === item.tier ? "ALL" : item.tier
                  )
                }
                type="button"
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Container Card */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs sm:p-8 md:p-10">
        {renderContent()}
      </div>
    </section>
  );
};
