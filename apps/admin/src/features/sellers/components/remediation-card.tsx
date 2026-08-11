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
  ArrowClockwiseIcon,
  CheckCircleIcon,
  HourglassIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import {
  useAdminRemediationItems,
  useRetryRemediation,
} from "../api/seller-enforcement-api";
import type {
  EnforcementRemediation,
  EnforcementRemediationStatus,
} from "../types";

interface Props {
  readonly remediation: EnforcementRemediation | null;
  readonly sellerId: string;
}

const getItemStatusVariant = (
  status: string
): "default" | "destructive" | "secondary" => {
  if (status === "COMPLETED") {
    return "default";
  }
  if (status === "FAILED") {
    return "destructive";
  }
  return "secondary";
};

const getRemediationStatusBadge = (status: EnforcementRemediationStatus) => {
  switch (status) {
    case "COMPLETED": {
      return (
        <Badge className="border-emerald-500/30 bg-emerald-500/20 text-emerald-400">
          <CheckCircleIcon className="mr-1 size-3.5" /> Hoàn tất hủy & hoàn tiền
        </Badge>
      );
    }
    case "NEEDS_ATTENTION": {
      return (
        <Badge className="border-red-500/30 bg-red-500/20 text-red-400">
          <WarningCircleIcon className="mr-1 size-3.5" /> Cần can thiệp (Lỗi xử
          lý)
        </Badge>
      );
    }
    case "RUNNING": {
      return (
        <Badge className="border-amber-500/30 bg-amber-500/20 text-amber-400">
          <HourglassIcon className="mr-1 size-3.5" /> Đang chạy xử lý
        </Badge>
      );
    }
    case "PENDING": {
      return (
        <Badge className="border-blue-500/30 bg-blue-500/20 text-blue-400">
          <HourglassIcon className="mr-1 size-3.5" /> Chờ thực hiện
        </Badge>
      );
    }
    default: {
      return <Badge variant="outline">{status}</Badge>;
    }
  }
};

export const RemediationCard = ({ remediation, sellerId }: Props) => {
  const { data: items = [], isPending: itemsLoading } =
    useAdminRemediationItems(remediation?.id);
  const retryMutation = useRetryRemediation(sellerId);

  if (!remediation) {
    return null;
  }

  const handleRetry = async () => {
    try {
      await retryMutation.mutateAsync({
        remediationId: remediation.id,
      });
      toast.success("Đã kích hoạt thử lại quy trình Remediation.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể thử lại Remediation"
      );
    }
  };

  return (
    <Card className="border-destructive/30 bg-card/60 shadow-sm">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <WarningCircleIcon className="size-5 text-destructive" />
            Tiến trình bồi hoàn & xử lý đơn hàng (Remediation)
          </CardTitle>
          <CardDescription className="text-xs">
            Tự động xử lý hủy và hoàn tiền toàn bộ các OrderItem chưa bàn giao
            khi Seller bị Ban.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {getRemediationStatusBadge(remediation.status)}
          {remediation.status === "NEEDS_ATTENTION" ? (
            <Button
              disabled={retryMutation.isPending}
              onClick={() => void handleRetry()}
              size="sm"
              variant="outline"
            >
              <ArrowClockwiseIcon
                className={retryMutation.isPending ? "animate-spin" : ""}
              />
              Thử lại
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1 text-xs">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl bg-muted/40 p-3">
          <div>
            <span className="text-muted-foreground">Tổng số đơn hàng:</span>
            <p className="font-semibold text-foreground text-sm">
              {remediation.totalItems} OrderItems
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Khởi tạo lúc:</span>
            <p className="font-semibold text-foreground">
              {new Date(remediation.createdAt).toLocaleString("vi-VN")}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Hoàn tất lúc:</span>
            <p className="font-semibold text-foreground">
              {remediation.finishedAt
                ? new Date(remediation.finishedAt).toLocaleString("vi-VN")
                : "Chưa hoàn tất"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Trạng thái:</span>
            <p className="font-semibold text-foreground">
              {remediation.status}
            </p>
          </div>
        </div>

        {remediation.lastError ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-destructive">
            <p className="font-semibold">Lỗi xảy ra trong quá trình xử lý:</p>
            <p className="mt-1">{remediation.lastError}</p>
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="space-y-2">
            <p className="font-semibold text-muted-foreground">
              Danh sách OrderItem thuộc diện xử lý ({items.length}):
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl border p-2">
              {items.map((item) => (
                <div
                  className="flex items-center justify-between rounded-lg bg-background/50 p-2 text-xs"
                  key={item.id}
                >
                  <div>
                    <span className="font-mono font-medium">
                      OrderItem ID: {item.orderItemId}
                    </span>
                    {item.lastError ? (
                      <p className="text-destructive text-[11px] mt-0.5">
                        Lỗi: {item.lastError} (Lần thử lại: {item.attempts})
                      </p>
                    ) : null}
                  </div>
                  <Badge variant={getItemStatusVariant(item.status)}>
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">
            {itemsLoading
              ? "Đang tải danh sách OrderItem..."
              : "Không có OrderItem nào tồn đọng cần bồi hoàn."}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
