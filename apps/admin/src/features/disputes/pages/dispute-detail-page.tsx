import { Badge } from "@avin/ui/components/badge";
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
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  FileTextIcon,
  ChatCircleIcon,
  ArrowCounterClockwiseIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";

import { useAdminDispute, useDisputeEvidenceUrl } from "../api/disputes-api";
import { DisputeChatAttachment } from "../components/dispute-chat-attachment";
import { DisputeResolutionDialog } from "../components/dispute-resolution-dialog";
import { DisputeStatusBadge } from "../components/dispute-status-badge";
import type { DisputeResolutionOutcome } from "../types";
import { canResolveDispute } from "../workflow";

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

const getChatMessageStyle = (senderRole: string): string => {
  if (senderRole === "ADMIN") {
    return "bg-primary/10 border-primary/20";
  }
  if (senderRole === "BUYER") {
    return "bg-muted/50";
  }
  return "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900";
};

const getResolutionLabel = (status: string): string => {
  switch (status) {
    case "RESOLVED_REFUNDED": {
      return "Đã hoàn 100% tiền về ví Buyer";
    }
    case "RESOLVED_RELEASED": {
      return "Đã giải ngân 100% tiền về ví Seller";
    }
    default: {
      return "Buyer đã hủy Dispute; Escrow vẫn được giữ";
    }
  }
};

