import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";

import { Shell } from "@/components/shell";
import { orpc } from "@/utils/orpc";

import { CategoryDetailView } from "../components/category-detail-view";
import type { SortByOption } from "../components/listing-search-bar";

export const CategoryDetailPage = () => {
  const { parentSlug } = useParams({ strict: false });
  const searchParams = useSearch({ strict: false }) as {
    page?: number;
    search?: string;
    sortBy?: SortByOption;
    subSlug?: string;
  };
  const navigate = useNavigate({ from: "/category/$parentSlug" });

  const page = searchParams.page ?? 1;
  const search = searchParams.search ?? "";
  const sortBy: SortByOption = searchParams.sortBy ?? "newest";
  const selectedSubSlug = searchParams.subSlug;

  // Fetch Parent Category metadata
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

  const handleSubSelect = (subSlug?: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: 1,
        subSlug,
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
      <CategoryDetailView
        categoryLoading={categoryQuery.isLoading}
        isError={listingsQuery.isError}
        isLoading={listingsQuery.isLoading}
        listingsData={listingsQuery.data}
        onPageChange={handlePageChange}
        onRefetch={() => listingsQuery.refetch()}
        onSearchChange={handleSearchChange}
        onSortChange={handleSortChange}
        onSubSelect={handleSubSelect}
        page={page}
        parentCategory={parentCategory}
        parentSlug={parentSlug}
        search={search}
        selectedSubSlug={selectedSubSlug}
        sortBy={sortBy}
      />
    </Shell>
  );
};
