import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Separator } from "@avin/ui/components/separator";
import { Skeleton } from "@avin/ui/components/skeleton";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  NotePencilIcon,
  ProhibitIcon,
  WalletIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";

import {
  useAdminSellerEnforcement,
  useAdminSellerList,
} from "../api/seller-enforcement-api";
import { AppealsListCard } from "../components/appeals-list-card";
import { EnforcementDialog } from "../components/enforcement-dialog";
import { ReasonCorrectionDialog } from "../components/reason-correction-dialog";
import { RemediationCard } from "../components/remediation-card";
import { SellerEnforcementBadge } from "../components/seller-enforcement-badge";
import { SellerEnforcementHistoryCard } from "../components/seller-enforcement-history-card";
import type {
  EnforcementRemediation,
  SellerEnforcementReasonCode,
  SellerEnforcementStatus,
} from "../types";

const DetailField = ({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) => (
  <div className="grid gap-1.5">
    <p className="text-sm font-medium">{label}</p>
    <p className="text-sm text-muted-foreground">{value}</p>
  </div>
);

export const SellerDetailPage = () => {
  const { sellerId } = useParams({ from: "/_authenticated/sellers/$sellerId" });

  const { data: sellerList = [], isPending: isListPending } =
    useAdminSellerList();
  const { data: enforcementData } = useAdminSellerEnforcement(sellerId);

  const [targetStatus, setTargetStatus] =
    useState<SellerEnforcementStatus | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reasonCorrectionOpen, setReasonCorrectionOpen] = useState(false);

  const sellerBase = sellerList.find((s) => s.id === sellerId);

  if (isListPending) {
    return (
      <>
        <Header fixed>
          <div className="ml-auto">
            <ThemeSwitch />
          </div>
        </Header>
        <Main className="flex flex-1 flex-col gap-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="grid gap-6">
              <Skeleton className="h-48" />
              <Skeleton className="h-40" />
            </div>
            <Skeleton className="h-64" />
          </div>
        </Main>
      </>
    );
  }

  if (!sellerBase) {
    return (
      <Main className="flex flex-1 flex-col items-start justify-center gap-4">
        <p className="text-sm font-medium text-primary">SELLER GOVERNANCE</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Seller not found
        </h1>
        <Button render={<Link to="/sellers" />} variant="outline">
          <ArrowLeftIcon /> Back to sellers
        </Button>
      </Main>
    );
  }

  const effectiveStatus: SellerEnforcementStatus =
    enforcementData?.state === "CLEAR"
      ? "ACTIVE"
      : ((enforcementData?.state as SellerEnforcementStatus | undefined) ??
        sellerBase.enforcementStatus);

  const seller = {
    ...sellerBase,
    enforcementStatus: effectiveStatus,
  };

  const handleAction = (status: SellerEnforcementStatus) => {
    setTargetStatus(status);
    setDialogOpen(true);
  };

  return (
    <>
      <Header fixed>
        <div className="ml-auto">
          <ThemeSwitch />
        </div>
      </Header>
      <Main className="flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Button
              aria-label="Back to sellers"
              render={<Link to="/sellers" />}
              size="icon"
              variant="outline"
            >
              <ArrowLeftIcon />
            </Button>
            <div>
              <p className="text-sm font-medium text-primary">
                STOREFRONT GOVERNANCE
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                {seller.storefrontName}
              </h1>
              <p className="text-muted-foreground">
                Chủ gian hàng: {seller.applicantName} ({seller.email})
              </p>
            </div>
          </div>
          <SellerEnforcementBadge status={seller.enforcementStatus} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tổng quan tài khoản Seller</CardTitle>
                <CardDescription>
                  Thông tin kinh doanh và hiệu suất gian hàng.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <DetailField
                  label="Chủ tài khoản"
                  value={seller.applicantName}
                />
                <DetailField label="Email đăng ký" value={seller.email} />
                <DetailField label="Số điện thoại" value={seller.phone} />
                <DetailField
                  label="Ngày gia nhập"
                  value={new Date(seller.joinedAt).toLocaleDateString("vi-VN")}
                />
                <DetailField
                  label="Đánh giá trung bình"
                  value={`${seller.averageRating} ★ (${seller.ratingCount} lượt)`}
                />
                <DetailField
                  label="Đơn hàng đã hoàn thành"
                  value={`${seller.completedOrdersCount} đơn`}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <WalletIcon className="size-5 text-primary" />
                <div>
                  <CardTitle>Ví tiền Seller (SellerWallet)</CardTitle>
                  <CardDescription>
                    Số dư tạm giữ và khả dụng thực tế.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Số dư tạm giữ (Pending Escrow)
                  </p>
                  <p className="mt-1 font-mono text-xl font-semibold">
                    {seller.heldBalanceVnd.toLocaleString("vi-VN")} đ
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Đang khóa trong đơn chờ hết hạn bảo hành
                  </p>
                </div>
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Số dư khả dụng (Available)
                  </p>
                  <p className="mt-1 font-mono text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                    {seller.availableBalanceVnd.toLocaleString("vi-VN")} đ
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Có thể gửi yêu cầu rút tiền về ngân hàng
                  </p>
                </div>
              </CardContent>
            </Card>

            <RemediationCard
              remediation={
                (enforcementData?.remediation as unknown as EnforcementRemediation) ??
                null
              }
              sellerId={seller.id}
            />

            <AppealsListCard sellerId={seller.id} />

            <SellerEnforcementHistoryCard
              fallbackHistory={[]}
              sellerId={seller.id}
            />
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Quyết định xử lý Admin</CardTitle>
              <CardDescription>
                Thay đổi trạng thái hoạt động của Seller hoặc hiệu chỉnh lý do.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {seller.enforcementStatus !== "ACTIVE" && (
                <Button onClick={() => handleAction("ACTIVE")}>
                  <CheckCircleIcon /> Khôi phục Hoạt Động (Lift Enforcement)
                </Button>
              )}
              {seller.enforcementStatus !== "SUSPENDED" && (
                <Button
                  onClick={() => handleAction("SUSPENDED")}
                  variant="outline"
                >
                  <WarningIcon /> Tạm dừng gian hàng (Suspend)
                </Button>
              )}
              {seller.enforcementStatus !== "BANNED" && (
                <Button
                  onClick={() => handleAction("BANNED")}
                  variant="destructive"
                >
                  <ProhibitIcon /> Cấm vĩnh viễn (Ban)
                </Button>
              )}

              {seller.enforcementStatus !== "ACTIVE" && (
                <Button
                  onClick={() => setReasonCorrectionOpen(true)}
                  variant="secondary"
                >
                  <NotePencilIcon /> Hiệu chỉnh lý do vi phạm
                </Button>
              )}

              <Separator />
              <div className="text-xs leading-relaxed text-muted-foreground">
                <p>
                  <strong>Quy định xử phạt:</strong>
                </p>
                <ul className="mt-1 list-disc space-y-1 ps-4">
                  <li>
                    <strong>Suspend:</strong> Ẩn toàn bộ Listings, chặn tạo đơn
                    hàng và rút tiền mới. Seller vẫn truy cập đơn đang chạy để
                    hỗ trợ chat.
                  </li>
                  <li>
                    <strong>Ban:</strong> Khóa tài khoản Seller hoàn toàn, tự
                    động hủy và refund các đơn hàng chưa giao, đóng băng số dư
                    payout.
                  </li>
                  <li>
                    <strong>Reason Correction:</strong> Sửa lại lý do hoặc mã vi
                    phạm gửi tới Seller mà không làm gián đoạn trạng thái xử
                    phạt.
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </Main>

      <EnforcementDialog
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        seller={seller}
        targetStatus={targetStatus}
      />

      <ReasonCorrectionDialog
        currentReason={enforcementData?.action?.sellerReason}
        currentReasonCode={
          (enforcementData?.action
            ?.reasonCode as unknown as SellerEnforcementReasonCode) ??
          "POLICY_VIOLATION"
        }
        onOpenChange={setReasonCorrectionOpen}
        open={reasonCorrectionOpen}
        sellerId={seller.id}
      />
    </>
  );
};
