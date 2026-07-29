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
import { Search, Store } from "lucide-react";
import { useState } from "react";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";

import { useSellers } from "../api/mock-sellers";
import { SellerEnforcementBadge } from "../components/seller-enforcement-badge";
import type { SellerEnforcementStatus } from "../types";

type StatusFilter = "ALL" | SellerEnforcementStatus;

export const SellerListPage = () => {
  const sellers = useSellers();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const q = query.trim().toLowerCase();
  const filteredSellers = sellers.filter((seller) => {
    const matchStatus =
      statusFilter === "ALL" || seller.enforcementStatus === statusFilter;
    const matchQuery =
      q.length === 0 ||
      seller.storefrontName.toLowerCase().includes(q) ||
      seller.applicantName.toLowerCase().includes(q) ||
      seller.email.toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  return (
    <>
      <Header fixed>
        <div className="ml-auto">
          <ThemeSwitch />
        </div>
      </Header>
      <Main className="flex flex-1 flex-col gap-6">
        <div>
          <p className="text-sm font-medium text-primary">SELLER GOVERNANCE</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Storefront Governance
          </h1>
          <p className="text-muted-foreground">
            Quản lý trạng thái hoạt động gian hàng, chế tài vi phạm
            (Suspend/Ban) và theo dõi số dư ví SellerWallet.
          </p>
        </div>

        <Card>
          <CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="size-4 text-primary" />
              Danh sách Gian Hàng Seller{" "}
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
                  placeholder="Tìm storefront, chủ gian hàng..."
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
                  <SelectValue placeholder="Trạng thái gian hàng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="ACTIVE">
                    Active (Đang hoạt động)
                  </SelectItem>
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
                    <TableHead>Chủ tài khoản</TableHead>
                    <TableHead>Đánh giá / Đơn hàng</TableHead>
                    <TableHead>Số dư ví SellerWallet</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-end">Quản trị</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSellers.map((seller) => (
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
                            {seller.averageRating} ★ ({seller.ratingCount})
                          </p>
                          <p className="text-muted-foreground">
                            {seller.completedOrdersCount} đơn hoàn thành
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            {seller.wallet.availableBalanceVnd.toLocaleString(
                              "vi-VN"
                            )}{" "}
                            đ{" "}
                            <span className="font-sans text-[10px] text-muted-foreground">
                              (Khả dụng)
                            </span>
                          </p>
                          <p className="font-mono text-muted-foreground">
                            {seller.wallet.pendingEscrowBalanceVnd.toLocaleString(
                              "vi-VN"
                            )}{" "}
                            đ (Tạm giữ Escrow)
                          </p>
                        </div>
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
                          Quản lý & Vi phạm
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
    </>
  );
};
