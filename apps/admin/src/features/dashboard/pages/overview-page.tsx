import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import {
  WarningCircleIcon,
  ClipboardTextIcon,
  BankIcon,
  StorefrontIcon,
  TrendUpIcon,
  CurrencyCircleDollarIcon,
  CalendarBlankIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { useAdminDisputes } from "@/features/disputes/api/disputes-api";
import { useOperationsOverviewAnalytics } from "@/features/operations/api/operations-api";
import { useAdminSellerApplications } from "@/features/seller-applications/api/seller-applications-api";
import { ApplicationStatusBadge } from "@/features/seller-applications/components/application-status-badge";
import { formatApplicationDate } from "@/features/seller-applications/utils";
import { useAdminSellerList } from "@/features/sellers/api/seller-enforcement-api";
import { useAdminWithdrawals } from "@/features/withdrawals/api/withdrawals-api";

const formatCurrencyVND = (value: number): string =>
  `${value.toLocaleString("vi-VN")} ₫`;

const EscrowRevenueChart = lazy(async () => {
  const module = await import("./escrow-revenue-chart");
  return { default: module.EscrowRevenueChart };
});

export const OverviewPage = () => {
  const [timeframe, setTimeframe] = useState<"7d" | "30d">("7d");
  const { data: applications = [] } = useAdminSellerApplications();
  const { data: sellers = [] } = useAdminSellerList();
  const { data: disputes = [] } = useAdminDisputes("OPEN");
  const { data: withdrawals = [] } = useAdminWithdrawals();
  const { data: analytics } = useOperationsOverviewAnalytics(timeframe);

  const pendingAppsCount = applications.filter(
    (a) => a.status === "PENDING_REVIEW"
  ).length;
  const openDisputesCount = disputes.length;
  const pendingWithdrawalsCount = withdrawals.filter(
    (w) => w.status === "REQUESTED"
  ).length;

  const recentApplications = applications
    .toSorted((left, right) =>
      right.submittedAt.localeCompare(left.submittedAt)
    )
    .slice(0, 3);

  const trendData = analytics?.trend ?? [];

  const totalEscrowHold = analytics?.totalEscrowHold ?? 0;
  const totalRevenue = analytics?.totalRevenue ?? 0;
  const totalPendingPayout = analytics?.totalPendingPayout ?? 0;

  return (
    <>
      <Header fixed />
      <Main className="flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">
              VẬN HÀNH SÀN AVIN
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Bảng điều khiển Tổng quan
            </h1>
            <p className="text-muted-foreground">
              Bảng điều khiển trung tâm quản trị marketplace, rủi ro gian hàng
              và dòng tiền escrow.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link className="block transition hover:opacity-95" to="/sellers">
            <Card
              className="h-full transition hover:border-primary/50"
              size="sm"
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Tổng số Seller</CardTitle>
                <StorefrontIcon className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{sellers.length}</p>
                <CardDescription>Gian hàng trên hệ thống</CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link
            className="block transition hover:opacity-95"
            to="/seller-applications"
          >
            <Card
              className="h-full transition hover:border-primary/50"
              size="sm"
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">
                  Hồ sơ Seller chờ duyệt
                </CardTitle>
                <ClipboardTextIcon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{pendingAppsCount}</p>
                <CardDescription>Cần Admin kiểm tra KYC & Bank</CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link className="block transition hover:opacity-95" to="/disputes">
            <Card
              className="h-full transition hover:border-primary/50"
              size="sm"
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Tranh chấp đang mở</CardTitle>
                <WarningCircleIcon className="size-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{openDisputesCount}</p>
                <CardDescription>Chờ Admin phân giải Escrow</CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link className="block transition hover:opacity-95" to="/withdrawals">
            <Card
              className="h-full transition hover:border-primary/50"
              size="sm"
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">
                  Yêu cầu rút tiền chờ duyệt
                </CardTitle>
                <BankIcon className="size-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">
                  {pendingWithdrawalsCount}
                </p>
                <CardDescription>Yêu cầu payout về ngân hàng</CardDescription>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendUpIcon className="size-5 text-primary" />
                Thống kê Dòng tiền Escrow & Doanh thu sàn
              </CardTitle>
              <CardDescription>
                Theo dõi biến động dòng tiền mua bán tạm giữ (Escrow Hold) và
                hoa hồng thực thu.
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border bg-muted/40 p-1">
              <Button
                className="gap-1.5 text-xs"
                onClick={() => setTimeframe("7d")}
                size="xs"
                variant={timeframe === "7d" ? "default" : "ghost"}
              >
                <CalendarBlankIcon className="size-3.5" />7 ngày
              </Button>
              <Button
                className="gap-1.5 text-xs"
                onClick={() => setTimeframe("30d")}
                size="xs"
                variant={timeframe === "30d" ? "default" : "ghost"}
              >
                <CalendarBlankIcon className="size-3.5" />
                30 ngày
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6 grid gap-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Link
                className="rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-xs cursor-pointer block"
                to="/operations"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CurrencyCircleDollarIcon className="size-4 text-blue-500" />
                  <span>Tổng Escrow đang giữ</span>
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                  {formatCurrencyVND(totalEscrowHold)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tạm giữ giao dịch đang xử lý / khiếu nại
                </p>
              </Link>

              <Link
                className="rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-xs cursor-pointer block"
                to="/operations"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendUpIcon className="size-4 text-emerald-500" />
                  <span>Phí sàn đã thu</span>
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {formatCurrencyVND(totalRevenue)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Chiết khấu phán quyết & hoàn tất giao dịch
                </p>
              </Link>

              <Link
                className="rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-xs cursor-pointer block"
                to="/withdrawals"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BankIcon className="size-4 text-amber-500" />
                  <span>Tiền rút chờ duyệt</span>
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                  {formatCurrencyVND(totalPendingPayout)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cần Admin rà soát Payout về tài khoản seller
                </p>
              </Link>
            </div>

            <div className="h-70 w-full pt-2">
              <Suspense
                fallback={
                  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                    Đang tải biểu đồ...
                  </div>
                }
              >
                <EscrowRevenueChart data={trendData} />
              </Suspense>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardTextIcon className="size-5 text-primary" />
                Hồ sơ Seller mới nhất
              </CardTitle>
              <CardDescription>
                Các đơn đăng ký gian hàng vừa vào hàng đợi review.
              </CardDescription>
            </div>
            <Link
              className="text-xs text-primary font-medium hover:underline"
              to="/seller-applications"
            >
              Xem tất cả $\rightarrow$
            </Link>
          </CardHeader>
          <CardContent className="grid gap-3">
            {recentApplications.map((application) => (
              <Link
                className="flex flex-col gap-2 rounded-2xl border p-4 transition hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between"
                key={application.id}
                params={{ applicationId: application.id }}
                to="/seller-applications/$applicationId"
              >
                <div>
                  <p className="font-medium">{application.storefrontName}</p>
                  <p className="text-sm text-muted-foreground">
                    {application.applicantName} ·{" "}
                    {formatApplicationDate(application.submittedAt)}
                  </p>
                </div>
                <ApplicationStatusBadge status={application.status} />
              </Link>
            ))}
          </CardContent>
        </Card>
      </Main>
    </>
  );
};
