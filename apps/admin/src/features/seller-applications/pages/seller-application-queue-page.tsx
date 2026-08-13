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
import { ClipboardTextIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";

import { useAdminSellerApplications } from "../api/seller-applications-api";
import { ApplicationStatusBadge } from "../components/application-status-badge";
import type { SellerApplicationStatus } from "../types";
import { formatApplicationDate } from "../utils";

type StatusFilter = "ALL" | SellerApplicationStatus;

const STATUS_FILTER_ITEMS: { label: string; value: StatusFilter }[] = [
  { label: "Tất cả trạng thái", value: "ALL" },
  { label: "Chờ duyệt", value: "PENDING_REVIEW" },
  { label: "Đã phê duyệt", value: "APPROVED" },
  { label: "Yêu cầu chỉnh sửa", value: "CHANGES_REQUESTED" },
  { label: "Từ chối", value: "REJECTED" },
];

export const SellerApplicationQueuePage = () => {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const { data: applications = [], isPending } = useAdminSellerApplications({
    search: query,
    status: statusFilter,
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
          <p className="text-sm font-medium text-primary">SELLER ONBOARDING</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Hàng đợi xét duyệt Seller
          </h1>
          <p className="text-muted-foreground">
            Duyệt hồ sơ gian hàng mới, xác minh tài khoản ngân hàng nhận payout
            và quyết định cho phép kinh doanh.
          </p>
        </div>

        <Card>
          <CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardTextIcon className="size-4 text-primary" />
              Danh sách Hồ sơ Đăng ký{" "}
              <span className="text-muted-foreground">
                ({isPending ? "..." : applications.length})
              </span>
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 sm:w-64">
                <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search applications"
                  className="ps-9"
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm tên, email, storefront..."
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
                  <SelectValue placeholder="Trạng thái hồ sơ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="PENDING_REVIEW">Chờ duyệt</SelectItem>
                  <SelectItem value="APPROVED">Đã phê duyệt</SelectItem>
                  <SelectItem value="CHANGES_REQUESTED">
                    Yêu cầu chỉnh sửa
                  </SelectItem>
                  <SelectItem value="REJECTED">Từ chối</SelectItem>
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
                    <TableHead>Người đăng ký</TableHead>
                    <TableHead>Ngân hàng nhận payout</TableHead>
                    <TableHead>Thời gian gửi</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-end">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-base">
                            {app.storefrontName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Phiên bản ĐK: {app.sellerAgreementVersion}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">
                            {app.applicantName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {app.email} · {app.phone}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p className="font-semibold">
                            {app.bankAccount.bankName}
                          </p>
                          <p className="font-mono text-muted-foreground">
                            {app.bankAccount.accountName}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatApplicationDate(app.submittedAt)}
                      </TableCell>
                      <TableCell>
                        <ApplicationStatusBadge status={app.status} />
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          render={
                            <Link
                              params={{ applicationId: app.id }}
                              to="/seller-applications/$applicationId"
                            />
                          }
                          size="sm"
                          variant="outline"
                        >
                          {app.status === "PENDING_REVIEW"
                            ? "Xem & Xét duyệt"
                            : "Xem chi tiết"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!isPending && applications.length === 0 && (
                    <TableRow>
                      <TableCell
                        className="h-28 text-center text-muted-foreground"
                        colSpan={6}
                      >
                        Không tìm thấy hồ sơ nào phù hợp bộ lọc.
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
