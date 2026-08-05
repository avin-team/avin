import type { BuyerOrderView } from "@avin/api/commerce/orders";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import { Calendar as CalendarUI } from "@avin/ui/components/calendar";
import { Card, CardContent } from "@avin/ui/components/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@avin/ui/components/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@avin/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import { cn } from "@avin/ui/lib/utils";
import {
  Calendar,
  CaretLeft,
  CaretRight,
  CheckCircle,
  MagnifyingGlass,
  Receipt,
  Truck,
  Wallet,
  X,
  XCircle,
} from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import {
  formatOrderDate,
  getOrderItemStatusLabel,
  getOrderItemStatusVariant,
  getOrderItemStatusColorClassName,
} from "@/features/commerce/order-status";
import { formatVND } from "@/utils/format";

const STATUS_FILTER_ITEMS = [
  { label: "Tất cả trạng thái", value: "ALL" },
  { label: "Chờ Seller tiếp nhận", value: "AWAITING_SELLER" },
  { label: "Đang thực hiện", value: "PROCESSING" },
  { label: "Đã bàn giao", value: "DELIVERED" },
  { label: "Đang bảo hành", value: "WARRANTY_ACTIVE" },
  { label: "Hoàn tất", value: "COMPLETED" },
  { label: "Đã hủy", value: "CANCELLED" },
  { label: "Đã hoàn tiền", value: "REFUNDED" },
];

interface DatePickerProps {
  ariaLabel: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}

