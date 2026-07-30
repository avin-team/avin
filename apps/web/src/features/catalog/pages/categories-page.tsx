import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Grid, Layers, Search, Sparkles } from "lucide-react";

import { Shell } from "@/components/shell";
import { orpc } from "@/utils/orpc";

import { CategoryCard } from "../components/category-card";

export const CategoriesPage = () => {
  const categoriesQuery = useQuery(orpc.catalog.categories.queryOptions());

  return (
    <Shell variant="default">
      <div className="space-y-8 py-6">
        {/* Header Hero Section */}
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-card p-8 sm:p-12 shadow-sm backdrop-blur-xl">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Service & Product Marketplace</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Browse by <span className="text-primary">Category</span>
            </h1>

            <p className="text-base text-muted-foreground sm:text-lg">
              Explore trusted digital services, account management, growth
              tools, and courses verified by our platform.
            </p>

            <div className="pt-2">
              <Link
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90"
                to="/listings"
              >
                <Search className="h-4 w-4" />
                <span>Search All Listings</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Grid className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                All Categories
              </h2>
            </div>
            {categoriesQuery.data ? (
              <span className="text-sm font-medium text-muted-foreground">
                {categoriesQuery.data.length} active categories
              </span>
            ) : null}
          </div>

          {/* Loading Skeletons */}
          {categoriesQuery.isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-2xl border border-border/50 bg-muted/40 p-6"
                />
              ))}
            </div>
          ) : null}

          {/* Error State */}
          {categoriesQuery.isError ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
              <p className="font-medium text-destructive">
                Failed to load categories. Please try again.
              </p>
              <button
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                onClick={() => categoriesQuery.refetch()}
                type="button"
              >
                Retry
              </button>
            </div>
          ) : null}

          {/* Categories Grid */}
          {categoriesQuery.data && categoriesQuery.data.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categoriesQuery.data.map((cat) => (
                <CategoryCard key={cat.id} category={cat} />
              ))}
            </div>
          ) : null}

          {/* Empty State */}
          {categoriesQuery.data && categoriesQuery.data.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <Layers className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-bold text-foreground">
                No active categories found
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Categories will appear here once configured by the platform.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </Shell>
  );
};
