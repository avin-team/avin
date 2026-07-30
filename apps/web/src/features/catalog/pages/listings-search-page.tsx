import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronRight, Home, Sparkles } from "lucide-react";

import { Shell } from "@/components/shell";
import { orpc } from "@/utils/orpc";

import { ListingCard } from "../components/listing-card";
import { ListingEmptyState } from "../components/listing-empty-state";
import { ListingGridSkeleton } from "../components/listing-grid-skeleton";
import type { SortByOption } from "../components/listing-search-bar";
import { ListingSearchBar } from "../components/listing-search-bar";
import { Pagination } from "../components/pagination";

export const ListingsSearchPage = () => {
  const searchParams = useSearch({ strict: false }) as {
    page?: number;
    parentSlug?: string;
    search?: string;
    sortBy?: SortByOption;
  };
  const navigate = useNavigate({ from: "/listings/" });

  const page = searchParams.page ?? 1;
  const search = searchParams.search ?? "";
  const sortBy: SortByOption = searchParams.sortBy ?? "newest";
  const selectedParentSlug = searchParams.parentSlug;

  // Fetch Parent Categories for filter
  const categoriesQuery = useQuery(orpc.catalog.categories.queryOptions());

  // Fetch Listings
  const listingsQuery = useQuery(
    orpc.catalog.listings.queryOptions({
      input: {
        limit: 12,
        page,
        parentSlug: selectedParentSlug,
        search: search || undefined,
        sortBy,
      },
    })
  );

  const handleParentSelect = (slug?: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: 1,
        parentSlug: slug,
      }),
    });
  };

  const handleSearchChange = (val: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: 1,
        search: val || undefined,
      }),
    });
  };

  const handleSortChange = (val: SortByOption) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: 1,
        sortBy: val,
      }),
    });
  };

  const handlePageChange = (newPage: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: newPage,
      }),
    });
  };

  return (
    <Shell variant="default">
      <div className="space-y-6 py-6">
        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center space-x-2 text-xs font-medium text-muted-foreground"
        >
          <Link className="flex items-center hover:text-foreground" to="/">
            <Home className="h-3.5 w-3.5" />
          </Link>
          <ChevronRight className="h-3.5 w-3.5 opacity-50" />
          <span className="font-semibold text-foreground">Marketplace</span>
        </nav>

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-background to-card p-6 sm:p-10 shadow-sm backdrop-blur-xl">
          <div className="relative max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Explore Digital Offerings</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Marketplace <span className="text-primary">Listings</span>
            </h1>

            <p className="text-sm text-muted-foreground sm:text-base">
              Find and purchase verified digital services, social media growth,
              account solutions, and expert courses.
            </p>
          </div>
        </div>

        {/* Parent Categories Filter Tabs */}
        {categoriesQuery.data && categoriesQuery.data.length > 0 ? (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                selectedParentSlug === undefined
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              onClick={() => handleParentSelect()}
              type="button"
            >
              Tất cả dịch vụ
            </button>
            {categoriesQuery.data.map((cat) => (
              <button
                key={cat.id}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedParentSlug === cat.slug
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                onClick={() => handleParentSelect(cat.slug)}
                type="button"
              >
                {cat.name}
              </button>
            ))}
          </div>
        ) : null}

        {/* Search & Sort Controls */}
        <ListingSearchBar
          initialSearch={search}
          onSearchChange={handleSearchChange}
          onSortChange={handleSortChange}
          placeholder="Tìm kiếm tất cả dịch vụ và khóa học..."
          sortBy={sortBy}
        />

        {/* Content Grid */}
        {listingsQuery.isLoading ? <ListingGridSkeleton /> : null}

        {listingsQuery.isError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
            <p className="font-medium text-destructive">
              Lỗi khi tải danh sách tin đăng.
            </p>
            <button
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              onClick={() => listingsQuery.refetch()}
              type="button"
            >
              Thử lại
            </button>
          </div>
        ) : null}

        {listingsQuery.data && listingsQuery.data.items.length > 0 ? (
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listingsQuery.data.items.map((item) => (
                <ListingCard key={item.id} listing={item} />
              ))}
            </div>

            <Pagination
              currentPage={listingsQuery.data.page}
              onPageChange={handlePageChange}
              total={listingsQuery.data.total}
              totalPages={listingsQuery.data.totalPages}
            />
          </div>
        ) : null}

        {listingsQuery.data && listingsQuery.data.items.length === 0 ? (
          <ListingEmptyState
            description="Thử điều chỉnh từ khóa tìm kiếm hoặc bộ lọc dịch vụ."
            title="Không tìm thấy tin đăng phù hợp"
          />
        ) : null}
      </div>
    </Shell>
  );
};
