import { Button } from "@avin/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avin/ui/components/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import { Skeleton } from "@avin/ui/components/skeleton";
import { cn } from "@avin/ui/lib/utils";
import {
  Clock,
  CrownIcon,
  Funnel,
  MagnifyingGlass,
  SealCheck,
  ShieldCheck,
  SortAscending,
  TrendUp,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import type { ProviderTier } from "../data/provider-tier-constants";
import { TIER_ICON_IMAGES } from "../data/provider-tier-constants";
import { ProviderTierFrame } from "./provider-tier-frame";

export interface ShowcaseProvider {
  avatarUrl: string;
  bio?: string;
  displayName: string;
  id: string;
  isVerified: boolean;
  location: string;
  officialChannels: {
    additionalZalos?: string[];
    facebookId?: string;
    facebookSecondaryId?: string;
    facebookSecondaryUrl?: string;
    facebookUrl?: string;
    facebooks?: {
      id?: string;
      isPrimary?: boolean;
      label?: string;
      url: string;
    }[];
    hotline?: string;
    qrCodeUrl?: string;
    telegramCommunityUrl?: string;
    tiktokUrl?: string;
    websiteUrl?: string;
    youtubeUrl?: string;
    zalo?: string;
    zaloSecondary?: string;
    zalos?: {
      isPrimary?: boolean;
      label?: string;
      phone: string;
    }[];
  };
  rank?: number;
  recognizedBondAmount: number;
  recommendedTransactionLimit: number;
  services: string;
  slug: string;
  source?: string;
  tier: ProviderTier;
  verifiedAt: string;
}

type ProviderSortOption =
  | "joined_desc"
  | "joined_asc"
  | "tier_desc"
  | "tier_asc"
  | "rank_asc"
  | "bond_desc"
  | "name_asc";

const TIER_OPTIONS: {
  icon: React.ReactNode;
  label: string;
  value: ProviderTier | "ALL";
}[] = [
  {
    icon: <Funnel className="size-3.5 text-muted-foreground" />,
    label: "Tất cả hạng",
    value: "ALL",
  },
  {
    icon: (
      <img
        alt=""
        aria-hidden="true"
        className="size-4 object-contain drop-shadow-xs"
        src={TIER_ICON_IMAGES.VIP}
      />
    ),
    label: "Hạng VIP",
    value: "VIP",
  },
  {
    icon: (
      <img
        alt=""
        aria-hidden="true"
        className="size-4 object-contain drop-shadow-xs"
        src={TIER_ICON_IMAGES.DIAMOND}
      />
    ),
    label: "Hạng Kim cương",
    value: "DIAMOND",
  },
  {
    icon: (
      <img
        alt=""
        aria-hidden="true"
        className="size-4 object-contain drop-shadow-xs"
        src={TIER_ICON_IMAGES.GOLD}
      />
    ),
    label: "Hạng Vàng",
    value: "GOLD",
  },
  {
    icon: (
      <img
        alt=""
        aria-hidden="true"
        className="size-4 object-contain drop-shadow-xs"
        src={TIER_ICON_IMAGES.SILVER}
      />
    ),
    label: "Hạng Bạc",
    value: "SILVER",
  },
  {
    icon: (
      <img
        alt=""
        aria-hidden="true"
        className="size-4 object-contain drop-shadow-xs"
        src={TIER_ICON_IMAGES.BRONZE}
      />
    ),
    label: "Hạng Đồng",
    value: "BRONZE",
  },
];

const SORT_OPTIONS: {
  icon: React.ReactNode;
  label: string;
  value: ProviderSortOption;
}[] = [
  {
    icon: <Clock className="size-3.5 text-primary" />,
    label: "Thời gian: Mới nhất",
    value: "joined_desc",
  },
  {
    icon: <Clock className="size-3.5 text-muted-foreground" />,
    label: "Thời gian: Cũ nhất",
    value: "joined_asc",
  },
  {
    icon: <CrownIcon className="size-3.5 text-amber-500" weight="fill" />,
    label: "Hạng: Cao đến thấp",
    value: "tier_desc",
  },
  {
    icon: <CrownIcon className="size-3.5 text-muted-foreground" />,
    label: "Hạng: Thấp đến cao",
    value: "tier_asc",
  },
  {
    icon: <TrendUp className="size-3.5 text-blue-500" />,
    label: "Thứ hạng (Rank): 1 → N",
    value: "rank_asc",
  },
  {
    icon: <ShieldCheck className="size-3.5 text-emerald-500" weight="fill" />,
    label: "Quỹ bảo chứng: Cao đến thấp",
    value: "bond_desc",
  },
  {
    icon: <SortAscending className="size-3.5 text-muted-foreground" />,
    label: "Tên đối tác: A → Z",
    value: "name_asc",
  },
];

const TIER_ORDER: Record<string, number> = {
  BRONZE: 1,
  DIAMOND: 5,
  GOLD: 3,
  NORMAL: 0,
  PLATINUM: 4,
  SILVER: 2,
  VIP: 6,
};

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
  onSelect?: (provider: ShowcaseProvider) => void;
  provider: ShowcaseProvider;
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

const EMPTY_PROVIDERS: ShowcaseProvider[] = [];

const compareByJoinDate = (
  a: ShowcaseProvider,
  b: ShowcaseProvider,
  ascending: boolean
): number => {
  const timeA = a.verifiedAt ? new Date(a.verifiedAt).getTime() : 0;
  const timeB = b.verifiedAt ? new Date(b.verifiedAt).getTime() : 0;
  const diff = ascending ? timeA - timeB : timeB - timeA;
  if (diff !== 0) {
    return diff;
  }
  return (a.rank ?? 999) - (b.rank ?? 999);
};

const compareByTier = (
  a: ShowcaseProvider,
  b: ShowcaseProvider,
  ascending: boolean
): number => {
  const orderA = TIER_ORDER[a.tier] ?? 0;
  const orderB = TIER_ORDER[b.tier] ?? 0;
  const diff = ascending ? orderA - orderB : orderB - orderA;
  if (diff !== 0) {
    return diff;
  }
  return (a.rank ?? 999) - (b.rank ?? 999);
};

const compareProviders = (
  a: ShowcaseProvider,
  b: ShowcaseProvider,
  sortBy: ProviderSortOption
): number => {
  switch (sortBy) {
    case "joined_desc": {
      return compareByJoinDate(a, b, false);
    }
    case "joined_asc": {
      return compareByJoinDate(a, b, true);
    }
    case "tier_desc": {
      return compareByTier(a, b, false);
    }
    case "tier_asc": {
      return compareByTier(a, b, true);
    }
    case "rank_asc": {
      const rankA = a.rank ?? 9999;
      const rankB = b.rank ?? 9999;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return (TIER_ORDER[b.tier] ?? 0) - (TIER_ORDER[a.tier] ?? 0);
    }
    case "bond_desc": {
      const bondDiff =
        (b.recognizedBondAmount ?? 0) - (a.recognizedBondAmount ?? 0);
      if (bondDiff !== 0) {
        return bondDiff;
      }
      return (a.rank ?? 999) - (b.rank ?? 999);
    }
    case "name_asc": {
      return a.displayName.localeCompare(b.displayName, "vi");
    }
    default: {
      return 0;
    }
  }
};

const getEmptyTitle = (
  isSearching: boolean,
  selectedTier: ProviderTier | "ALL"
): string => {
  if (isSearching) {
    if (selectedTier === "ALL") {
      return "Chưa tìm thấy đối tác";
    }
    return "Không có đối tác phù hợp trong hạng này";
  }
  if (selectedTier === "ALL") {
    return "Chưa có đối tác đã xác minh";
  }
  return "Không tìm thấy đối tác";
};

const getEmptyDescription = (
  isSearching: boolean,
  selectedTier: ProviderTier | "ALL",
  searchQuery?: string
): string => {
  if (isSearching) {
    if (selectedTier === "ALL") {
      if (searchQuery) {
        return `Không có kết quả nào khớp với "${searchQuery}". Hãy kiểm tra lại từ khóa hoặc thử tên ngắn hơn.`;
      }
      return "Không tìm thấy đối tác nào phù hợp với thông tin đã nhập.";
    }
    return "Không có đối tác nào thuộc hạng đã chọn khớp với tìm kiếm.";
  }
  if (selectedTier === "ALL") {
    return "Danh sách đối tác sẽ được cập nhật khi có đối tác mới tham gia.";
  }
  return "Chưa có đối tác nào thuộc hạng đã chọn.";
};

interface ProviderShowcaseSectionProps {
  className?: string;
  initialProviders?: ShowcaseProvider[];
  isLoading?: boolean;
  isSearching?: boolean;
  onClearSearch?: () => void;
  onSelectProvider?: (provider: ShowcaseProvider) => void;
  searchQuery?: string;
  title?: string;
}

export const ProviderShowcaseSection = ({
  className,
  initialProviders = EMPTY_PROVIDERS,
  isLoading = false,
  isSearching = false,
  onClearSearch,
  onSelectProvider,
  searchQuery,
  title = "Đối tác đã xác minh",
}: ProviderShowcaseSectionProps) => {
  const [selectedTier, setSelectedTier] = useState<ProviderTier | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<ProviderSortOption>("joined_desc");

  const sortedAndFilteredProviders = (() => {
    const list =
      selectedTier === "ALL"
        ? [...initialProviders]
        : initialProviders.filter((p) => p.tier === selectedTier);

    list.sort((a, b) => compareProviders(a, b, sortBy));

    return list;
  })();

  const totalCount = initialProviders.length;
  const currentCount = sortedAndFilteredProviders.length;

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

    if (sortedAndFilteredProviders.length > 0) {
      return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-10 md:grid-cols-4 lg:grid-cols-6 lg:gap-x-6 xl:gap-x-8">
          {sortedAndFilteredProviders.map((provider) => (
            <ProviderGridItem
              key={provider.id}
              onSelect={onSelectProvider}
              provider={provider}
            />
          ))}
        </div>
      );
    }

    const emptyTitle = getEmptyTitle(isSearching, selectedTier);
    const emptyDescription = getEmptyDescription(
      isSearching,
      selectedTier,
      searchQuery
    );

    return (
      <Empty className="border-none py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {isSearching ? (
              <MagnifyingGlass
                aria-hidden="true"
                className="size-8 text-muted-foreground"
              />
            ) : (
              <ShieldCheck
                aria-hidden="true"
                className="size-8 text-muted-foreground"
              />
            )}
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex flex-wrap items-center justify-center gap-2">
          {selectedTier === "ALL" ? null : (
            <Button
              onClick={() => setSelectedTier("ALL")}
              size="sm"
              variant="outline"
            >
              Xem tất cả hạng
            </Button>
          )}
          {isSearching && onClearSearch && (
            <Button
              onClick={onClearSearch}
              size="sm"
              variant={selectedTier === "ALL" ? "outline" : "ghost"}
            >
              Xóa tìm kiếm
            </Button>
          )}
        </EmptyContent>
      </Empty>
    );
  };

  const displayedCountSuffix =
    selectedTier === "ALL" ? "" : ` (hiển thị ${currentCount})`;

  return (
    <section
      aria-labelledby="showcase-providers-heading"
      className={cn("flex flex-col gap-6", className)}
    >
      {/* Section Header Aligned with Page Structure */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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
              {isSearching
                ? `Tìm thấy ${totalCount} đối tác${displayedCountSuffix}`
                : `Danh sách đang hoạt động theo trang hiện tại · ${currentCount}/${totalCount} đối tác`}
            </p>
          )}
        </div>

        {/* Filter by Rank (Select) & Sort by (Select) Controls */}
        <div
          aria-label="Tùy chọn lọc và sắp xếp"
          className="flex flex-wrap items-center gap-2.5 sm:gap-3"
          role="toolbar"
        >
          {/* Rank Select Filter */}
          <div className="flex items-center gap-1.5">
            <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
              Hạng:
            </span>
            <Select
              disabled={isLoading}
              items={TIER_OPTIONS}
              onValueChange={(val) => {
                if (val) {
                  setSelectedTier(val as ProviderTier | "ALL");
                }
              }}
              value={selectedTier}
            >
              <SelectTrigger
                aria-label="Lọc theo hạng đối tác"
                className="h-10 min-w-36 rounded-2xl border-border/80 bg-background/80 px-3.5 text-xs font-medium shadow-xs transition-colors hover:border-border sm:min-w-40 sm:text-sm"
              >
                <SelectValue placeholder="Lọc theo hạng" />
              </SelectTrigger>
              <SelectContent align="end" className="w-auto min-w-48 p-1.5">
                {TIER_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    <span className="flex items-center gap-2">
                      {item.icon}
                      <span>{item.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort Select */}
          <div className="flex items-center gap-1.5">
            <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
              Sắp xếp:
            </span>
            <Select
              disabled={isLoading}
              items={SORT_OPTIONS}
              onValueChange={(val) => {
                if (val) {
                  setSortBy(val as ProviderSortOption);
                }
              }}
              value={sortBy}
            >
              <SelectTrigger
                aria-label="Sắp xếp danh sách đối tác"
                className="h-10 min-w-44 rounded-2xl border-border/80 bg-background/80 px-3.5 text-xs font-medium shadow-xs transition-colors hover:border-border sm:min-w-48 sm:text-sm"
              >
                <SelectValue placeholder="Sắp xếp theo" />
              </SelectTrigger>
              <SelectContent align="end" className="w-auto min-w-64 p-1.5">
                {SORT_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    <span className="flex items-center gap-2">
                      {item.icon}
                      <span>{item.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reset Filters button if modified */}
          {(selectedTier !== "ALL" ||
            sortBy !== "joined_desc" ||
            isSearching) &&
            !isLoading && (
              <button
                aria-label="Reset bộ lọc"
                className="inline-flex h-10 items-center rounded-2xl border border-border/70 bg-muted/60 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => {
                  setSelectedTier("ALL");
                  setSortBy("joined_desc");
                  if (isSearching && onClearSearch) {
                    onClearSearch();
                  }
                }}
                type="button"
              >
                Reset
              </button>
            )}
        </div>
      </div>

      {/* Grid Container Card */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs sm:p-8 md:p-10">
        {renderContent()}
      </div>
    </section>
  );
};
