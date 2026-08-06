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
        <button
          aria-label="Trang trước"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          <CaretLeftIcon className="h-4 w-4" />
        </button>

        {startPage > 1 ? (
          <>
            <button
              className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              onClick={() => onPageChange(1)}
              type="button"
            >
              1
            </button>
            {startPage > 2 ? (
              <span className="px-1 text-xs text-muted-foreground">...</span>
            ) : null}
          </>
        ) : null}

        {pages.map((p) => (
          <button
            key={p}
            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-all ${
              p === currentPage
                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                : "border-border bg-background text-foreground hover:bg-muted"
            }`}
            onClick={() => onPageChange(p)}
            type="button"
          >
            {p}
          </button>
        ))}

        {endPage < totalPages ? (
          <>
            {endPage < totalPages - 1 ? (
              <span className="px-1 text-xs text-muted-foreground">...</span>
            ) : null}
            <button
              className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              onClick={() => onPageChange(totalPages)}
              type="button"
            >
              {totalPages}
            </button>
          </>
        ) : null}

        <button
          aria-label="Trang sau"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          <CaretRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
