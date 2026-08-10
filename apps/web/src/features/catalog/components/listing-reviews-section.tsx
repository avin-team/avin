import { Button } from "@avin/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { MessageSquareIcon, StarIcon } from "lucide-react";
import { useState } from "react";

import { StarRating } from "@/features/catalog/components/star-rating";
import { orpc } from "@/utils/orpc";

export interface ListingReviewsSectionProps {
  completedOrderCount: number;
  listingId: string;
  ratingCount: number;
  ratingScore: number | string;
}

export const ListingReviewsSection = ({
  completedOrderCount,
  listingId,
  ratingCount,
  ratingScore,
}: ListingReviewsSectionProps) => {
  const [cursor, setCursor] = useState<string>();

  const reviewsQuery = useQuery(
    orpc.commerce.review.getByListing.queryOptions({
      input: {
        cursor,
        limit: 10,
        listingId,
      },
    })
  );

  const numRatingScore =
    typeof ratingScore === "string" ? Number(ratingScore) : ratingScore;

  const { data } = reviewsQuery;
  const reviews = data?.reviews ?? [];
  const starDist = data?.starDistribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const totalReviews = ratingCount || (data?.reviews.length ?? 0);

  const renderContent = () => {
    if (reviewsQuery.isLoading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              className="h-24 rounded-2xl bg-muted/40 animate-pulse"
              key={i}
            />
          ))}
        </div>
      );
    }

    if (reviews.length > 0) {
      return (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div
              className="rounded-2xl border border-border/50 bg-card p-4 transition-all hover:border-border"
              key={r.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">
                    {r.reviewerMaskedName}
                  </span>
                  {r.servicePackageName ? (
                    <span className="rounded-md bg-muted/70 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      Gói: {r.servicePackageName}
                    </span>
                  ) : null}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                </span>
              </div>

              <div className="mt-2">
                <StarRating rating={r.rating} size="sm" />
              </div>

              {r.comment ? (
                <p className="mt-2.5 text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                  {r.comment}
                </p>
              ) : null}
            </div>
          ))}

          {data?.nextCursor ? (
            <div className="pt-2 text-center">
              <Button
                onClick={() => setCursor(data.nextCursor)}
                size="sm"
                variant="outline"
              >
                Tải thêm đánh giá
              </Button>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center">
        <MessageSquareIcon className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          Chưa có đánh giá nào cho sản phẩm này.
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6 pt-8 border-t border-border/60">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Đánh giá từ người mua
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Đã hoàn thành {completedOrderCount} đơn hàng
          </p>
        </div>
        {numRatingScore > 0 ? (
          <div className="flex items-center gap-2">
            <StarRating
              count={totalReviews}
              rating={numRatingScore}
              showCount
              size="lg"
            />
          </div>
        ) : (
          <span className="text-xs text-muted-foreground font-medium">
            Chưa có đánh giá
          </span>
        )}
      </div>

      {/* Star distribution breakdown */}
      {totalReviews > 0 ? (
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div className="flex flex-col items-center justify-center p-4 border-b sm:border-b-0 sm:border-r border-border/40 text-center">
            <span className="text-4xl font-black text-amber-500 tracking-tight">
              {numRatingScore.toFixed(1)}
            </span>
            <div className="mt-1">
              <StarRating rating={numRatingScore} size="md" />
            </div>
            <span className="mt-2 text-xs font-medium text-muted-foreground">
              Dựa trên {totalReviews} đánh giá công khai
            </span>
          </div>

          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = starDist[star as keyof typeof starDist] ?? 0;
              const percent =
                totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div className="flex items-center gap-3 text-xs" key={star}>
                  <div className="flex items-center gap-1 w-12 font-medium">
                    <span>{star}</span>
                    <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-medium text-muted-foreground">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {renderContent()}
    </div>
  );
};
