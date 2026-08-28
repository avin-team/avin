import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import {
  ArrowLeftIcon,
  EyeIcon,
  EyeClosedIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ApplicationStatusBadge } from "@/features/seller-applications/components/application-status-badge";
import { ReviewDecisionDialog } from "@/features/seller-applications/components/review-decision-dialog";
import type { SellerApplicationDecision } from "@/features/seller-applications/types";
import { formatApplicationDate } from "@/features/seller-applications/utils";
import { maskBankAccount } from "@/features/seller-applications/workflow";

import {
  useAdminDecideSellerApplication,
  useAdminSellerApplication,
} from "../api/seller-applications-api";

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

export const SellerApplicationDetailPage = () => {
  const { applicationId } = useParams({
    from: "/_authenticated/seller-applications/$applicationId",
  });
  const { data: application, isPending } =
    useAdminSellerApplication(applicationId);

  const [showBankAccount, setShowBankAccount] = useState(false);
  const [decision, setDecision] = useState<SellerApplicationDecision | null>(
    null
  );
  const decideMutation = useAdminDecideSellerApplication();

  if (isPending) {
    return (
      <Main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Đang tải hồ sơ...</p>
      </Main>
    );
  }

  if (!application) {
    return (
      <Main className="flex flex-1 flex-col items-start justify-center gap-4">
        <p className="text-sm font-medium text-primary">HỒ SƠ SELLER</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Không tìm thấy hồ sơ
        </h1>
        <Button render={<Link to="/seller-applications" />} variant="outline">
          <ArrowLeftIcon />
          Quay lại hàng đợi
        </Button>
      </Main>
    );
  }

  const canDecide = application.status === "PENDING_REVIEW";

  const handleDecision = (nextDecision: SellerApplicationDecision) => {
    setDecision(nextDecision);
  };

  const confirmDecision = (reason?: string) => {
    if (!decision) {
      return;
    }

    decideMutation.mutate(
      { decision, id: application.id, reason },
      {
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "Không thể cập nhật hồ sơ"
          );
        },
        onSuccess: () => {
          toast.success("Cập nhật hồ sơ đăng ký thành công", {
            description: "Hàng đợi xét duyệt đã được cập nhật.",
          });
          setDecision(null);
        },
      }
    );
  };

  const renderActionButtons = () => {
    if (canDecide) {
      return (
        <>
          <Button
            disabled={decideMutation.isPending}
            onClick={() => handleDecision("APPROVED")}
          >
            <ShieldCheckIcon />
            Phê duyệt hồ sơ
          </Button>
          <Button
            disabled={decideMutation.isPending}
            onClick={() => handleDecision("CHANGES_REQUESTED")}
            variant="outline"
          >
            Yêu cầu chỉnh sửa
          </Button>
          <Button
            disabled={decideMutation.isPending}
            onClick={() => handleDecision("REJECTED")}
            variant="destructive"
          >
            Từ chối hồ sơ
          </Button>
        </>
      );
    }
    return (
      <p className="text-sm text-muted-foreground">
        Không có thêm thao tác cho trạng thái này.
      </p>
    );
  };

  return (
    <>
      <Header fixed />
      <Main className="flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Button
              aria-label="Quay lại danh sách hồ sơ"
              render={<Link to="/seller-applications" />}
              size="icon"
              variant="outline"
            >
              <ArrowLeftIcon />
            </Button>
            <div>
              <p className="text-sm font-medium text-primary">
                HỒ SƠ ĐĂNG KÝ SELLER
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                {application.storefrontName}
              </h1>
              <p className="text-muted-foreground">
                Đã gửi lúc {formatApplicationDate(application.submittedAt)}
              </p>
            </div>
          </div>
          <ApplicationStatusBadge status={application.status} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin người đăng ký</CardTitle>
                <CardDescription>
                  Thông tin do đối tác cung cấp khi đăng ký làm Seller.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <DetailField
                  label="Họ và tên"
                  value={application.applicantName}
                />
                <DetailField label="Email liên hệ" value={application.email} />
                <DetailField label="Số điện thoại" value={application.phone} />
                <DetailField
                  label="Tên storefront"
                  value={application.storefrontName}
                />
                <DetailField
                  label="Phiên bản điều khoản"
                  value={application.sellerAgreementVersion}
                />
                <DetailField
                  label="Số lần chỉnh sửa"
                  value={String(application.revisionCount)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tài khoản ngân hàng</CardTitle>
                <CardDescription>
                  Thông tin tài khoản nhận thanh toán payout (mặc định che số
                  tài khoản).
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <DetailField
                  label="Tên ngân hàng"
                  value={application.bankAccount.bankName}
                />
                <DetailField
                  label="Tên chủ tài khoản"
                  value={application.bankAccount.accountName}
                />
                <div className="grid gap-1.5">
                  <p className="text-sm font-medium">Số tài khoản</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm">
                      {showBankAccount
                        ? application.bankAccount.accountNumber
                        : maskBankAccount(
                            application.bankAccount.accountNumber
                          )}
                    </p>
                    <Button
                      aria-label={
                        showBankAccount
                          ? "Ẩn số tài khoản"
                          : "Hiện số tài khoản"
                      }
                      onClick={() => setShowBankAccount((visible) => !visible)}
                      size="icon-xs"
                      variant="ghost"
                    >
                      {showBankAccount ? <EyeClosedIcon /> : <EyeIcon />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {application.reviewReason && (
              <Card>
                <CardHeader>
                  <CardTitle>Lý do phản hồi gần nhất</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="rounded-2xl bg-muted p-4 text-sm leading-6">
                    {application.reviewReason}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Quyết định xét duyệt</CardTitle>
              <CardDescription>
                {canDecide
                  ? "Chọn quyết định cho hồ sơ đang chờ duyệt."
                  : "Hồ sơ này ở trạng thái chỉ đọc cho tới khi Seller gửi lại."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {renderActionButtons()}
            </CardContent>
          </Card>
        </div>
      </Main>
      <ReviewDecisionDialog
        decision={decision}
        isPending={decideMutation.isPending}
        onConfirm={confirmDecision}
        onOpenChange={(open) => {
          if (!open) {
            setDecision(null);
          }
        }}
      />
    </>
  );
};
