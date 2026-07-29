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
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";
import { useSellerApplications } from "@/features/seller-applications/api/mock-seller-applications";
import { ApplicationStatusBadge } from "@/features/seller-applications/components/application-status-badge";
import type { SellerApplicationStatus } from "@/features/seller-applications/types";
import { formatApplicationDate } from "@/features/seller-applications/utils";

type StatusFilter = "ALL" | SellerApplicationStatus;

export function SellerApplicationQueuePage() {
  const applications = useSellerApplications();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const filteredApplications = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return applications.filter((application) => {
      const matchesStatus =
        statusFilter === "ALL" || application.status === statusFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          application.applicantName,
          application.email,
          application.storefrontName,
        ].some((field) => field.toLowerCase().includes(normalizedQuery));

      return matchesStatus && matchesQuery;
    });
  }, [applications, query, statusFilter]);

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
            Hồ sơ đăng ký Seller
          </h1>
          <p className="text-muted-foreground">
            Duyệt hồ sơ gian hàng mới, kiểm tra thông tin KYC và tài khoản ngân hàng.
          </p>
        </div>

        <Card>
          <CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">
              Hàng đợi xét duyệt{" "}
              <span className="text-muted-foreground">
                ({filteredApplications.length})
              </span>
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 sm:w-64">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Tìm kiếm hồ sơ đăng ký"
                  className="ps-9"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm người đăng ký hoặc storefront"
                  value={query}
                />
              </div>
              <Select
                onValueChange={(value) =>
                  setStatusFilter((value as StatusFilter) ?? "ALL")
                }
                value={statusFilter}
              >
                <SelectTrigger
                  aria-label="Lọc theo trạng thái"
                  className="w-full sm:w-44"
                >
                  <SelectValue placeholder="Trạng thái hồ sơ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="PENDING_REVIEW">Chờ duyệt</SelectItem>
                  <SelectItem value="CHANGES_REQUESTED">
                    Yêu cầu chỉnh sửa
                  </SelectItem>
                  <SelectItem value="APPROVED">Đã phê duyệt</SelectItem>
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
                    <TableHead>Người đăng ký</TableHead>
                    <TableHead>Storefront</TableHead>
                    <TableHead>Ngày gửi</TableHead>
                    <TableHead>Phiên bản điều khoản</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-end">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {application.applicantName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {application.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{application.storefrontName}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatApplicationDate(application.submittedAt)}
                      </TableCell>
                      <TableCell>
                        {application.sellerAgreementVersion}
                      </TableCell>
                      <TableCell>
                        <ApplicationStatusBadge status={application.status} />
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          render={
                            <Link
                              params={{ applicationId: application.id }}
                              to="/seller-applications/$applicationId"
                            />
                          }
                          size="sm"
                          variant="outline"
                        >
                          Xét duyệt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredApplications.length === 0 && (
                    <TableRow>
                      <TableCell
                        className="h-28 text-center text-muted-foreground"
                        colSpan={6}
                      >
                        Không có hồ sơ nào phù hợp bộ lọc.
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
