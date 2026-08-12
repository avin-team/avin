import { Badge } from "@avin/ui/components/badge";
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
  ArrowRightIcon,
  ClipboardTextIcon,
  FolderIcon,
  BankIcon,
  ShieldWarningIcon,
  StorefrontIcon,
  GavelIcon,
  TrendUpIcon,
  CurrencyCircleDollarIcon,
  CalendarBlankIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";
import { categoriesQueryOptions } from "@/features/categories/api/categories-api";
import type { ParentCategory } from "@/features/categories/types";
import { countTotalSubCategories } from "@/features/categories/workflow";
import { useAdminDisputes } from "@/features/disputes/api/disputes-api";
import { useAdminListings } from "@/features/listings/api/listings-api";
import { useOperationsOverviewAnalytics } from "@/features/operations/api/operations-api";
import { useAdminSellerApplications } from "@/features/seller-applications/api/seller-applications-api";
import { ApplicationStatusBadge } from "@/features/seller-applications/components/application-status-badge";
import { formatApplicationDate } from "@/features/seller-applications/utils";
import { useAdminSellerList } from "@/features/sellers/api/seller-enforcement-api";
import { useAdminWithdrawals } from "@/features/withdrawals/api/withdrawals-api";

const MOCK_7D_TREND = [
  { date: "06/08", escrowHold: 18_500_000, revenue: 1_450_000 },
  { date: "07/08", escrowHold: 22_000_000, revenue: 1_800_000 },
  { date: "08/08", escrowHold: 27_500_000, revenue: 2_100_000 },
  { date: "09/08", escrowHold: 24_000_000, revenue: 1_950_000 },
  { date: "10/08", escrowHold: 31_000_000, revenue: 2_600_000 },
  { date: "11/08", escrowHold: 29_500_000, revenue: 2_400_000 },
  { date: "12/08", escrowHold: 35_800_000, revenue: 2_950_000 },
];

const MOCK_30D_TREND = [
  { date: "14/07", escrowHold: 12_000_000, revenue: 950_000 },
  { date: "17/07", escrowHold: 15_500_000, revenue: 1_200_000 },
  { date: "20/07", escrowHold: 19_000_000, revenue: 1_500_000 },
  { date: "23/07", escrowHold: 16_800_000, revenue: 1_350_000 },
  { date: "26/07", escrowHold: 23_500_000, revenue: 1_900_000 },
  { date: "29/07", escrowHold: 26_000_000, revenue: 2_150_000 },
  { date: "01/08", escrowHold: 22_500_000, revenue: 1_800_000 },
  { date: "04/08", escrowHold: 28_000_000, revenue: 2_300_000 },
  { date: "07/08", escrowHold: 30_500_000, revenue: 2_500_000 },
  { date: "10/08", escrowHold: 33_000_000, revenue: 2_750_000 },
  { date: "12/08", escrowHold: 35_800_000, revenue: 2_950_000 },
];

const formatCurrencyVND = (value: number): string =>
  `${value.toLocaleString("vi-VN")} ₫`;

const EscrowRevenueChart = lazy(async () => {
  const module = await import("./escrow-revenue-chart");
  return { default: module.EscrowRevenueChart };
});

