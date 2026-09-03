import { Button } from "@avin/ui/components/button";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";

export interface PaginationProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  total: number;
  totalPages: number;
}

export const Pagination = ({
  currentPage,
  onPageChange,
  total,
  totalPages,
}: PaginationProps) => {
  if (totalPages <= 1) {
    return null;
  }

  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  const pages = Array.from(
    { length: endPage - startPage + 1 },
    (_, idx) => startPage + idx
  );

  return (
    <div className="flex flex-col items-center justify-between gap-4 py-4 sm:flex-row">
      <p className="text-xs font-medium text-muted-foreground">
        Hiển thị trang{" "}
        <span className="font-semibold text-foreground">{currentPage}</span> /{" "}
        <span className="font-semibold text-foreground">{totalPages}</span>{" "}
        (Tổng cộng {total} tin đăng)
      </p>

      <div className="flex items-center gap-1.5">
        <Button
          aria-label="Trang trước"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          size="icon"
          type="button"
          variant="outline"
        >
          <CaretLeftIcon className="h-4 w-4" />
        </Button>

        {startPage > 1 ? (
          <>
            <Button
              className="min-w-9 px-3"
              onClick={() => onPageChange(1)}
              size="sm"
              type="button"
              variant="outline"
            >
              1
            </Button>
            {startPage > 2 ? (
              <span className="px-1 text-xs text-muted-foreground">...</span>
            ) : null}
          </>
        ) : null}

        {pages.map((p) => (
          <Button
            className="min-w-9 px-3"
            key={p}
            onClick={() => onPageChange(p)}
            size="sm"
            type="button"
            variant={p === currentPage ? "default" : "outline"}
          >
            {p}
          </Button>
        ))}

        {endPage < totalPages ? (
          <>
            {endPage < totalPages - 1 ? (
              <span className="px-1 text-xs text-muted-foreground">...</span>
            ) : null}
            <Button
              className="min-w-9 px-3"
              onClick={() => onPageChange(totalPages)}
              size="sm"
              type="button"
              variant="outline"
            >
              {totalPages}
            </Button>
          </>
        ) : null}

        <Button
          aria-label="Trang sau"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          size="icon"
          type="button"
          variant="outline"
        >
          <CaretRightIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
