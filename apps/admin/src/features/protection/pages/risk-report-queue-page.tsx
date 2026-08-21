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

import { useAdminRiskReports } from "../api/risk-reports-api";

const STATUS_FILTERS = [
  { label: "Tất cả trạng thái", value: "ALL" },
  { label: "Bản nháp", value: "DRAFT" },
  { label: "Đã gửi", value: "SUBMITTED" },
  { label: "Đang xem xét", value: "UNDER_REVIEW" },
  { label: "Cần bổ sung", value: "CHANGES_REQUESTED" },
  { label: "Đã công khai", value: "PUBLISHED" },
  { label: "Đã gỡ", value: "REMOVED" },
] as const;

const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  STATUS_FILTERS.map((item) => [item.value, item.label])
);
STATUS_LABELS.CORRECTED = "Đã cập nhật";
STATUS_LABELS.REJECTED = "Từ chối";

const TYPE_LABELS = {
  BANK_WALLET_PHONE: "Bank / ví / phone",
  MALICIOUS_WEBSITE: "Website",
  SOCIAL_GAME_ACCOUNT: "Social / game",
} as const;

export const RiskReportQueuePage = () => {
  const [query, setQuery] = useState("");
  const [status, setStatus] =
    useState<(typeof STATUS_FILTERS)[number]["value"]>("SUBMITTED");
  const { data: reports = [], isPending } = useAdminRiskReports({
    search: query,
    status: status === "ALL" ? undefined : status,
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
          <p className="font-medium text-primary text-sm">AVIN CHECK · RISK</p>
          <h1 className="mt-1 font-semibold text-3xl tracking-tight">
            Hàng đợi Risk Moderator
          </h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Bản gốc evidence và liên hệ reporter chỉ dành cho Moderator có
            capability RISK_MODERATOR và 2FA. Không publish nếu thiếu derivative
            đã redaction, metadata removal và watermark.
          </p>
        </div>

        <Card>
          <CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardTextIcon className="size-4 text-primary" />
              Risk reports ({isPending ? "..." : reports.length})
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 sm:w-72">
                <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Tìm risk report"
                  className="ps-9"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ID, email hoặc identifier..."
                  value={query}
                />
              </div>
              <select
                aria-label="Lọc trạng thái risk report"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) =>
                  setStatus(
                    event.target
                      .value as (typeof STATUS_FILTERS)[number]["value"]
                  )
                }
                value={status}
              >
                {STATUS_FILTERS.map((item) => (
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
                    <TableHead>Reporter</TableHead>
                    <TableHead>Định danh chính</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-end">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <p className="font-medium">
                          {report.reporterName ?? "Reporter ẩn danh"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {report.reporterEmail}
                        </p>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {report.primaryIdentifier ?? "Chưa có"}
                      </TableCell>
                      <TableCell>{TYPE_LABELS[report.type]}</TableCell>
                      <TableCell>
                        <span className="rounded-full border px-2.5 py-1 text-xs">
                          {STATUS_LABELS[report.status] ?? report.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          render={
                            <Link
                              params={{ reportId: report.id }}
                              to="/avin-check/risk-reports/$reportId"
                            />
                          }
                          size="sm"
                          variant="outline"
                        >
                          Xem & xử lý
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!isPending && reports.length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="h-28 text-center text-muted-foreground"
                        colSpan={5}
                      >
                        Không có risk report phù hợp.
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
