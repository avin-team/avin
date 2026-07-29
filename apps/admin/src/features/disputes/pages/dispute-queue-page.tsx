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
import { AlertCircle, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";

import { useDisputes } from "../api/mock-disputes";
import { DisputeStatusBadge } from "../components/dispute-status-badge";
import type { DisputeStatus } from "../types";

type StatusFilter = "ALL" | DisputeStatus;

export function DisputeQueuePage() {
  const disputes = useDisputes();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const filteredDisputes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return disputes.filter((dispute) => {
      const matchStatus =
        statusFilter === "ALL" || dispute.status === statusFilter;
      const matchQuery =
        q.length === 0 ||
        dispute.buyerName.toLowerCase().includes(q) ||
        dispute.sellerStorefrontName.toLowerCase().includes(q) ||
        dispute.itemSnapshot.listingTitle.toLowerCase().includes(q) ||
        dispute.itemSnapshot.orderId.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [disputes, query, statusFilter]);

  return (
    <>
      <Header fixed>
        <div className="ml-auto">
          <ThemeSwitch />
        </div>
      </Header>
      <Main className="flex flex-1 flex-col gap-6">
        <div>
          <p className="text-sm font-medium text-primary">DISPUTE MEDIATION</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Order Disputes
          </h1>
          <p className="text-muted-foreground">
            Giải quyết tranh chấp giữa Buyer và Seller, bảo vệ dòng tiền
            EscrowHold và đưa ra quyết định hòa giải.
          </p>
        </div>

        <Card>
          <CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="size-4 text-amber-500" />
              Danh sách Khiếu nại & Tranh chấp{" "}
              <span className="text-muted-foreground">
                ({filteredDisputes.length})
              </span>
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 sm:w-64">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search disputes"
                  className="ps-9"
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm đơn hàng, buyer hoặc seller"
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
                  <SelectValue placeholder="Trạng thái khiếu nại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="OPEN">Open (Đang mở)</SelectItem>
                  <SelectItem value="UNDER_REVIEW">
                    Under Review (Admin xem xét)
                  </SelectItem>
                  <SelectItem value="RESOLVED_REFUNDED">
                    Resolved (Refunded)
                  </SelectItem>
                  <SelectItem value="RESOLVED_RELEASED">
                    Resolved (Released)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã Đơn / Sản Phẩm</TableHead>
                    <TableHead>Buyer (Người mua)</TableHead>
                    <TableHead>Seller (Storefront)</TableHead>
                    <TableHead>Giá trị Escrow</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-end">Phân giải</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDisputes.map((dispute) => (
                    <TableRow key={dispute.id}>
                      <TableCell>
                        <div>
                          <p className="font-mono text-xs font-semibold text-primary">
                            #{dispute.itemSnapshot.orderId}
                          </p>
                          <p className="font-medium text-sm line-clamp-1">
                            {dispute.itemSnapshot.listingTitle}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">
                            {dispute.buyerName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {dispute.buyerEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">
                            {dispute.sellerStorefrontName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {dispute.sellerEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm font-semibold">
                        {dispute.itemSnapshot.totalAmountVnd.toLocaleString(
                          "vi-VN"
                        )}{" "}
                        đ
                      </TableCell>
                      <TableCell>
                        <DisputeStatusBadge status={dispute.status} />
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          render={
                            <Link
                              params={{ disputeId: dispute.id }}
                              to="/disputes/$disputeId"
                            />
                          }
                          size="sm"
                          variant="outline"
                        >
                          Xem & Phân giải
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredDisputes.length === 0 && (
                    <TableRow>
                      <TableCell
                        className="h-28 text-center text-muted-foreground"
                        colSpan={6}
                      >
                        Không có vụ tranh chấp nào phù hợp bộ lọc.
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
