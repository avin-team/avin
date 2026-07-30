/* oxlint-disable complexity */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Filter,
  Grid3X3,
  Grid2X2,
  Home,
  RotateCcw,
  Search,
} from "lucide-react";
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
      seller?: {
        id: string;
        image?: string | null;
        name?: string | null;
      } | null;
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

export const CategoryDetailView = ({
  categoryLoading,
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
  const [gridCols, setGridCols] = useState<3 | 4>(4);
  const activeSub = parentCategory?.subCategories?.find(
    (s) => s.slug === selectedSubSlug
  );

  return (
    <div className="space-y-6 py-6">
      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center space-x-2 text-xs font-medium text-muted-foreground"
      >
        <Link className="flex items-center hover:text-foreground" to="/">
          <Home className="h-3.5 w-3.5" />
        </Link>
        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
        <Link className="hover:text-foreground" to="/category">
          Dịch vụ
        </Link>
        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
        <span className="font-semibold text-foreground">
          {parentCategory?.name ?? parentSlug}
        </span>
      </nav>

      {/* Header Banner - Compact & Modern */}
      {categoryLoading && (
        <div className="h-28 animate-pulse rounded-2xl border border-border/50 bg-muted/40 p-6" />
      )}
      {!categoryLoading && parentCategory && (
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-r from-card via-background to-card p-6 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <CategoryIcon className="h-6 w-6" slug={parentCategory.slug} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {parentCategory.name}
              </h1>
              {parentCategory.description ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {parentCategory.description}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Main E-Commerce Split Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Sidebar Filter Panel */}
        <aside className="lg:col-span-3">
          <div className="sticky top-20 space-y-7 rounded-2xl border border-border/60 bg-card p-6 shadow-xs">
            {/* Filter Panel Header */}
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground tracking-tight">
                <Filter className="h-4 w-4 text-primary" /> Bộ lọc tìm kiếm
              </h2>
              {(selectedSubSlug || search || sortBy !== "newest") && (
                <button
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => {
                    onSubSelect(undefined);
                    onSearchChange("");
                    onSortChange("newest");
                  }}
                  type="button"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Đặt lại
                </button>
              )}
            </div>

            {/* Section 1: Search Input */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Tìm kiếm từ khóa
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  className="w-full rounded-xl border border-border/80 bg-background/80 pl-10 pr-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:bg-background focus:outline-hidden"
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Nhập từ khóa..."
                  type="text"
                  value={search}
                />
              </div>
            </div>

            {/* Section 2: Subcategories Vertical List */}
            {parentCategory?.subCategories &&
            parentCategory.subCategories.length > 0 ? (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Phân loại dịch vụ
                </label>
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  <button
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-xs text-left font-medium transition-all ${
                      selectedSubSlug === undefined
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                    onClick={() => onSubSelect(undefined)}
                    type="button"
                  >
                    <span>Tất cả dịch vụ</span>
                    {selectedSubSlug === undefined && (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    )}
                  </button>

                  {parentCategory.subCategories.map((sub) => {
                    const isSelected = selectedSubSlug === sub.slug;
                    return (
                      <button
                        key={sub.id}
                        className={`flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-xs text-left font-medium leading-relaxed transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        }`}
                        onClick={() => onSubSelect(sub.slug)}
                        type="button"
                      >
                        <span className="line-clamp-2">{sub.name}</span>
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        {/* Right Main Content Area */}
        <main className="space-y-6 lg:col-span-9">
          {/* Active Filter Chips & View Toolbar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-foreground">
                {listingsData
                  ? `${listingsData.total} sản phẩm`
                  : "Đang tải..."}
              </span>

              {activeSub && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 font-semibold text-primary">
                  {activeSub.name}
                  <button
                    className="ml-1 text-primary hover:opacity-75"
                    onClick={() => onSubSelect(undefined)}
                    type="button"
                  >
                    ×
                  </button>
                </span>
              )}

              {search && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 font-medium text-foreground">
                  Từ khóa: &quot;{search}&quot;
                  <button
                    className="ml-1 text-muted-foreground hover:text-foreground"
                    onClick={() => onSearchChange("")}
                    type="button"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>

            {/* Right Controls: Common UI Select Dropdown & Density switch */}
            <div className="flex flex-wrap items-center gap-3 self-end sm:self-auto">
              {/* UI Library Select Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
                  Sắp xếp:
                </span>
                <Select
                  items={SORT_ITEMS}
                  onValueChange={(val) => onSortChange(val as SortByOption)}
                  value={sortBy}
                >
                  <SelectTrigger
                    className="rounded-xl border border-border/80 bg-background px-3 font-semibold text-xs text-foreground shadow-2xs focus-visible:ring-primary/30"
                    size="sm"
                  >
                    <SelectValue placeholder="Sắp xếp theo" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="newest">Mới nhất</SelectItem>
                    <SelectItem value="price_asc">Giá tăng dần</SelectItem>
                    <SelectItem value="price_desc">Giá giảm dần</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* View Density Switcher */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Hiển thị:</span>
                <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
                  <button
                    className={`rounded-md p-1.5 transition-all ${
                      gridCols === 3
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setGridCols(3)}
                    title="Lưới 3 cột"
                    type="button"
                  >
                    <Grid2X2 className="h-4 w-4" />
                  </button>
                  <button
                    className={`rounded-md p-1.5 transition-all ${
                      gridCols === 4
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setGridCols(4)}
                    title="Lưới 4 cột"
                    type="button"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Listings Content */}
          {isLoading && <ListingGridSkeleton />}

          {isError && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
              <p className="mt-2 text-sm font-medium text-destructive">
                Không thể tải sản phẩm. Vui lòng thử lại.
              </p>
              <button
                className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                onClick={onRefetch}
                type="button"
              >
                Tải lại
              </button>
            </div>
          )}

          {listingsData && listingsData.items.length > 0 && (
            <div className="space-y-6">
              <div
                className={`grid gap-5 ${
                  gridCols === 3
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                }`}
              >
                {listingsData.items.map((item) => (
                  <ListingCard key={item.id} listing={item} />
                ))}
              </div>

              <Pagination
                currentPage={listingsData.page}
                onPageChange={onPageChange}
                total={listingsData.total}
                totalPages={listingsData.totalPages}
              />
            </div>
          )}

          {listingsData && listingsData.items.length === 0 && (
            <ListingEmptyState
              description={
                search
                  ? `Không tìm thấy dịch vụ nào cho từ khóa "${search}"`
                  : "Chưa có dịch vụ nào trong mục này."
              }
            />
          )}
        </main>
      </div>
    </div>
  );
};
