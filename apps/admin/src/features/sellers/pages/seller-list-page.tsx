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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avin/ui/components/table";
import { Link } from "@tanstack/react-router";
import { Search, Star, Store } from "lucide-react";
import { useMemo, useState } from "react";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";

import { useSellers } from "../api/mock-sellers";
import { SellerEnforcementBadge } from "../components/seller-enforcement-badge";
import type { SellerEnforcementStatus } from "../types";

type StatusFilter = "ALL" | SellerEnforcementStatus;

export function SellerListPage() {
  const sellers = useSellers();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const filteredSellers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sellers.filter((seller) => {
      const matchStatus =
        statusFilter === "ALL" || seller.enforcementStatus === statusFilter;
      const matchQuery =
        q.length === 0 ||
        seller.storefrontName.toLowerCase().includes(q) ||
        seller.applicantName.toLowerCase().includes(q) ||
        seller.email.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [sellers, query, statusFilter]);

  return (
    <>
      <Header fixed>
        <div className="ml-auto">
          <ThemeSwitch />
        </div>
      </Header>
      <Main className="flex flex-1 flex-col gap-6">
        <div>
          <p className="text-sm font-medium text-primary">
            MARKETPLACE GOVERNANCE
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Sellers & Enforcement
          </h1>
          <p className="text-muted-foreground">
            Quản lý nhà bán hàng, theo dõi uy tín và xử lý vi phạm chính sách
            (Suspend / Ban).
          </p>
        </div>

        <Card>
          <CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">
              Danh sách Sellers{" "}
              <span className="text-muted-foreground">
                ({filteredSellers.length})
              </span>
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 sm:w-64">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search sellers"
                  className="ps-9"
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm storefront hoặc email"
                  value={query}
                />
              </div>
              <Select
                onValueChange={(val) =>
                  setStatusFilter((val as StatusFilter) ?? "ALL")
                }
                value={statusFilter}
              >
                <SelectTrigger
                  aria-label="Filter status"
                  className="w-full sm:w-44"
                >
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="ACTIVE">Active (Hoạt động)</SelectItem>
                  <SelectItem value="SUSPENDED">
                    Suspended (Tạm dừng)
                  </SelectItem>
                  <SelectItem value="BANNED">Banned (Đã cấm)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Storefront</TableHead>
                    <TableHead>Chủ gian hàng</TableHead>
                    <TableHead>Đánh giá & Đơn</TableHead>
                    <TableHead>Số dư khả dụng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-end">Chi tiết</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSellers.map((seller) => (
                    <TableRow key={seller.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Store className="size-4 text-primary" />
                          <div>
                            <p className="font-medium">
                              {seller.storefrontName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {seller.activeListingsCount} listings đang bán
                            </p>
                          </div>
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
                        <div className="flex items-center gap-1">
                          <Star className="size-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-medium">
                            {seller.averageRating}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({seller.ratingCount} ĐG ·{" "}
                            {seller.completedOrdersCount} đơn)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {seller.wallet.availableBalanceVnd.toLocaleString(
                          "vi-VN"
                        )}{" "}
                        đ
                      </TableCell>
                      <TableCell>
                        <SellerEnforcementBadge
                          status={seller.enforcementStatus}
                        />
                      </TableCell>
                      <TableCell className="text-end">
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
                          Quản lý
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSellers.length === 0 && (
                    <TableRow>
                      <TableCell
                        className="h-28 text-center text-muted-foreground"
                        colSpan={6}
                      >
                        Không tìm thấy Seller phù hợp.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
