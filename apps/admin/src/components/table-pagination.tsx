import { Button } from "@avin/ui/components/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import {
  CaretDoubleLeftIcon,
  CaretDoubleRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";

import { getPageNumbers } from "@/lib/utils";

export interface TablePaginationProps {
  label?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  page: number;
  pageSize: number;
  pageSizeOptions?: readonly number[];
  total: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export const TablePagination = ({
  label = "bản ghi",
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  total,
  totalPages,
}: TablePaginationProps) => {
  if (total === 0) {
    return null;
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pageNumbers = getPageNumbers(page, totalPages);
  const paginationItems = pageNumbers.map((p, index) => ({
    id:
      typeof p === "number"
        ? `page-${p}`
        : `ellipsis-${index < 3 ? "start" : "end"}`,
    value: p,
  }));
  const pageSizeItems = pageSizeOptions.map((size) => ({
    label: String(size),
    value: String(size),
  }));

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t p-4 sm:flex-row">
      <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
        <p>
          Hiển thị <span className="font-medium text-foreground">{start}</span>–
          <span className="font-medium text-foreground">{end}</span> trên{" "}
          <span className="font-medium text-foreground">{total}</span> {label}
        </p>

        {onPageSizeChange ? (
          <div className="flex items-center gap-2">
            <span className="text-xs">Số dòng:</span>
            <Select
              items={pageSizeItems}
              onValueChange={(value) => onPageSizeChange(Number(value))}
              value={String(pageSize)}
            >
              <SelectTrigger
                aria-label="Chọn số dòng mỗi trang"
                className="h-8 w-20 text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {pageSizeItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        <Button
          aria-label="Trang đầu"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          size="sm"
          type="button"
          variant="outline"
        >
          <CaretDoubleLeftIcon className="size-4" />
        </Button>
        <Button
          aria-label="Trang trước"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          size="sm"
          type="button"
          variant="outline"
        >
          <CaretLeftIcon className="size-4" />
        </Button>

        <div className="flex items-center gap-1">
          {paginationItems.map((item) => {
            if (typeof item.value === "number") {
              const pageNum = item.value;
              const isActive = pageNum === page;
              return (
                <Button
                  aria-current={isActive ? "page" : undefined}
                  className="min-w-8 px-2.5 text-xs"
                  key={item.id}
                  onClick={() => onPageChange(pageNum)}
                  size="sm"
                  type="button"
                  variant={isActive ? "default" : "outline"}
                >
                  {pageNum}
                </Button>
              );
            }
            return (
              <span
                className="px-1 text-muted-foreground text-xs"
                key={item.id}
              >
                {item.value}
              </span>
            );
          })}
        </div>

        <Button
          aria-label="Trang sau"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          size="sm"
          type="button"
          variant="outline"
        >
          <CaretRightIcon className="size-4" />
        </Button>
        <Button
          aria-label="Trang cuối"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          size="sm"
          type="button"
          variant="outline"
        >
          <CaretDoubleRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
};
