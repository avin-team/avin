import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import {
  WarningCircleIcon,
  CheckCircleIcon,
  CaretRightIcon,
  FunnelIcon,
  GridNineIcon,
  HouseIcon,
  ListIcon,
  ArrowCounterClockwiseIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { CategoryIcon } from "../utils/category-icons";
import { ListingCard } from "./listing-card";
import { ListingEmptyState } from "./listing-empty-state";
import { ListingGridSkeleton } from "./listing-grid-skeleton";
import { Pagination } from "./pagination";

export type SortByOption = "newest" | "price_asc" | "price_desc";

const SORT_ITEMS: { label: string; value: SortByOption }[] = [
  { label: "Mới nhất", value: "newest" },
  { label: "Giá tăng dần", value: "price_asc" },
  { label: "Giá giảm dần", value: "price_desc" },
];

export interface CategoryDetailViewProps {
  categoryLoading: boolean;
  isError: boolean;
  isLoading: boolean;
  listingsData?: {
    items: {
      category?: { id: string; name: string; slug: string } | null;
      id: string;
      priceAmount: number;
      ratingCount?: number | null;
      ratingScore?: number | null;
      seller?: {
        id: string;
        image?: string | null;
        name?: string | null;
      } | null;
      soldCount?: number | null;
      thumbnailUrl?: string | null;
      title: string;
      type: "SERVICE" | "COURSE";
      warrantyDurationHours?: number | null;
    }[];
    page: number;
    total: number;
    totalPages: number;
  };
  onPageChange: (newPage: number) => void;
  onRefetch: () => void;
  onSearchChange: (search: string) => void;
  onSortChange: (sortBy: SortByOption) => void;
  onSubSelect: (subSlug?: string) => void;
  page: number;
  parentCategory?: {
    description?: string | null;
    id: string;
    name: string;
    slug: string;
    subCategories?: { id: string; name: string; slug: string }[];
  } | null;
  parentSlug?: string;
  search: string;
  selectedSubSlug?: string;
  sortBy: SortByOption;
}

const CategoryListingsContent = ({
  isError,
  isLoading,
  listingsData,
  onPageChange,
  onRefetch,
  search,
  viewMode,
}: Pick<
  CategoryDetailViewProps,
  | "isError"
  | "isLoading"
  | "listingsData"
  | "onPageChange"
  | "onRefetch"
  | "search"
> & { viewMode: "grid" | "list" }) => {
  if (isLoading) {
    return <ListingGridSkeleton />;
  }
  if (isError) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
        <WarningCircleIcon className="mx-auto h-8 w-8 text-destructive" />
        <p className="mt-2 text-sm font-medium text-destructive">
          Không thể tải sản phẩm. Vui lòng thử lại.
        </p>
        <button
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90"
          onClick={onRefetch}
          type="button"
        >
          Tải lại
        </button>
      </div>
    );
  }
  if (!listingsData || listingsData.items.length === 0) {
    return (
      <ListingEmptyState
        description={
          search
            ? `Không tìm thấy dịch vụ nào cho từ khóa "${search}"`
            : "Chưa có dịch vụ nào trong mục này."
        }
      />
    );
  }
  return (
    <div className="space-y-6">
      <div
        className={
          viewMode === "list"
            ? "space-y-4"
            : "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        {listingsData.items.map((item) => (
          <ListingCard key={item.id} listing={item} variant={viewMode} />
        ))}
      </div>
      <Pagination
        currentPage={listingsData.page}
        onPageChange={onPageChange}
        total={listingsData.total}
        totalPages={listingsData.totalPages}
      />
    </div>
  );
};

const getActiveSubCategory = (
  parentCategory: CategoryDetailViewProps["parentCategory"],
  selectedSubSlug: string | undefined
) =>
  parentCategory?.subCategories?.find(
    (subCategory) => subCategory.slug === selectedSubSlug
  );