export const OverviewPage = () => {
  const [timeframe, setTimeframe] = useState<"7d" | "30d">("7d");
  const { data: applications = [] } = useAdminSellerApplications();
  const { data: categories = [] } = useQuery(categoriesQueryOptions());
  const { data: sellerListData } = useAdminSellerList();
  const sellers = sellerListData?.items ?? [];
  const { data: disputes = [] } = useAdminDisputes("OPEN");
  const { data: withdrawals = [] } = useAdminWithdrawals();
  const { data: listings = [] } = useAdminListings();
  const { data: analytics } = useOperationsOverviewAnalytics(timeframe);

  const pendingAppsCount = applications.filter(
    (a) => a.status === "PENDING_REVIEW"
  ).length;
  const openDisputesCount = disputes.length;
  const pendingWithdrawalsCount = withdrawals.filter(
    (w) => w.status === "REQUESTED"
  ).length;
  const enforcementAlertsCount = sellers.filter(
    (s) => s.enforcementStatus !== "ACTIVE"
  ).length;

  const totalSubCategories = countTotalSubCategories(
    categories as unknown as ParentCategory[]
  );

  const quickActionCards = [
    {
      badge: pendingAppsCount > 0 ? "Bắt buộc" : undefined,
      count: `${pendingAppsCount} chờ duyệt`,
      description: "Duyệt hồ sơ gian hàng mới (KYC & Bank)",
      icon: ClipboardTextIcon,
      title: "Duyệt hồ sơ Seller",
      url: "/seller-applications",
    },
    {
      count: `${listings.length} Sản phẩm`,
      description: "Kiểm duyệt & quản lý trạng thái hiển thị sản phẩm",
      icon: GavelIcon,
      title: "Duyệt sản phẩm",
      url: "/listings",
    },
    {
      count: `${categories.length} Cha · ${totalSubCategories} Sub`,
      description: "Phân loại 2 cấp & tỷ lệ chiết khấu sàn",
      icon: FolderIcon,
      title: "Danh mục & Chính sách",
      url: "/categories",
    },
    {
      badge: enforcementAlertsCount > 0 ? "Cảnh báo" : undefined,
      count: `${sellers.length} Sellers · ${enforcementAlertsCount} Vi phạm`,
      description: "Quản lý gian hàng & xử lý vi phạm",
      icon: StorefrontIcon,
      title: "Quản lý Seller & Vi phạm",
      url: "/sellers",
    },
    {
      badge: openDisputesCount > 0 ? "Ưu tiên" : undefined,
      count: `${openDisputesCount} Đang mở`,
      description: "Hòa giải tranh chấp & phán quyết Escrow",
      icon: WarningCircleIcon,
      title: "Hòa giải Tranh chấp",
      url: "/disputes",
    },
    {
      badge: pendingWithdrawalsCount > 0 ? "Cần xử lý" : undefined,
      count: `${pendingWithdrawalsCount} Yêu cầu`,
      description: "Duyệt yêu cầu rút tiền về ngân hàng",
      icon: BankIcon,
      title: "Yêu cầu Rút tiền",
      url: "/withdrawals",
    },
  ];

  const recentApplications = applications
    .toSorted((left, right) =>
      right.submittedAt.localeCompare(left.submittedAt)
    )
    .slice(0, 3);

  const trendData =
    analytics?.trend ?? (timeframe === "7d" ? MOCK_7D_TREND : MOCK_30D_TREND);

  const totalEscrowHold = analytics?.totalEscrowHold ?? 0;
  const totalRevenue = analytics?.totalRevenue ?? 0;
  const totalPendingPayout = analytics?.totalPendingPayout ?? 0;

  return (
    <>
      <Header fixed>
        <div className="ml-auto">
          <ThemeSwitch />
        </div>
      </Header>
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
          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Tổng số Seller</CardTitle>
              <StorefrontIcon className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{sellers.length}</p>
              <CardDescription>Gian hàng trên hệ thống</CardDescription>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Hồ sơ Seller chờ duyệt</CardTitle>
              <ClipboardTextIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{pendingAppsCount}</p>
              <CardDescription>Cần Admin kiểm tra KYC & Bank</CardDescription>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Tranh chấp đang mở</CardTitle>
              <WarningCircleIcon className="size-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{openDisputesCount}</p>
              <CardDescription>Chờ Admin phân giải Escrow</CardDescription>
            </CardContent>
          </Card>

          <Card size="sm">
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
                size="xs"
                variant={timeframe === "7d" ? "default" : "ghost"}
                onClick={() => setTimeframe("7d")}
                className="gap-1.5 text-xs"
              >
                <CalendarBlankIcon className="size-3.5" />7 ngày
              </Button>
              <Button
                size="xs"
                variant={timeframe === "30d" ? "default" : "ghost"}
                onClick={() => setTimeframe("30d")}
                className="gap-1.5 text-xs"
              >
                <CalendarBlankIcon className="size-3.5" />
                30 ngày
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6 grid gap-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border bg-card p-4 transition-all hover:shadow-xs">
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
              </div>

              <div className="rounded-xl border bg-card p-4 transition-all hover:shadow-xs">
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
              </div>

              <div className="rounded-xl border bg-card p-4 transition-all hover:shadow-xs">
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
              </div>
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

        <div>
          <h2 className="text-xl font-semibold tracking-tight mb-3">
            Các phân hệ quản trị chính
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickActionCards.map(
              ({ title, description, count, url, icon: Icon, badge }) => (
                <Card
                  className="flex flex-col justify-between transition hover:border-primary/50"
                  key={url}
                >
                  <CardHeader className="gap-2">
                    <div className="flex items-center justify-between">
                      <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Icon className="size-5" />
                      </div>
                      {badge && <Badge variant="destructive">{badge}</Badge>}
                    </div>
                    <CardTitle className="text-base mt-2">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 flex items-center justify-between border-t border-border/40 mt-4 py-3">
                    <span className="text-xs font-medium text-muted-foreground">
                      {count}
                    </span>
                    <Button
                      render={<Link to={url} />}
                      size="xs"
                      variant="ghost"
                    >
                      Truy cập <ArrowRightIcon className="size-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </div>

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
