import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  ArrowClockwiseIcon,
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  ShieldWarningIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TablePagination } from "@/components/table-pagination";

import {
  useApplyExternalRiskImport,
  useExternalImportRuns,
  useExternalRiskReports,
  useHideExternalRiskReport,
  usePreviewExternalRiskImport,
  useRestoreExternalRiskReport,
} from "../api/external-risk-import-api";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const numberFormatter = new Intl.NumberFormat("vi-VN");

const formatDate = (value: string | null): string =>
  value ? dateFormatter.format(new Date(value)) : "Chưa có";

const formatCount = (value: number): string => numberFormatter.format(value);

const formatStatus = (value: string): string => {
  const labels: Record<string, string> = {
    COMPLETED: "Hoàn tất",
    FAILED: "Thất bại",
    PUBLISHED: "Public · verified",
    REMOVED: "Đã gỡ",
    RUNNING: "Đang chạy",
    UNDER_REVIEW: "Chưa public",
  };
  return labels[value] ?? value;
};

const getErrorMessage = (error: unknown): string | null => {
  if (!error) {
    return null;
  }
  return error instanceof Error ? error.message : "Thao tác không thành công.";
};

const getFirstErrorMessage = (errors: readonly unknown[]): string | null => {
  for (const error of errors) {
    const message = getErrorMessage(error);
    if (message) {
      return message;
    }
  }
  return null;
};

const hasPendingMutation = (statuses: readonly boolean[]): boolean =>
  statuses.some(Boolean);

export const ExternalRiskImportPage = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data: runs = [], isPending: isRunsPending } = useExternalImportRuns();
  const { data: reportsData, isPending: isReportsPending } =
    useExternalRiskReports({
      includeHidden: true,
      page,
      pageSize,
      search,
    });
  const reports = reportsData?.items ?? [];
  const total = reportsData?.total ?? 0;
  const totalPages = reportsData?.totalPages ?? 1;
  const previewMutation = usePreviewExternalRiskImport();
  const applyMutation = useApplyExternalRiskImport();
  const hideMutation = useHideExternalRiskReport();
  const restoreMutation = useRestoreExternalRiskReport();

  const isBusy = hasPendingMutation([
    previewMutation.isPending,
    applyMutation.isPending,
    hideMutation.isPending,
    restoreMutation.isPending,
  ]);
  const mutationError = getFirstErrorMessage([
    previewMutation.error,
    applyMutation.error,
    hideMutation.error,
    restoreMutation.error,
  ]);
  const [latestRun] = runs;

  return (
    <>
      <Header fixed />
      <Main className="flex flex-1 flex-col gap-6">
        <div>
          <p className="font-medium text-primary text-sm">
            AVIN CHECK · EXTERNAL IMPORT
          </p>
          <h1 className="mt-1 font-semibold text-3xl tracking-tight">
            Đồng bộ cảnh báo từ ChongScam
          </h1>
          <p className="mt-2 max-w-4xl text-muted-foreground">
            Preview và Apply đều do Admin bấm thủ công. Chỉ bản ghi nguồn có
            trạng thái verified mới được đưa vào public projection; bản ghi
            external luôn gắn nhãn chưa được Avin xác minh độc lập.
          </p>
        </div>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldWarningIcon className="size-5 text-primary" />
              ChongScam ·{" "}
              {isRunsPending
                ? "..."
                : formatStatus(latestRun?.status ?? "Chưa chạy")}
            </CardTitle>
            <CardDescription>
              Evidence sẽ được tải về private storage để xử lý nội bộ. Không gỡ
              watermark của nguồn và không tự động tạo public derivative.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {latestRun ? (
              <div className="grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
                <div>
                  <p className="text-muted-foreground">Chạy lúc</p>
                  <p className="font-medium">
                    {formatDate(latestRun.startedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fetched</p>
                  <p className="font-medium">
                    {formatCount(latestRun.fetchedCount)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tạo mới</p>
                  <p className="font-medium">
                    {formatCount(latestRun.createdCount)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ghi đè</p>
                  <p className="font-medium">
                    {formatCount(latestRun.updatedCount)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Evidence tải</p>
                  <p className="font-medium">
                    {formatCount(latestRun.evidenceDownloadedCount)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Lỗi</p>
                  <p className="font-medium">
                    {formatCount(latestRun.failedCount)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Chưa có phiên import nào.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={isBusy}
                onClick={() => previewMutation.mutate({ mode: "PREVIEW" })}
                variant="outline"
              >
                <EyeIcon />
                {previewMutation.isPending ? "Đang preview..." : "Preview"}
              </Button>
              <Button
                disabled={isBusy}
                onClick={() => applyMutation.mutate({ mode: "APPLY" })}
              >
                <ArrowClockwiseIcon />
                {applyMutation.isPending ? "Đang đồng bộ..." : "Apply đồng bộ"}
              </Button>
              <Button
                disabled={isBusy}
                onClick={() => applyMutation.mutate({ mode: "FULL_RECONCILE" })}
                variant="destructive"
              >
                <ArrowClockwiseIcon />
                Reconcile toàn bộ
              </Button>
            </div>
            {mutationError ? (
              <p className="text-destructive text-sm" role="alert">
                {mutationError}
              </p>
            ) : null}
            {latestRun?.error ? (
              <p className="text-destructive text-sm" role="alert">
                Phiên gần nhất: {latestRun.error}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">
              Bản ghi external ({isReportsPending ? "..." : total})
            </CardTitle>
            <div className="relative min-w-0 sm:w-80">
              <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Tìm bản ghi ChongScam"
                className="ps-9"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="ID, tiêu đề, suspect hoặc identifier..."
                value={search}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nguồn</TableHead>
                    <TableHead>Định danh chính</TableHead>
                    <TableHead>Trạng thái nguồn</TableHead>
                    <TableHead>Public projection</TableHead>
                    <TableHead className="text-end">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="min-w-64">
                        <p className="font-medium">
                          {report.sourceTitle ?? "Không có tiêu đề"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {report.suspectName ?? "Không có suspect name"}
                        </p>
                        {report.sourceUrl ? (
                          <a
                            className="text-primary text-xs underline underline-offset-4"
                            href={report.sourceUrl}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            Mở bản ghi gốc
                          </a>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {report.primaryIdentifier ?? "Chưa có"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {formatStatus(report.sourceStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            report.adminHidden ? "destructive" : "secondary"
                          }
                        >
                          {report.adminHidden
                            ? "Admin đã ẩn"
                            : formatStatus(report.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-2">
                          <Button
                            render={
                              <Link
                                params={{ reportId: report.id }}
                                to="/avin-check/risk-reports/$reportId"
                              />
                            }
                            size="sm"
                            variant="ghost"
                          >
                            Chi tiết
                          </Button>
                          <Button
                            disabled={isBusy}
                            onClick={() =>
                              report.adminHidden
                                ? restoreMutation.mutate({ id: report.id })
                                : hideMutation.mutate({ id: report.id })
                            }
                            size="sm"
                            variant="outline"
                          >
                            {report.adminHidden ? (
                              <EyeIcon />
                            ) : (
                              <EyeSlashIcon />
                            )}
                            {report.adminHidden ? "Khôi phục" : "Ẩn public"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!isReportsPending && reports.length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="h-28 text-center text-muted-foreground"
                        colSpan={5}
                      >
                        Không có bản ghi external phù hợp.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              label="bản ghi"
              onPageChange={setPage}
              onPageSizeChange={(newPageSize) => {
                setPageSize(newPageSize);
                setPage(1);
              }}
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
            />
          </CardContent>
        </Card>
      </Main>
    </>
  );
};
