import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Input } from "@avin/ui/components/input";
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

import { useAdminProviderProfileRevisions } from "../api/provider-profile-revisions-api";
import type { ProviderProfileRevisionStatusFilter } from "../api/provider-profile-revisions-api";

const STATUS_FILTER_ITEMS: {
  label: string;
  value: ProviderProfileRevisionStatusFilter;
}[] = [
  { label: "Tất cả trạng thái", value: "ALL" },
  { label: "Bản nháp", value: "DRAFT" },
  { label: "Chờ duyệt", value: "PENDING_REVIEW" },
  { label: "Cần chỉnh sửa", value: "CHANGES_REQUESTED" },
  { label: "Đã duyệt", value: "APPROVED" },
  { label: "Từ chối", value: "REJECTED" },
];

const STATUS_LABELS: Record<ProviderProfileRevisionStatusFilter, string> = {
  ALL: "Tất cả",
  APPROVED: "Đã duyệt",
  CHANGES_REQUESTED: "Cần chỉnh sửa",
  DRAFT: "Bản nháp",
  PENDING_REVIEW: "Chờ duyệt",
  REJECTED: "Từ chối",
};

export const ProviderProfileRevisionQueuePage = () => {
  const [query, setQuery] = useState("");
  const [status, setStatus] =
    useState<ProviderProfileRevisionStatusFilter>("PENDING_REVIEW");
  const { data: revisions = [], isPending } = useAdminProviderProfileRevisions({
    search: query,
    status,
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
          <p className="font-medium text-primary text-sm">
            AVIN CHECK · PROVIDER PROFILE
          </p>
          <h1 className="mt-1 font-semibold text-3xl tracking-tight">
            Hàng đợi cập nhật profile
          </h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Reviewer xác minh lại dữ liệu nhạy cảm và phát hành version mới.
            Version public hiện tại vẫn có hiệu lực trong lúc chờ duyệt.
          </p>
        </div>

        <Card>
          <CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardTextIcon className="size-4 text-primary" />
              Yêu cầu cập nhật ({isPending ? "..." : revisions.length})
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 sm:w-64">
                <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Tìm yêu cầu cập nhật profile"
                  className="ps-9"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm tên, email, dịch vụ..."
                  value={query}
                />
              </div>
              <select
                aria-label="Lọc trạng thái cập nhật profile"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) =>
                  setStatus(
                    event.target.value as ProviderProfileRevisionStatusFilter
                  )
                }
                value={status}
              >
                {STATUS_FILTER_ITEMS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Version yêu cầu</TableHead>
                    <TableHead>Dịch vụ</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-end">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revisions.map((revision) => (
                    <TableRow key={revision.id}>
                      <TableCell>
                        <p className="font-medium">{revision.applicantName}</p>
                        <p className="text-muted-foreground text-xs">
                          {revision.applicantEmail}
                        </p>
                      </TableCell>
                      <TableCell>{revision.revisionNumber}</TableCell>
                      <TableCell className="max-w-xs text-sm">
                        <span className="line-clamp-2">
                          {revision.services ?? "Chưa nhập"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="rounded-full border px-2.5 py-1 text-xs">
                          {STATUS_LABELS[revision.status]}
                        </span>
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          render={
                            <Link
                              params={{ revisionId: revision.id }}
                              to="/avin-check/provider-revisions/$revisionId"
                            />
                          }
                          size="sm"
                          variant="outline"
                        >
                          {revision.status === "PENDING_REVIEW"
                            ? "Xem & xét duyệt"
                            : "Xem chi tiết"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!isPending && revisions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="h-28 text-center text-muted-foreground"
                        colSpan={5}
                      >
                        Không tìm thấy yêu cầu phù hợp.
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
