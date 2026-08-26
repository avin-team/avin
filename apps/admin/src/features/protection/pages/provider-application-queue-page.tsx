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

import { useAdminProviderApplications } from "../api/provider-applications-api";
import type { ProviderApplicationStatusFilter } from "../api/provider-applications-api";

const STATUS_FILTER_ITEMS: {
  label: string;
  value: ProviderApplicationStatusFilter;
}[] = [
  { label: "Tất cả trạng thái", value: "ALL" },
  { label: "Bản nháp", value: "DRAFT" },
  { label: "Chờ duyệt", value: "PENDING_REVIEW" },
  { label: "Cần chỉnh sửa", value: "CHANGES_REQUESTED" },
  { label: "Đã duyệt", value: "APPROVED" },
  { label: "Từ chối", value: "REJECTED" },
];

const STATUS_LABELS: Record<ProviderApplicationStatusFilter, string> = {
  ALL: "Tất cả",
  APPROVED: "Đã duyệt",
  CHANGES_REQUESTED: "Cần chỉnh sửa",
  DRAFT: "Bản nháp",
  PENDING_REVIEW: "Chờ duyệt",
  REJECTED: "Từ chối",
};

export const ProviderApplicationQueuePage = () => {
  const [query, setQuery] = useState("");
  const [status, setStatus] =
    useState<ProviderApplicationStatusFilter>("PENDING_REVIEW");
  const { data: applications = [], isPending } = useAdminProviderApplications({
    search: query,
    status,
  });

  return (
    <>
      <Header fixed />
      <Main className="flex flex-1 flex-col gap-6">
        <div>
          <p className="font-medium text-primary text-sm">
            AVIN CHECK · PROVIDER
          </p>
          <h1 className="mt-1 font-semibold text-3xl tracking-tight">
            Hàng đợi xét duyệt Provider
          </h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Chỉ Reviewer có capability Provider và 2FA mới được xem hàng đợi,
            yêu cầu chỉnh sửa, từ chối hoặc phát hành profile tối thiểu.
          </p>
        </div>

        <Card>
          <CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardTextIcon className="size-4 text-primary" />
              Hồ sơ Provider ({isPending ? "..." : applications.length})
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 sm:w-64">
                <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Tìm hồ sơ Provider"
                  className="ps-9"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm tên, email, dịch vụ..."
                  value={query}
                />
              </div>
              <Select
                items={STATUS_FILTER_ITEMS}
                onValueChange={(value) =>
                  setStatus(value as ProviderApplicationStatusFilter)
                }
                value={status}
              >
                <SelectTrigger
                  aria-label="Lọc trạng thái Provider"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-52"
                >
                  <SelectValue />
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
                    <TableHead>Ứng viên</TableHead>
                    <TableHead>Dịch vụ</TableHead>
                    <TableHead>Lần chỉnh sửa</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-end">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <p className="font-medium">
                          {application.applicantName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {application.applicantEmail}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-xs text-sm">
                        <span className="line-clamp-2">
                          {application.services ?? "Chưa nhập"}
                        </span>
                      </TableCell>
                      <TableCell>{application.revisionCount}</TableCell>
                      <TableCell>
                        <span className="rounded-full border px-2.5 py-1 text-xs">
                          {STATUS_LABELS[application.status]}
                        </span>
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          render={
                            <Link
                              params={{ applicationId: application.id }}
                              to="/avin-check/providers/$applicationId"
                            />
                          }
                          size="sm"
                          variant="outline"
                        >
                          {application.status === "PENDING_REVIEW"
                            ? "Xem & xét duyệt"
                            : "Xem chi tiết"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!isPending && applications.length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="h-28 text-center text-muted-foreground"
                        colSpan={5}
                      >
                        Không tìm thấy hồ sơ phù hợp.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
};