export const CategoryDetailView = ({
  categoryLoading: _categoryLoading,
  isError,
  isLoading,
  listingsData,
  onPageChange,
  onRefetch,
  onSearchChange,
  onSortChange,
  onSubSelect,
  parentCategory,
  parentSlug,
  search,
  selectedSubSlug,
  sortBy,
}: CategoryDetailViewProps) => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const activeSub = getActiveSubCategory(parentCategory, selectedSubSlug);

  return (
    <div className="space-y-6 py-6">
      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center text-xs text-muted-foreground"
      >
        <ol className="flex items-center space-x-1.5 flex-wrap gap-y-1">
          <li>
            <Link
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              to="/"
            >
              <HouseIcon className="h-3.5 w-3.5" />
              <span>Trang chủ</span>
            </Link>
          </li>
          <CaretRightIcon className="h-3 w-3 shrink-0 opacity-50" />
          <li>
            {parentCategory ? (
              <span className="font-semibold text-foreground">
                {parentCategory.name}
              </span>
            ) : (
              <span className="capitalize">
                {parentSlug?.replaceAll("-", " ")}
              </span>
            )}
          </li>
          {activeSub && (
            <>
              <CaretRightIcon className="h-3 w-3 shrink-0 opacity-50" />
              <li className="font-medium text-primary">{activeSub.name}</li>
            </>
          )}
        </ol>
      </nav>

      {/* Category Banner / Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-linear-to-r from-primary/10 via-card to-background p-6 md:p-8 shadow-sm backdrop-blur-md">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <CategoryIcon
                className="h-4 w-4"
                slug={parentSlug ?? "default"}
              />
              <span>{parentCategory?.name ?? "Danh mục dịch vụ"}</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
              {activeSub
                ? activeSub.name
                : (parentCategory?.name ?? "Dịch vụ sản phẩm")}
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {parentCategory?.description ??
                "Khám phá các dịch vụ & giải pháp chuyên nghiệp từ những người bán uy tín đã được xác thực."}
            </p>
          </div>

          {/* Quick Count Badge */}
          {listingsData && (
            <div className="shrink-0 rounded-2xl border border-border/80 bg-background/80 px-4 py-3 text-center shadow-xs backdrop-blur-sm">
              <span className="block text-2xl font-black text-primary">
                {listingsData.total}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                Sản phẩm & Dịch vụ
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Catalog Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Sidebar Filters */}
        <aside className="space-y-6 lg:col-span-1">
          {/* Sub-categories Card */}
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-xs backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">
                  Phân loại chi tiết
                </h2>
              </div>
              {selectedSubSlug && (
                <button
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => onSubSelect()}
                  type="button"
                >
                  <ArrowCounterClockwiseIcon className="h-3 w-3" />
                  <span>Xóa lọc</span>
                </button>
              )}
            </div>

            <div className="space-y-1">
              <button
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                  selectedSubSlug
                    ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                    : "bg-primary text-primary-foreground font-semibold shadow-xs"
                }`}
                onClick={() => onSubSelect()}
                type="button"
              >
                <span>Tất cả dịch vụ</span>
                {!selectedSubSlug && (
                  <CheckCircleIcon className="h-3.5 w-3.5" />
                )}
              </button>

              {parentCategory?.subCategories?.map((sub) => {
                const isSelected = selectedSubSlug === sub.slug;
                return (
                  <button
                    key={sub.id}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    onClick={() => onSubSelect(sub.slug)}
                    type="button"
                  >
                    <span className="truncate text-left pr-2">{sub.name}</span>
                    {isSelected && (
                      <CheckCircleIcon className="h-3.5 w-3.5 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="space-y-6 lg:col-span-3">
          {/* Top Control Bar (Search, Sort, Grid/List view toggle) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/60 p-4 shadow-xs backdrop-blur-md">
            {/* Search Input */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                className="w-full rounded-xl border border-border/80 bg-background/80 pl-10 pr-4 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary transition-all"
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Tìm kiếm dịch vụ..."
                type="text"
                value={search}
              />
            </div>

            {/* Sort & Density Controls */}
            <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0">
              {/* Sort Select */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0 hidden md:inline">
                  Sắp xếp:
                </span>
                <Select
                  items={SORT_ITEMS}
                  value={sortBy}
                  onValueChange={(val) => onSortChange(val as SortByOption)}
                >
                  <SelectTrigger className="h-9 w-35 text-xs font-medium rounded-xl border-border/80 bg-background/80">
                    <SelectValue placeholder="Sắp xếp theo" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {SORT_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* View Density Switcher (Grid 3-col vs List 1-col) */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0 hidden md:inline">
                  Hiển thị:
                </span>
                <div className="flex items-center rounded-xl border border-border bg-muted/40 p-1">
                  <button
                    className={`rounded-lg p-1.5 transition-all ${
                      viewMode === "grid"
                        ? "bg-background text-primary shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setViewMode("grid")}
                    aria-label="Lưới 3 cột"
                    type="button"
                  >
                    <GridNineIcon className="h-4 w-4" />
                  </button>
                  <button
                    className={`rounded-lg p-1.5 transition-all ${
                      viewMode === "list"
                        ? "bg-background text-primary shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setViewMode("list")}
                    aria-label="Danh sách 1 cột"
                    type="button"
                  >
                    <ListIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Listings Content */}
          <CategoryListingsContent
            isError={isError}
            isLoading={isLoading}
            listingsData={listingsData}
            onPageChange={onPageChange}
            onRefetch={onRefetch}
            search={search}
            viewMode={viewMode}
          />
        </main>
      </div>
    </div>
  );
};