const DatePicker = ({
  ariaLabel,
  onChange,
  placeholder,
  value,
}: DatePickerProps) => {
  const selectedDate = value ? new Date(`${value}T00:00:00`) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      onChange("");
      return;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    onChange(`${year}-${month}-${day}`);
  };

  const formattedDisplay = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : placeholder;

  return (
    <Popover>
      <PopoverTrigger
        aria-label={ariaLabel}
        className={cn(
          "flex h-9 items-center justify-between gap-2 rounded-3xl border border-transparent bg-input/50 px-3 py-2 text-xs font-medium text-foreground transition-[color,box-shadow,background-color] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 select-none cursor-pointer",
          !value && "text-muted-foreground"
        )}
      >
        <div className="flex items-center gap-2">
          <Calendar
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
          <span>{formattedDisplay}</span>
        </div>
        {value ? (
          <button
            aria-label="Xóa ngày"
            className="flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            type="button"
          >
            <X aria-hidden="true" className="size-3" />
          </button>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <CalendarUI
          mode="single"
          onSelect={handleSelect}
          selected={selectedDate}
        />
      </PopoverContent>
    </Popover>
  );
};

interface BuyerOrdersTableProps {
  orders: BuyerOrderView[];
}

export const BuyerOrdersTable = ({ orders }: BuyerOrdersTableProps) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Flatten items for table row representation
  const allItems = useMemo(
    () =>
      orders.flatMap((order) =>
        order.items.map((item) => ({ ...item, order }))
      ),
    [orders]
  );

  // Summary Metrics calculations
  const totalOrdersCount = orders.length;
  const awaitingCount = allItems.filter(
    (i) => i.status === "AWAITING_SELLER"
  ).length;
  const inProgressCount = allItems.filter((i) =>
    ["PROCESSING", "DELIVERED", "DELIVERY_REVIEW_EXPIRED"].includes(i.status)
  ).length;
  const completedCount = allItems.filter((i) =>
    ["COMPLETED", "CLOSED", "WARRANTY_ACTIVE"].includes(i.status)
  ).length;
  const cancelledCount = allItems.filter((i) =>
    ["CANCELLED", "REFUNDED"].includes(i.status)
  ).length;
  const totalSpent = allItems.reduce(
    (sum, item) => sum + (item.priceAmount ?? 0),
    0
  );
  const refundedAmount = allItems
    .filter((i) => i.status === "REFUNDED")
    .reduce((sum, item) => sum + (item.priceAmount ?? 0), 0);

  // Filtered List
  const filteredItems = useMemo(
    () =>
      allItems.filter((item) => {
        // Status check
        if (statusFilter !== "ALL" && item.status !== statusFilter) {
          return false;
        }

        // Search term check
        if (searchTerm.trim()) {
          const query = searchTerm.toLowerCase();
          const matchesTitle = item.listing.title.toLowerCase().includes(query);
          const matchesItemId = item.id.toLowerCase().includes(query);
          const matchesOrderId = item.order.id.toLowerCase().includes(query);
          const matchesSeller = item.order.seller.name
            .toLowerCase()
            .includes(query);
          if (
            !matchesTitle &&
            !matchesItemId &&
            !matchesOrderId &&
            !matchesSeller
          ) {
            return false;
          }
        }

        // Date check
        if (startDate) {
          const itemDate = new Date(item.order.createdAt).getTime();
          const filterStart = new Date(startDate).getTime();
          if (itemDate < filterStart) {
            return false;
          }
        }
        if (endDate) {
          const itemDate = new Date(item.order.createdAt).getTime();
          const filterEnd = new Date(endDate).getTime();
          if (itemDate > filterEnd + 86_400_000) {
            return false;
          }
        }

        return true;
      }),
    [allItems, statusFilter, searchTerm, startDate, endDate]
  );

  const totalPages = Math.max(Math.ceil(filteredItems.length / pageSize), 1);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Top Metric Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Card 1: Tổng số đơn */}
        <Card className="border-border/60 bg-card shadow-xs transition-shadow hover:shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">
                Tổng số đơn
              </p>
              <p className="text-xl font-bold tracking-tight text-foreground">
                {totalOrdersCount}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Chờ thanh toán / tiếp nhận */}
        <Card className="border-border/60 bg-card shadow-xs transition-shadow hover:shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">
                Chờ tiếp nhận
              </p>
              <p className="text-xl font-bold tracking-tight text-foreground">
                {awaitingCount}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Đang giao / Thực hiện */}
        <Card className="border-border/60 bg-card shadow-xs transition-shadow hover:shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Truck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">
                Đang thực hiện
              </p>
              <p className="text-xl font-bold tracking-tight text-foreground">
                {inProgressCount}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Hoàn thành */}
        <Card className="border-border/60 bg-card shadow-xs transition-shadow hover:shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">
                Hoàn thành
              </p>
              <p className="text-xl font-bold tracking-tight text-foreground">
                {completedCount}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Đã hủy */}
        <Card className="border-border/60 bg-card shadow-xs transition-shadow hover:shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400">
              <XCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">
                Đã hủy
              </p>
              <p className="text-xl font-bold tracking-tight text-foreground">
                {cancelledCount}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 6: Tổng đã chi */}
        <Card className="border-border/60 bg-card shadow-xs transition-shadow hover:shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">
                Tổng đã chi
              </p>
              <p className="text-lg font-bold tracking-tight text-foreground">
                {formatVND(totalSpent)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Hoàn tiền: {formatVND(refundedAmount)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar Row */}
      <Card className="border-border/60 bg-card">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          {/* Search Input */}
          <InputGroup className="min-w-[240px] flex-1">
            <InputGroupInput
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm mã đơn hoặc mã nhóm"
              type="text"
              value={searchTerm}
            />
            <InputGroupAddon align="inline-end">
              <MagnifyingGlass aria-hidden="true" className="size-4" />
            </InputGroupAddon>
          </InputGroup>

          {/* Status Filter Dropdown */}
          <Select
            items={STATUS_FILTER_ITEMS}
            onValueChange={(val) => {
              if (val) {
                setStatusFilter(val);
                setCurrentPage(1);
              }
            }}
            value={statusFilter}
          >
            <SelectTrigger
              aria-label="Lọc theo trạng thái"
              className="w-[190px]"
            >
              <SelectValue placeholder="Tất cả trạng thái" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Picker 1 */}
          <DatePicker
            ariaLabel="Từ ngày"
            onChange={(val) => {
              setStartDate(val);
              setCurrentPage(1);
            }}
            placeholder="Từ ngày"
            value={startDate}
          />

          {/* Date Picker 2 */}
          <DatePicker
            ariaLabel="Đến ngày"
            onChange={(val) => {
              setEndDate(val);
              setCurrentPage(1);
            }}
            placeholder="Đến ngày"
            value={endDate}
          />

          {/* Search Button */}
          <Button className="gap-1.5" size="sm" type="button">
            <MagnifyingGlass aria-hidden="true" className="size-4" />
            Tìm kiếm
          </Button>
        </CardContent>
      </Card>

      {/* Main Order Table */}
      <Card className="overflow-hidden border-border/70 bg-card shadow-xs">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground font-semibold">
                <th className="py-3.5 px-4">Mã đơn</th>
                <th className="py-3.5 px-4">Sản phẩm</th>
                <th className="py-3.5 px-4">Người bán</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4 text-center">Số lượng</th>
                <th className="py-3.5 px-4">Tổng tiền</th>
                <th className="py-3.5 px-4">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-muted-foreground"
                  >
                    Không tìm thấy đơn hàng nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const initial = item.order.seller.name
                    .charAt(0)
                    .toUpperCase();

                  return (
                    <tr
                      key={`row-${item.id}`}
                      className="hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => {
                        navigate({
                          params: { id: item.id },
                          to: "/orders/$id",
                        });
                      }}
                    >
                      {/* Mã đơn */}
                      <td aria-label="Mã đơn" className="py-4 px-4 align-top">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-bold text-foreground tracking-tight">
                            #ORD-{item.order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Item {item.id.slice(0, 8)}
                          </span>
                        </div>
                      </td>

                      {/* Sản phẩm */}
                      <td aria-label="Sản phẩm" className="py-4 px-4 align-top">
                        <div className="flex items-start gap-3 min-w-[200px]">
                          {item.listing.thumbnailUrl ? (
                            <img
                              alt={item.listing.title}
                              className="h-10 w-10 shrink-0 rounded-lg object-cover border border-border/50"
                              src={item.listing.thumbnailUrl}
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                              {item.listing.title.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-foreground line-clamp-2">
                              {item.listing.title}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Loại: {item.listing.type}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Người bán */}
                      <td
                        aria-label="Người bán"
                        className="py-4 px-4 align-top"
                      >
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/15 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            {initial}
                          </div>
                          <span className="font-medium text-foreground truncate max-w-[110px]">
                            {item.order.seller.name}
                          </span>
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td
                        aria-label="Trạng thái"
                        className="py-4 px-4 align-top whitespace-nowrap"
                      >
                        <Badge
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                            getOrderItemStatusColorClassName(item.status)
                          )}
                          variant={getOrderItemStatusVariant(item.status)}
                        >
                          {getOrderItemStatusLabel(item.status)}
                        </Badge>
                      </td>

                      {/* Số lượng */}
                      <td
                        aria-label="Số lượng"
                        className="py-4 px-4 align-top text-center font-medium text-muted-foreground"
                      >
                        x1
                      </td>

                      {/* Tổng tiền */}
                      <td
                        aria-label="Tổng tiền"
                        className="py-4 px-4 align-top whitespace-nowrap"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground text-sm">
                            {formatVND(item.priceAmount)}
                          </span>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Đã thanh toán
                          </span>
                        </div>
                      </td>

                      {/* Ngày tạo */}
                      <td
                        aria-label="Ngày tạo"
                        className="py-4 px-4 align-top whitespace-nowrap"
                      >
                        <div className="flex flex-col text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {formatOrderDate(item.order.createdAt)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          <div>
            Hiển thị{" "}
            <strong className="text-foreground">
              {filteredItems.length === 0
                ? 0
                : (currentPage - 1) * pageSize + 1}
            </strong>{" "}
            -{" "}
            <strong className="text-foreground">
              {Math.min(currentPage * pageSize, filteredItems.length)}
            </strong>{" "}
            /{" "}
            <strong className="text-foreground">{filteredItems.length}</strong>{" "}
            đơn hàng
          </div>

          <div className="flex items-center gap-2">
            <Button
              className="h-8 gap-1 px-2.5 text-xs"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              size="sm"
              variant="outline"
            >
              <CaretLeft className="h-3.5 w-3.5" />
              Trước
            </Button>
            <span className="flex h-8 min-w-[32px] items-center justify-center rounded-lg bg-primary px-2 font-bold text-primary-foreground">
              {currentPage}
            </span>
            <Button
              className="h-8 gap-1 px-2.5 text-xs"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              size="sm"
              variant="outline"
            >
              Tiếp
              <CaretRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
