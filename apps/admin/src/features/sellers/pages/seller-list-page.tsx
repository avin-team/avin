import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Input } from "@avin/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import { Skeleton } from "@avin/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avin/ui/components/table";
import {
  GearIcon,
  MagnifyingGlassIcon,
  StorefrontIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";

import { useAdminSellerList } from "../api/seller-enforcement-api";
import { EnforcementDialog } from "../components/enforcement-dialog";
import { SellerEnforcementBadge } from "../components/seller-enforcement-badge";
import type { SellerEnforcementStatus } from "../types";

type StatusFilter = "ALL" | SellerEnforcementStatus;

const getActionLabel = (status: SellerEnforcementStatus): string => {
  if (status === "ACTIVE") {
    return "Xử phạt";
  }
  if (status === "SUSPENDED") {
    return "Điều chỉnh";
  }
  return "Gỡ phạt";
};

const STATUS_FILTER_ITEMS: { label: string; value: StatusFilter }[] = [
  { label: "Tất cả trạng thái", value: "ALL" },
  { label: "Active (Đang hoạt động)", value: "ACTIVE" },
  { label: "Suspended (Tạm dừng)", value: "SUSPENDED" },
  { label: "Banned (Đã cấm)", value: "BANNED" },
];

export const SellerListPage = () => {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [enforcingId, setEnforcingId] = useState<string | null>(null);

  const debouncedQuery = query.trim() || undefined;
  const statusInput = statusFilter === "ALL" ? undefined : statusFilter;

  const { data: sellers = [], isPending } = useAdminSellerList(
    debouncedQuery || statusInput
      ? { search: debouncedQuery, status: statusInput }
      : undefined
  );

  const enforceTarget = enforcingId
    ? sellers.find((s) => s.id === enforcingId)
    : undefined;

  return (
    <>
      <Header fixed />
      <Main className="flex flex-1 flex-col gap-6">
        <div>
          <p className="text-sm font-medium text-primary">SELLER GOVERNANCE</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Seller Governance
          </h1>
          <p className="text-muted-foreground">
            Quản lý trạng thái hoạt động gian hàng, chế tài vi phạm
            (Suspend/Ban) và theo dõi đơn khiếu nại.
          </p>
        </div>

        <Card>
          <CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <StorefrontIcon className="size-4 text-primary" />
              Danh sách Gian Hàng Seller{" "}
              <span className="text-muted-foreground">
                ({isPending ? "..." : sellers.length})
              </span>
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 sm:w-64">
                <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search sellers"
                  className="ps-9"
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm storefront, chủ gian hàng..."
                  value={query}
                />
              </div>
              <Select
                items={STATUS_FILTER_ITEMS}
                onValueChange={(val) =>
                  setStatusFilter((val as StatusFilter) ?? "ALL")
                }
                value={statusFilter}
              >
                <SelectTrigger
                  aria-label="Filter status"
                  className="w-full sm:w-44"
                >
                  <SelectValue placeholder="Trạng thái gian hàng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {STATUS_FILTER_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gian hàng</TableHead>
                    <TableHead>Chủ tài khoản</TableHead>
                    <TableHead>Đánh giá / Đơn hàng</TableHead>
                    <TableHead>Số dư ví</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-end">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isPending
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 6 }).map((__, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-5 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    : sellers.map((seller) => (
                        <TableRow key={seller.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-base">
                                {seller.storefrontName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Tham gia:{" "}
                                {new Date(seller.joinedAt).toLocaleDateString(
                                  "vi-VN"
                                )}
                              </p>
                              {seller.hasActiveAppeal ? (
                                <Badge
                                  className="mt-1 text-[10px]"
                                  variant="outline"
                                >
                                  Đang có khiếu nại
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">
                                {seller.applicantName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {seller.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">
                              <p className="font-medium text-amber-600 dark:text-amber-400">
                                {seller.averageRating.toFixed(1)} ★ (
                                {seller.ratingCount})
                              </p>
                              <p className="text-muted-foreground">
                                {seller.completedOrdersCount} đơn hoàn thành
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-xs">
                              <p className="font-medium text-emerald-600 dark:text-emerald-400">
                                {seller.availableBalanceVnd.toLocaleString(
                                  "vi-VN"
                                )}
                                đ
                              </p>
                              <p className="text-muted-foreground">
                                +{seller.heldBalanceVnd.toLocaleString("vi-VN")}
                                đ giữ
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <SellerEnforcementBadge
                              status={seller.enforcementStatus}
                            />
                            {seller.enforcementStatus === "SUSPENDED" &&
                            seller.expiresAt ? (
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                Hết hạn:{" "}
                                {new Date(seller.expiresAt).toLocaleDateString(
                                  "vi-VN"
                                )}
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-end">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                onClick={() => setEnforcingId(seller.id)}
                                size="sm"
                                variant={
                                  seller.enforcementStatus === "ACTIVE"
                                    ? "destructive"
                                    : "outline"
                                }
                              >
                                <GearIcon className="mr-1" />
                                {getActionLabel(seller.enforcementStatus)}
                              </Button>
                              <Button
                                render={
                                  <Link
                                    params={{ sellerId: seller.id }}
                                    to="/sellers/$sellerId"
                                  />
                                }
                                size="sm"
                                variant="outline"
                              >
                                Chi tiết
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  {!isPending && sellers.length === 0 && (
                    <TableRow>
                      <TableCell
                        className="h-28 text-center text-muted-foreground"
                        colSpan={5}
                      >
                        Không tìm thấy Seller nào phù hợp.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </Main>

      {enforcingId && enforceTarget ? (
        <EnforcementDialog
          onOpenChange={(open) => {
            if (!open) {
              setEnforcingId(null);
            }
          }}
          open={true}
          seller={{
            enforcementStatus: enforceTarget.enforcementStatus,
            id: enforcingId,
            storefrontName: enforceTarget.storefrontName,
          }}
        />
      ) : null}
    </>
  );
};
