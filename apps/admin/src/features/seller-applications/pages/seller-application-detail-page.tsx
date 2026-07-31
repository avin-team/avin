import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Separator } from "@avin/ui/components/separator";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";
import type { getSellerApplication } from "@/features/seller-applications/api/mock-seller-applications";
import {
  decideSellerApplication,
  resubmitSellerApplicationForReview,
  useSellerApplications,
} from "@/features/seller-applications/api/mock-seller-applications";
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

const getSellerApplicationFromSnapshot = (
  applications: readonly ReturnType<typeof getSellerApplication>[],
  applicationId: string
) => applications.find((application) => application?.id === applicationId);

export const SellerApplicationDetailPage = () => {
  const { applicationId } = useParams({
    from: "/_authenticated/seller-applications/$applicationId",
  });
  const { data: remoteApplication } = useAdminSellerApplication(applicationId);
  const mockApplications = useSellerApplications();
  const mockApplication = getSellerApplicationFromSnapshot(
    mockApplications,
    applicationId
  );
  const application = remoteApplication ?? mockApplication;

  const [showBankAccount, setShowBankAccount] = useState(false);
  const [decision, setDecision] = useState<SellerApplicationDecision | null>(
    null
  );
  const decideMutation = useAdminDecideSellerApplication();

  if (!application) {
    return (
      <Main className="flex flex-1 flex-col items-start justify-center gap-4">
        <p className="text-sm font-medium text-primary">HỒ SƠ SELLER</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Không tìm thấy hồ sơ
        </h1>
        <Button render={<Link to="/seller-applications" />} variant="outline">
          <ArrowLeft />
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
        onSuccess: () => {
          toast.success("Cập nhật hồ sơ đăng ký thành công", {
            description: "Hàng đợi xét duyệt đã được cập nhật.",
          });
          setDecision(null);
        },
        onError: (error) => {
          try {
            decideSellerApplication(application.id, decision, reason);
            toast.success("Cập nhật hồ sơ đăng ký thành công", {
              description: "Hàng đợi xét duyệt đã được cập nhật.",
            });
            setDecision(null);
          } catch {
            toast.error(
              error instanceof Error
                ? error.message
                : "Không thể cập nhật hồ sơ"
            );
          }
        },
      }
    );
  };

  const handleResubmit = () => {
    try {
      resubmitSellerApplicationForReview(application.id);
      toast.success("Đã trả hồ sơ về hàng đợi xét duyệt", {
        description: "Hồ sơ đang chờ phán quyết mới từ Admin.",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể trả lại hồ sơ"
      );
    }
  };

  const renderActionButtons = () => {
    if (canDecide) {
      return (
        <>
          <Button onClick={() => handleDecision("APPROVED")}>
            <ShieldCheck />
            Phê duyệt hồ sơ
          </Button>
          <Button
            onClick={() => handleDecision("CHANGES_REQUESTED")}
            variant="outline"
          >
            Yêu cầu chỉnh sửa
          </Button>
          <Button
            onClick={() => handleDecision("REJECTED")}
            variant="destructive"
          >
            Từ chối hồ sơ
          </Button>
        </>
      );
    }
    if (application.status === "CHANGES_REQUESTED") {
      return (
        <Button onClick={handleResubmit} variant="outline">
          Trả về hàng đợi chờ duyệt
        </Button>
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
      <Header fixed>
        <div className="ml-auto">
          <ThemeSwitch />
        </div>
      </Header>
      <Main className="flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Button
              aria-label="Quay lại danh sách hồ sơ"
              render={<Link to="/seller-applications" />}
              size="icon"
              variant="outline"
            >
              <ArrowLeft />
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
                      {showBankAccount ? <EyeOff /> : <Eye />}
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
                  ? "Chọn phán quyết cho hồ sơ đang chờ duyệt."
                  : "Hồ sơ này ở trạng thái chỉ đọc cho tới khi Seller gửi lại."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {renderActionButtons()}
              <Separator />
              <p className="text-xs leading-5 text-muted-foreground">
                Bản prototype này sử dụng dữ liệu mẫu cục bộ. Xác thực Admin và
                Nhật ký audit được tạm thời hoãn theo ADR 0003.
              </p>
            </CardContent>
          </Card>
        </div>
      </Main>
      <ReviewDecisionDialog
        decision={decision}
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
