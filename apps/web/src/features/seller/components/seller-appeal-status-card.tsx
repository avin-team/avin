import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Skeleton } from "@avin/ui/components/skeleton";
import {
  CheckCircleIcon,
  DownloadSimpleIcon,
  FileTextIcon,
  HourglassIcon,
  ProhibitIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import {
  useSellerAppealDetail,
  useSellerAppealEvidenceUrl,
} from "../api/seller-enforcement-api";

interface SellerAppealStatusCardProps {
  appealId: string;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "SUBMITTED": {
      return (
        <Badge className="border-blue-500/30 bg-blue-500/20 text-blue-400">
          <HourglassIcon className="mr-1 size-3.5" /> Đã gửi khiếu nại (Chờ xem
          xét)
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
          <ProhibitIcon className="mr-1 size-3.5" /> Bác bỏ khiếu nại (Giữ
          nguyên quyết định)
        </Badge>
      );
    }
    case "OVERTURNED": {
      return (
        <Badge className="border-emerald-500/30 bg-emerald-500/20 text-emerald-400">
          <CheckCircleIcon className="mr-1 size-3.5" /> Chấp thuận khiếu nại (Đã
          hủy phạt)
        </Badge>
      );
    }
    case "SUPERSEDED": {
      return <Badge variant="secondary">Đã thay thế bởi quyết định mới</Badge>;
    }
    default: {
      return <Badge variant="outline">{status}</Badge>;
    }
  }
};

export const SellerAppealStatusCard = ({
  appealId,
}: SellerAppealStatusCardProps) => {
  const { data, isError, isPending } = useSellerAppealDetail(appealId);
  const evidenceUrlMutation = useSellerAppealEvidenceUrl();

  const handleDownloadEvidence = async (
    evidenceId: string,
    fileName: string
  ) => {
    try {
      const result = await evidenceUrlMutation.mutateAsync({
        appealId,
        evidenceId,
      });
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error(`Không thể tải tệp ${fileName}`);
    }
  };

  if (isPending) {
    return (
      <Card className="border-muted bg-card">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive">
        Không thể tải thông tin khiếu nại.
      </div>
    );
  }

  const { appeal, evidence } = data;

  return (
    <Card className="border-muted/80 bg-card/60 shadow-sm">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="size-5 text-primary" />
            <CardTitle className="text-base font-semibold">
              Trạng thái đơn khiếu nại (Appeal)
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Ngày gửi: {new Date(appeal.createdAt).toLocaleString("vi-VN")}
          </CardDescription>
        </div>
        <div>{getStatusBadge(appeal.status)}</div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1 text-sm">
        <div className="rounded-xl bg-muted/40 p-3.5">
          <p className="text-xs font-semibold text-muted-foreground">
            Nội dung giải trình của bạn:
          </p>
          <p className="mt-1 text-xs leading-relaxed whitespace-pre-wrap text-foreground">
            {appeal.sellerReason}
          </p>
        </div>

        {evidence.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Tài liệu / Bằng chứng đã đính kèm ({evidence.length}):
            </p>
            <div className="grid gap-2">
              {evidence.map((item) => (
                <div
                  className="flex items-center justify-between rounded-xl border border-border/80 bg-background/50 p-2.5 text-xs"
                  key={item.id}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <FileTextIcon className="size-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.fileName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {(item.byteSize / 1024 / 1024).toFixed(2)} MB ·{" "}
                        {item.description || "Không có mô tả"}
                      </p>
                    </div>
                  </div>
                  <Button
                    disabled={evidenceUrlMutation.isPending}
                    onClick={() =>
                      handleDownloadEvidence(item.id, item.fileName)
                    }
                    size="sm"
                    variant="outline"
                  >
                    <DownloadSimpleIcon className="size-3.5" /> Xem / Tải
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {appeal.outcomeReason ? (
          <div
            className={`rounded-xl border p-3.5 text-xs ${
              appeal.status === "OVERTURNED"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            <p className="font-semibold">
              Kết luận từ Ban Quản Trị{" "}
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
      </CardContent>
    </Card>
  );
};
