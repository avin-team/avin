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
  CheckCircleIcon,
  DownloadSimpleIcon,
  FileTextIcon,
  HourglassIcon,
  LockKeyIcon,
  ProhibitIcon,
  ScalesIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";

import {
  useAdminSellerEnforcementAppealDetail,
  useAdminSellerEnforcementAppeals,
  useAppealEvidenceUrl,
} from "../api/seller-enforcement-api";
import type { AppealStatus, EnforcementAppeal } from "../types";
import { AppealReviewDialog } from "./appeal-review-dialog";

interface Props {
  readonly sellerId: string;
}

const getAppealBadge = (status: AppealStatus) => {
  switch (status) {
    case "SUBMITTED": {
      return (
        <Badge className="border-blue-500/30 bg-blue-500/20 text-blue-400">
          <HourglassIcon className="mr-1 size-3.5" /> Mới nộp (Chờ thẩm định)
        </Badge>
      );
    }
    case "UNDER_REVIEW": {
      return (
        <Badge className="border-amber-500/30 bg-amber-500/20 text-amber-400">
          <HourglassIcon className="mr-1 size-3.5" /> Đang thẩm định
        </Badge>
      );
    }
    case "UPHELD": {
      return (
        <Badge className="border-red-500/30 bg-red-500/20 text-red-400">
          <ProhibitIcon className="mr-1 size-3.5" /> Bác bỏ (Giữ nguyên phạt)
        </Badge>
      );
    }
    case "OVERTURNED": {
      return (
        <Badge className="border-emerald-500/30 bg-emerald-500/20 text-emerald-400">
          <CheckCircleIcon className="mr-1 size-3.5" /> Chấp thuận (Đã hủy phạt)
        </Badge>
      );
    }
    case "SUPERSEDED": {
      return <Badge variant="secondary">Hết hiệu lực (Đã thay thế)</Badge>;
    }
    default: {
      return <Badge variant="outline">{status}</Badge>;
    }
  }
};

const AppealDetailRow = ({
  appeal,
  onReview,
}: {
  appeal: EnforcementAppeal;
  onReview: () => void;
}) => {
  const { data: detail } = useAdminSellerEnforcementAppealDetail(appeal.id);
  const evidenceUrlMutation = useAppealEvidenceUrl();
  const evidence = detail?.evidence ?? [];

  const handleDownload = async (evidenceId: string, fileName: string) => {
    try {
      const res = await evidenceUrlMutation.mutateAsync({
        appealId: appeal.id,
        evidenceId,
      });
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error(`Không thể tải tệp ${fileName}`);
    }
  };

  const isActionable =
    appeal.status === "SUBMITTED" || appeal.status === "UNDER_REVIEW";

  return (
    <div className="rounded-xl border border-border/70 p-3.5 space-y-3 text-xs bg-background/50">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
        <div className="flex items-center gap-2">
          {getAppealBadge(appeal.status)}
          <span className="text-muted-foreground text-[11px]">
            Ngày gửi: {new Date(appeal.createdAt).toLocaleString("vi-VN")}
          </span>
        </div>
        {isActionable ? (
          <Button onClick={onReview} size="sm" variant="outline">
            <ScalesIcon className="size-3.5 mr-1" /> Thẩm định khiếu nại
          </Button>
        ) : null}
      </div>

      <div className="rounded-lg bg-muted/40 p-2.5">
        <p className="font-semibold text-muted-foreground">
          Giải trình từ Seller:
        </p>
        <p className="mt-1 leading-relaxed text-foreground whitespace-pre-wrap">
          {appeal.sellerReason}
        </p>
      </div>

      {evidence.length > 0 ? (
        <div className="space-y-1.5">
          <p className="font-semibold text-muted-foreground">
            Bằng chứng đính kèm ({evidence.length}):
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {evidence.map((file) => (
              <div
                className="flex items-center justify-between rounded-lg border bg-card p-2"
                key={file.id}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <FileTextIcon className="size-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{file.fileName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {(file.byteSize / 1024 / 1024).toFixed(2)} MB ·{" "}
                      {file.description || "Không có mô tả"}
                    </p>
                  </div>
                </div>
                <Button
                  disabled={evidenceUrlMutation.isPending}
                  onClick={() => handleDownload(file.id, file.fileName)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <DownloadSimpleIcon />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {appeal.outcomeReason ? (
        <div
          className={`rounded-lg border p-2.5 ${
            appeal.status === "OVERTURNED"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          <p className="font-semibold">
            Kết luận thẩm định{" "}
            {appeal.reviewedAt
              ? `(${new Date(appeal.reviewedAt).toLocaleString("vi-VN")})`
              : ""}
            :
          </p>
          <p className="mt-1 leading-relaxed whitespace-pre-wrap">
            {appeal.outcomeReason}
          </p>
        </div>
      ) : null}

      {appeal.adminNote ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-muted-foreground flex items-start gap-1.5">
          <LockKeyIcon className="size-3.5 shrink-0 text-amber-500 mt-0.5" />
          <div>
            <span className="font-medium text-amber-500">
              Ghi chú nội bộ Admin:
            </span>{" "}
            {appeal.adminNote}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const AppealsListCard = ({ sellerId }: Props) => {
  const { data: appeals = [], isPending } =
    useAdminSellerEnforcementAppeals(sellerId);
  const [reviewingAppeal, setReviewingAppeal] =
    useState<EnforcementAppeal | null>(null);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ScalesIcon className="size-5 text-primary" />
            Đơn khiếu nại quyết định (Seller Appeals) ({appeals.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Xem xét và thẩm định các đơn khiếu nại quyết định xử phạt do Seller
            gửi lên.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {appeals.map((appeal) => (
            <AppealDetailRow
              appeal={appeal as EnforcementAppeal}
              key={appeal.id}
              onReview={() => setReviewingAppeal(appeal as EnforcementAppeal)}
            />
          ))}

          {!isPending && appeals.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              Seller chưa gửi đơn khiếu nại nào.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <AppealReviewDialog
        appeal={reviewingAppeal}
        onOpenChange={(open) => {
          if (!open) {
            setReviewingAppeal(null);
          }
        }}
        open={Boolean(reviewingAppeal)}
        sellerId={sellerId}
      />
    </>
  );
};
