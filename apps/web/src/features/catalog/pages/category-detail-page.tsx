import { useQuery } from "@tanstack/react-query";
import {
  Link,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { AlertCircle, ChevronRight, Filter, Home, Layers } from "lucide-react";

import { Shell } from "@/components/shell";
import { orpc } from "@/utils/orpc";

import { ListingCard } from "../components/listing-card";
import { ListingEmptyState } from "../components/listing-empty-state";
import { ListingGridSkeleton } from "../components/listing-grid-skeleton";
import type { SortByOption } from "../components/listing-search-bar";
import { ListingSearchBar } from "../components/listing-search-bar";
import { Pagination } from "../components/pagination";
import { CategoryIcon } from "../utils/category-icons";

export const CategoryDetailPage = () => {
  const { parentSlug } = useParams({ strict: false });
  const searchParams = useSearch({ strict: false }) as {
    page?: number;
    search?: string;
    sortBy?: SortByOption;
    subSlug?: string;
  };
  const navigate = useNavigate();

  const page = searchParams.page ?? 1;
  const search = searchParams.search ?? "";
  const sortBy: SortByOption = searchParams.sortBy ?? "newest";
  const selectedSubSlug = searchParams.subSlug;

  // Fetch Parent Category info (only by parentSlug so changing subSlug does not refetch parent metadata)
  const categoryQuery = useQuery(
    orpc.catalog.categoryBySlug.queryOptions({
      input: { parentSlug: parentSlug ?? "" },
    })
  );

  // Fetch Listings for this parent & optional sub-category filter
  const listingsQuery = useQuery(
    orpc.catalog.listings.queryOptions({
      input: {
        limit: 12,
        page,
        parentSlug,
        search: search || undefined,
        sortBy,
        subSlug: selectedSubSlug,
      },
    })
  );

  const parentCategory = categoryQuery.data?.parent;
  const activeSub = parentCategory?.subCategories?.find(
    (s) => s.slug === selectedSubSlug
  );

  const handleSubSelect = (subSlug?: string) => {
    navigate({
      search: {
        ...searchParams,
        page: 1,
        subSlug,
      } as unknown as Record<string, unknown>,
    });
  };

  const handleSearchChange = (val: string) => {
    navigate({
      search: {
        ...searchParams,
        page: 1,
        search: val || undefined,
      } as unknown as Record<string, unknown>,
    });
  };

  const handleSortChange = (val: SortByOption) => {
    navigate({
      search: {
        ...searchParams,
        page: 1,
        sortBy: val,
      } as unknown as Record<string, unknown>,
    });
  };

  const handlePageChange = (newPage: number) => {
    navigate({
      search: {
        ...searchParams,
        page: newPage,
      } as unknown as Record<string, unknown>,
    });
  };

  return (
    <Shell variant="default">
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
            Categories
          </Link>
          <ChevronRight className="h-3.5 w-3.5 opacity-50" />
          <span className="font-semibold text-foreground">
            {parentCategory?.name ?? parentSlug}
          </span>
        </nav>

        {/* Parent Category Banner Loading / Error / Success */}
        {categoryQuery.isLoading ? (
          <div className="h-40 animate-pulse rounded-3xl border border-border/50 bg-muted/40 p-6" />
        ) : null}

        {categoryQuery.isError || !parentCategory ? (
          <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <h2 className="mt-3 text-lg font-bold text-foreground">
              Category Not Found
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The category &quot;{parentSlug}&quot; could not be found or is
              unavailable.
            </p>
            <div className="mt-4">
              <Link
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                to="/category"
              >
                <span>View All Categories</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-r from-card via-background to-card p-6 sm:p-8 shadow-sm backdrop-blur-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
                  <CategoryIcon
                    className="h-7 w-7"
                    slug={parentCategory.slug}
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                    {parentCategory.name}
                  </h1>
                  {parentCategory.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {parentCategory.description}
                    </p>
                  ) : null}
                </div>
              </div>

              {parentCategory.subCategories ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {parentCategory.subCategories.length} Sub-categories
                  </span>
                </div>
              ) : null}
            </div>

            {/* Sub-category Filter Tabs */}
            {parentCategory.subCategories &&
            parentCategory.subCategories.length > 0 ? (
              <div className="mt-6 pt-4 border-t border-border/40">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground mr-1">
                    <Filter className="h-3.5 w-3.5" /> Filter:
                  </span>
                  <button
                    className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all whitespace-nowrap ${
                      selectedSubSlug === undefined
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    onClick={() => handleSubSelect()}
                    type="button"
                  >
                    All Subcategories
                  </button>
                  {parentCategory.subCategories.map((sub) => (
                    <button
                      key={sub.id}
                      className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all whitespace-nowrap ${
                        selectedSubSlug === sub.slug
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                      onClick={() => handleSubSelect(sub.slug)}
                      type="button"
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Search & Sort Controls */}
        <ListingSearchBar
          initialSearch={search}
          onSearchChange={handleSearchChange}
          onSortChange={handleSortChange}
          placeholder={`Search in ${parentCategory?.name ?? "this category"}...`}
          sortBy={sortBy}
        />

        {/* Active Filters Summary */}
        {activeSub ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Showing listings for:</span>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 font-semibold text-primary">
              {activeSub.name}
            </span>
          </div>
        ) : null}

        {/* Listings Content Grid */}
        {listingsQuery.isLoading ? <ListingGridSkeleton /> : null}

        {listingsQuery.isError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
            <p className="font-medium text-destructive">
              Error loading listings. Please try again.
            </p>
            <button
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              onClick={() => listingsQuery.refetch()}
              type="button"
            >
              Retry
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

            {/* Offset-based Pagination */}
            <Pagination
              currentPage={listingsQuery.data.page}
              onPageChange={handlePageChange}
              total={listingsQuery.data.total}
              totalPages={listingsQuery.data.totalPages}
            />
          </div>
        ) : null}

        {/* Empty State */}
        {listingsQuery.data && listingsQuery.data.items.length === 0 ? (
          <ListingEmptyState
            description={
              search
                ? `No results matching "${search}"`
                : "There are currently no active listings in this category."
            }
          />
        ) : null}
      </div>
    </Shell>
  );
};
