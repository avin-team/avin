import { StarIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export interface StarRatingProps {
  className?: string;
  count?: number;
  rating: number;
  showCount?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  lg: "h-6 w-6",
  md: "h-4 w-4",
  sm: "h-3.5 w-3.5",
};

export const StarRating = ({
  className,
  count,
  rating,
  showCount = false,
  size = "md",
}: StarRatingProps) => {
  const iconSize = sizeMap[size];
  const roundedRating = Math.round(rating * 10) / 10;

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= Math.round(rating);
          return (
            <StarIcon
              className={cn(
                iconSize,
                "transition-colors",
                isFilled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-muted text-muted-foreground/30"
              )}
              key={star}
            />
          );
        })}
      </div>
      <span className="font-semibold text-amber-600 dark:text-amber-400 text-sm">
        {roundedRating.toFixed(1)}
      </span>
      {showCount && count !== undefined && (
        <span className="text-muted-foreground text-xs font-normal">
          ({count.toLocaleString()})
        </span>
      )}
    </div>
  );
};

export interface StarRatingInputProps {
  className?: string;
  disabled?: boolean;
  onChange: (rating: number) => void;
  value: number;
}

export const StarRatingInput = ({
  className,
  disabled = false,
  onChange,
  value,
}: StarRatingInputProps) => {
  const [hovered, setHovered] = useState<number | null>(null);

  const activeRating = hovered ?? value;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= activeRating;
        return (
          // oxlint-disable-next-line react/forbid-elements -- star rating interactive trigger
          <button
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            className={cn(
              "p-1 rounded-md transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              disabled && "cursor-not-allowed opacity-50"
            )}
            disabled={disabled}
            key={star}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            type="button"
          >
            <StarIcon
              className={cn(
                "h-8 w-8 transition-transform hover:scale-110",
                isFilled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-muted text-muted-foreground/30"
              )}
            />
          </button>
        );
      })}
    </div>
  );
};