export const DisputeDetailPage = () => {
  const { disputeId } = useParams({
    from: "/_authenticated/disputes/$disputeId",
  });
  const { data: dispute, isError, isLoading } = useAdminDispute(disputeId);
  const evidenceUrlMutation = useDisputeEvidenceUrl();

  const [outcome, setOutcome] = useState<DisputeResolutionOutcome | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <Main className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Đang tải tranh chấp…</p>
      </Main>
    );
  }

  if (isError || !dispute) {
    return (
      <Main className="flex flex-1 flex-col items-start justify-center gap-4">
        <p className="text-sm font-medium text-primary">DISPUTE MEDIATION</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Dispute not found
        </h1>
        <Button render={<Link to="/disputes" />} variant="outline">
          <ArrowLeftIcon /> Back to queue
        </Button>
      </Main>
    );
  }

  const isPending = canResolveDispute(dispute.status);

  const handleResolve = (chosenOutcome: DisputeResolutionOutcome) => {
    setOutcome(chosenOutcome);
    setDialogOpen(true);
  };

  const handleEvidenceOpen = async (evidenceId: string, fileUrl?: string) => {
    try {
      let url = fileUrl;
      if (!url) {
        const signedEvidence = await evidenceUrlMutation.mutateAsync({
          disputeId: dispute.id,
          evidenceId,
        });
        const { url: signedUrl } = signedEvidence;
        url = signedUrl;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Không thể mở tệp bằng chứng.");
    }
  };

  return (
    <>
      <Header fixed />
      <Main className="flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Button
              aria-label="Back to disputes"
              render={<Link to="/disputes" />}
              size="icon"
              variant="outline"
            >
              <ArrowLeftIcon />
            </Button>
            <div>
              <p className="text-sm font-medium text-primary">
                DISPUTE #{dispute.id}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                Đơn #{dispute.itemSnapshot.orderId}
              </h1>
              <p className="text-muted-foreground">
                Tạo lúc {new Date(dispute.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>
          </div>
          <DisputeStatusBadge status={dispute.status} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin sản phẩm & Escrow</CardTitle>
                <CardDescription>
                  Snapshot sản phẩm và khoản tiền escrow đang bị khóa.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <DetailField
                  label="Tên sản phẩm"
                  value={dispute.itemSnapshot.listingTitle}
                />
                <DetailField
                  label="Phân loại"
                  value={dispute.itemSnapshot.categoryName}
                />
                {dispute.itemSnapshot.servicePackageName ? (
                  <DetailField
                    label="Gói dịch vụ"
                    value={`${dispute.itemSnapshot.servicePackageName}${
                      dispute.itemSnapshot.servicePackageScope
                        ? ` · ${dispute.itemSnapshot.servicePackageScope}`
                        : ""
                    }`}
                  />
                ) : null}
                {dispute.itemSnapshot.servicePackageDescription ? (
                  <DetailField
                    label="Mô tả gói"
                    value={dispute.itemSnapshot.servicePackageDescription}
                  />
                ) : null}
                <DetailField
                  label="Số lượng"
                  value={`${dispute.itemSnapshot.quantity} item`}
                />
                <DetailField
                  label="Số tiền EscrowHold"
                  value={`${dispute.itemSnapshot.totalAmountVnd.toLocaleString("vi-VN")} đ`}
                />
                <DetailField
                  label="Chính sách bảo hành"
                  value={dispute.itemSnapshot.warrantyPolicyTerms}
                />
                <DetailField
                  label="Thời hạn bảo hành"
                  value={`${dispute.itemSnapshot.warrantyDurationHours} giờ`}
                />
                <DetailField
                  label="Hạn Seller phản hồi"
                  value={new Date(dispute.responseDeadlineAt).toLocaleString(
                    "vi-VN"
                  )}
                />
                {dispute.adminDecisionDeadlineAt ? (
                  <DetailField
                    label="SLA Admin"
                    value={new Date(
                      dispute.adminDecisionDeadlineAt
                    ).toLocaleString("vi-VN")}
                  />
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lý do mở khiếu nại (Buyer)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-4 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
                  {dispute.reason}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileTextIcon className="size-5 text-primary" />
                  Chứng cứ hai bên cung cấp ({dispute.evidenceList.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {dispute.evidenceList.map((evidence) => (
                  <div
                    className="flex flex-col gap-2 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                    key={evidence.id}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            evidence.submitterRole === "BUYER"
                              ? "outline"
                              : "secondary"
                          }
                        >
                          {evidence.submitterRole}
                        </Badge>
                        <span className="font-medium text-sm">
                          {evidence.fileName}
                        </span>
                        {evidence.submittedLate ? (
                          <Badge variant="destructive">Nộp trễ</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {evidence.description}
                      </p>
                    </div>
                    <Button
                      className="gap-1 text-xs"
                      disabled={evidenceUrlMutation.isPending}
                      onClick={() =>
                        void handleEvidenceOpen(evidence.id, evidence.fileUrl)
                      }
                      size="sm"
                      variant="ghost"
                    >
                      <ArrowSquareOutIcon className="size-3.5" /> Xem chứng cứ
                    </Button>
                  </div>
                ))}
                {dispute.evidenceList.length === 0 && (
                  <p className="py-2 text-sm text-muted-foreground">
                    Chưa có tệp chứng cứ nào được tải lên.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChatCircleIcon className="size-5 text-primary" />
                  Nhật ký ChatIcon Đơn Hàng (Audited Order ChatIcon)
                </CardTitle>
                <CardDescription>
                  Lịch sử trao đổi giữa Buyer và Seller trong đơn hàng.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 max-h-80 overflow-y-auto">
                {dispute.chatMessages.map((msg) => (
                  <div
                    className={`rounded-2xl p-3 text-sm border ${getChatMessageStyle(msg.senderRole)}`}
                    key={msg.id}
                  >
                    <div className="flex items-center justify-between font-medium text-xs text-muted-foreground mb-1">
                      <span>
                        [{msg.senderRole}] <strong>{msg.senderName}</strong>
                      </span>
                      <span>
                        {new Date(msg.sentAt).toLocaleTimeString("vi-VN")}
                      </span>
                    </div>
                    {msg.content !== "[Tin nhắn không có nội dung]" ||
                    msg.attachments.length === 0 ? (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    ) : null}
                    {msg.attachments.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {msg.attachments.map((attachment) => (
                          <DisputeChatAttachment
                            attachment={attachment}
                            key={attachment.id}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Quyết định Hòa giải của Admin</CardTitle>
              <CardDescription>
                {isPending
                  ? "Admin đưa ra phán quyết xử lý 100% tài sản EscrowHold."
                  : "Vụ tranh chấp này đã có phán quyết xử lý."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {isPending ? (
                <>
                  <Button
                    onClick={() => handleResolve("RESOLVED_REFUNDED")}
                    variant="destructive"
                  >
                    <ArrowCounterClockwiseIcon /> Hoàn 100% cho Buyer (Refund)
                  </Button>
                  <Button
                    onClick={() => handleResolve("RESOLVED_RELEASED")}
                    variant="default"
                  >
                    <ShieldCheckIcon /> Giải ngân 100% cho Seller (Release)
                  </Button>
                </>
              ) : (
                <div className="rounded-2xl border p-4 bg-muted/40 grid gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Kết quả phân giải
                  </p>
                  <p className="font-semibold text-sm">
                    {getResolutionLabel(dispute.status)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ghi chú: {dispute.resolutionNote}
                  </p>
                </div>
              )}
              <Separator />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Phán quyết của Admin là cuối cùng trong P0. Hệ thống sẽ tự động
                cập nhật ledger Transaction tương ứng.
              </p>
            </CardContent>
          </Card>
        </div>
      </Main>

      <DisputeResolutionDialog
        dispute={dispute}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        outcome={outcome}
      />
    </>
  );
};
