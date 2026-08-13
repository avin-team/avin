import { StackIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";

import { Shell } from "@/components/shell";
import { orpc } from "@/utils/orpc";

import { CategoryCarousel } from "../components/category-carousel";
import { CompactCategoryCard } from "../components/compact-category-card";

export const CategoriesPage = () => {
  const categoriesQuery = useQuery(
    orpc.listing.discovery.categories.queryOptions()
  );

  return (
    <Shell variant="default">
      <div className="min-w-0 space-y-8 py-6">
        {categoriesQuery.isLoading ? (
          <div className="h-105 animate-pulse rounded-3xl border border-border/50 bg-muted/40" />
        ) : null}

        {categoriesQuery.isError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
            <p className="font-medium text-destructive">
              Không thể tải dịch vụ. Vui lòng thử lại.
            </p>
            <button
              className="mt-4 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm"
              onClick={() => categoriesQuery.refetch()}
              type="button"
            >
              Thử lại
            </button>
          </div>
        ) : null}

        {categoriesQuery.data && categoriesQuery.data.length > 0 ? (
          <>
            <CategoryCarousel categories={categoriesQuery.data} />
            <section>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="font-bold text-primary text-sm">
                    Khám phá theo nền tảng
                  </p>
                  <h2 className="mt-1 font-black text-2xl">Tất cả dịch vụ</h2>
                </div>
                <p className="text-muted-foreground text-sm">
                  {categoriesQuery.data.length} danh mục đang hoạt động
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {categoriesQuery.data.map((category) => (
                  <CompactCategoryCard category={category} key={category.id} />
                ))}
              </div>
            </section>
          </>
        ) : null}

        {categoriesQuery.data && categoriesQuery.data.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <StackIcon className="mx-auto size-12 text-muted-foreground" />
            <h3 className="mt-4 font-bold text-lg">Chưa có dịch vụ nào</h3>
            <p className="mt-2 text-muted-foreground text-sm">
              Các dịch vụ sẽ xuất hiện tại đây khi hệ thống được cập nhật.
            </p>
          </div>
        ) : null}
      </div>
    </Shell>
  );
};
