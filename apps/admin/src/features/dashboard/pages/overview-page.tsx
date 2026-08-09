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
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";
import { categoriesQueryOptions } from "@/features/categories/api/categories-api";
import type { ParentCategory } from "@/features/categories/types";
import { countTotalSubCategories } from "@/features/categories/workflow";
import { useAdminDisputes } from "@/features/disputes/api/disputes-api";
import { useSellerApplications } from "@/features/seller-applications/api/mock-seller-applications";
import { ApplicationStatusBadge } from "@/features/seller-applications/components/application-status-badge";
import { formatApplicationDate } from "@/features/seller-applications/utils";
import { useSellers } from "@/features/sellers/api/mock-sellers";
import { useAdminWithdrawals } from "@/features/withdrawals/api/withdrawals-api";

export const OverviewPage = () => {
  const applications = useSellerApplications();
  const { data: categories = [] } = useQuery(categoriesQueryOptions());
  const sellers = useSellers();
  const { data: disputes = [] } = useAdminDisputes("OPEN");
  const { data: withdrawals = [] } = useAdminWithdrawals();

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
      description: "Duyệt hồ sơ gian hàng mới (KYC & BankIcon)",
      icon: ClipboardTextIcon,
      title: "Duyệt hồ sơ Seller",
      url: "/seller-applications",
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
              <CardTitle className="text-sm">Hồ sơ Seller chờ duyệt</CardTitle>
              <ClipboardTextIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{pendingAppsCount}</p>
              <CardDescription>
                Cần Admin kiểm tra KYC & BankIcon
              </CardDescription>
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

          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">
                Seller bị Tạm dừng / Cấm
              </CardTitle>
              <ShieldWarningIcon className="size-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{enforcementAlertsCount}</p>
              <CardDescription>Cảnh báo vi phạm chính sách</CardDescription>
            </CardContent>
          </Card>
        </div>

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
