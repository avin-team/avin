import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Separator } from "@avin/ui/components/separator";
import {
  WarningIcon,
  ArrowLeftIcon,
  ProhibitIcon,
  CheckCircleIcon,
  ShieldIcon,
  WalletIcon,
} from "@phosphor-icons/react";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";

import { getSeller, useSellers } from "../api/mock-sellers";
import { EnforcementDialog } from "../components/enforcement-dialog";
import { SellerEnforcementBadge } from "../components/seller-enforcement-badge";
import type { SellerEnforcementStatus } from "../types";

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
  const sellers = useSellers();
  const seller = sellers.find((s) => s.id === sellerId) ?? getSeller(sellerId);

  const [targetStatus, setTargetStatus] =
    useState<SellerEnforcementStatus | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!seller) {
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
                    {seller.wallet.pendingEscrowBalanceVnd.toLocaleString(
                      "vi-VN"
                    )}{" "}
                    đ
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Đang khóa trong đơn chờ hết hạn bảo hành
                  </p>
                </div>
                <div className="rounded-2xl border p-4 bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground">
                    Số dư khả dụng (Available)
                  </p>
                  <p className="mt-1 font-mono text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                    {seller.wallet.availableBalanceVnd.toLocaleString("vi-VN")}{" "}
                    đ
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Có thể gửi yêu cầu rút tiền về ngân hàng
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldIcon className="size-5 text-primary" />
                  Nhật ký xử lý vi phạm (Enforcement Audit)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {seller.enforcementHistory.map((record) => (
                  <div
                    className="rounded-xl border p-3 text-sm"
                    key={record.id}
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span>
                        {record.previousStatus} $\rightarrow${" "}
                        <strong>{record.newStatus}</strong>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(record.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      Lý do: {record.reason} (Thực hiện bởi: {record.adminName})
                    </p>
                  </div>
                ))}
                {seller.enforcementHistory.length === 0 && (
                  <p className="py-2 text-sm text-muted-foreground">
                    Chưa có lịch sử xử lý vi phạm nào đối với Seller này.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Quyết định xử lý Admin</CardTitle>
              <CardDescription>
                Thay đổi trạng thái hoạt động của Seller.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {seller.enforcementStatus !== "ACTIVE" && (
                <Button onClick={() => handleAction("ACTIVE")}>
                  <CheckCircleIcon /> Khôi phục Hoạt Động (Active)
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

              <Separator />
              <div className="text-xs leading-relaxed text-muted-foreground">
                <p>
                  <strong>Quy định xử phạt:</strong>
                </p>
                <ul className="mt-1 list-disc ps-4 space-y-1">
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
    </>
  );
};
