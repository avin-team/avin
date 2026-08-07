import type { OrderItemTimelineView } from "@avin/api/commerce/fulfillment";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { cn } from "@avin/ui/lib/utils";
import {
  FileTextIcon,
  ShieldCheckIcon,
  TimerIcon,
} from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  formatOrderDate,
  formatOrderDeadline,
  getOrderItemStatusColorClassName,
  getOrderItemStatusLabel,
  getOrderItemStatusVariant,
  getWarrantyPolicyLabel,
  getWarrantyPolicyTerms,
  isNoWarrantyPolicy,
} from "@/features/commerce/order-status";
import { getErrorMessage } from "@/utils/get-error-message";
import { getSafeEvidenceHref } from "@/utils/get-safe-evidence-href";
import { orpc } from "@/utils/orpc";

const ACTOR_LABELS: Record<
  OrderItemTimelineView["events"][number]["actorType"],
  string
> = {
  ADMIN: "Quản trị viên",
  BUYER: "Người mua",
  SELLER: "Người bán",
  SYSTEM: "Hệ thống",
};

const getTimelineEventTitle = (
  event: OrderItemTimelineView["events"][number],
  viewerRole?: "buyer" | "seller"
): string => {
  if (event.artifactType === "DISPUTE_EVIDENCE") {
    return "Bổ sung bằng chứng khiếu nại";
  }
  if (event.reason === "Seller response deadline expired") {
    return "Người bán quá hạn phản hồi khiếu nại";
  }
  if (event.reason === "Admin decision deadline expired") {
    return "Quá hạn xử lý từ Quản trị viên";
  }
  if (
    event.oldStatus === "DISPUTED" &&
    event.actorType === "BUYER" &&
    event.newStatus !== "DISPUTED"
  ) {
    return "Người mua hủy khiếu nại";
  }

  switch (event.newStatus) {
    case "AWAITING_SELLER": {
      return "Khởi tạo đơn hàng";
    }
    case "IN_PROGRESS": {
      return "Bắt đầu xử lý đơn";
    }
    case "DELIVERED": {
      return "Người bán đã bàn giao";
    }
    case "IN_WARRANTY": {
      return event.actorType === "BUYER"
        ? "Xác nhận nhận hàng"
        : "Bắt đầu bảo hành";
    }
    case "CLOSED": {
      return "Hoàn thành đơn hàng";
    }
    case "CANCELLED": {
      if (event.actorType === "SELLER") {
        return "Người bán hủy đơn";
      }
      if (event.actorType === "BUYER") {
        return "Người mua hủy đơn";
      }
      return "Đã hủy đơn hàng";
    }
    case "REFUNDED": {
      return "Đã hoàn tiền";
    }
    case "DISPUTED": {
      return "Mở khiếu nại";
    }
    default: {
      return getOrderItemStatusLabel(event.newStatus, viewerRole);
    }
  }
};

const EVENT_REASON_LABELS: Record<string, string> = {
  "Admin decision deadline expired":
    "Hết thời hạn xử lý khiếu nại của Quản trị viên.",
  "Buyer cancelled before Seller fulfillment":
    "Người mua đã hủy đơn hàng trước khi người bán thực hiện.",
  "Buyer confirmed delivery": "Người mua đã xác nhận nhận hàng thành công.",
  "Buyer review window expired": "Hết hạn thời gian nghiệm thu bàn giao.",
  "Checkout created OrderItem": "Đơn hàng đã được khởi tạo thành công.",
  "Seller account is banned": "Đơn hàng bị hủy do tài khoản người bán bị khóa.",
  "Seller response deadline expired":
    "Người bán đã quá hạn gửi phản hồi khiếu nại.",
  "Seller started fulfillment": "Người bán đã bắt đầu xử lý đơn hàng.",
  "Seller submitted delivery": "Người bán đã gửi thông tin bàn giao.",
  "Seller submitted dispute evidence": "Người bán đã gửi bổ sung bằng chứng.",
  "Warranty period expired": "Thời hạn bảo hành đã kết thúc.",
};

const formatEventReason = (reason: string): string =>
  EVENT_REASON_LABELS[reason] ?? reason;

const EvidenceFile = ({
  file,
}: {
  file: NonNullable<
    OrderItemTimelineView["deliverySubmission"]
  >["files"][number];
}) => {
  const href = getSafeEvidenceHref(file.storageKey);
  return (
    <li className="flex min-w-0 items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-sm">
      <FileTextIcon aria-hidden="true" />
      {href ? (
        <a
          className="truncate text-primary underline-offset-4 hover:underline"
          href={href}
          rel="noopener noreferrer"
          target="_blank"
        >
          {file.fileName}
        </a>
      ) : (
        <span className="min-w-0 truncate">
          {file.fileName} · {file.storageKey}
        </span>
      )}
    </li>
  );
};

const DisputeEvidenceFile = ({
  disputeId,
  file,
}: {
  disputeId: string;
  file: NonNullable<OrderItemTimelineView["dispute"]>["evidence"][number];
}) => {
  const mutation = useMutation(
    orpc.commerce.disputes.getEvidenceUrl.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, "Không thể mở tệp bằng chứng."));
      },
    })
  );

  const handleOpen = async (): Promise<void> => {
    try {
      const result = await mutation.mutateAsync({
        disputeId,
        evidenceId: file.id,
      });
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch {
      // The mutation error handler already shows the failure to the participant.
    }
  };

  return (
    <li className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2 text-sm">
      <span className="min-w-0 truncate">
        {file.fileName} ·{" "}
        {file.submitterRole === "BUYER" ? "Người mua" : "Người bán"}
        {file.submittedLate ? " · Nộp trễ" : ""}
      </span>
      <Button
        disabled={mutation.isPending}
        onClick={() => void handleOpen()}
        size="sm"
        type="button"
        variant="ghost"
      >
        {mutation.isPending ? "Đang mở…" : "Mở"}
      </Button>
    </li>
  );
};

export const OrderItemTimeline = ({
  timeline,
  viewerRole,
}: {
  timeline: OrderItemTimelineView;
  viewerRole?: "buyer" | "seller";
}) => (
  <div className="flex flex-col gap-4">
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
        <p className="text-xs text-muted-foreground">Trạng thái hiện tại</p>
        <Badge
          className={cn(
            "mt-2",
            getOrderItemStatusColorClassName(timeline.current.status)
          )}
          variant={getOrderItemStatusVariant(timeline.current.status)}
        >
          {getOrderItemStatusLabel(timeline.current.status, viewerRole)}
        </Badge>
      </div>
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <TimerIcon aria-hidden="true" />
          Hạn xử lý
        </p>
        <p className="mt-2 text-sm font-medium">
          {formatOrderDeadline(timeline.current.processingDeadlineAt)}
        </p>
      </div>
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <ShieldCheckIcon aria-hidden="true" />
          Hạn kiểm tra & bảo hành
        </p>
        <p className="mt-2 text-sm font-medium">
          {timeline.current.status === "DELIVERED"
            ? formatOrderDeadline(
                timeline.current.deliveryReviewDeadlineAt,
                "Chờ bàn giao"
              )
            : formatOrderDeadline(
                timeline.current.warrantyExpiresAt,
                "Chờ kích hoạt"
              )}
        </p>
      </div>
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="text-base">Chính sách bảo hành</CardTitle>
        <CardDescription>
          {isNoWarrantyPolicy(timeline.current.warrantyPolicy)
            ? "Không có bảo hành. Người mua có 48 giờ kiểm tra sau khi nhận bàn giao."
            : `${getWarrantyPolicyLabel(timeline.current.warrantyPolicy)} kể từ khi kích hoạt bảo hành.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <p className="whitespace-pre-wrap text-muted-foreground">
          {getWarrantyPolicyTerms(timeline.current.warrantyPolicy)}
        </p>
        {timeline.current.warrantyStartedAt ? (
          <p className="text-xs text-muted-foreground">
            Bắt đầu: {formatOrderDate(timeline.current.warrantyStartedAt)}
          </p>
        ) : null}
      </CardContent>
    </Card>

    {timeline.current.servicePackage ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gói đã mua</CardTitle>
          <CardDescription>
            {timeline.current.servicePackage.name} ·{" "}
            {timeline.current.servicePackage.priceAmount.toLocaleString(
              "vi-VN"
            )}{" "}
            VND
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {timeline.current.servicePackage.description ??
            timeline.current.servicePackage.scope}
        </CardContent>
      </Card>
    ) : null}

    {timeline.deliverySubmission ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bằng chứng bàn giao</CardTitle>
          <CardDescription>
            Bàn giao lúc{" "}
            {formatOrderDate(timeline.deliverySubmission.deliveredAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="whitespace-pre-wrap text-sm">
            {timeline.deliverySubmission.deliveryNote}
          </p>
          {timeline.deliverySubmission.files.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {timeline.deliverySubmission.files.map((file) => (
                <EvidenceFile file={file} key={file.id} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Không có tệp đính kèm.
            </p>
          )}
        </CardContent>
      </Card>
    ) : null}

    {timeline.dispute ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bằng chứng khiếu nại</CardTitle>
          <CardDescription>
            Hạn người bán phản hồi:{" "}
            {formatOrderDeadline(timeline.dispute.responseDeadlineAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="whitespace-pre-wrap text-sm">
            {timeline.dispute.reason}
          </p>
          {timeline.dispute.evidence.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {timeline.dispute.evidence.map((file) => (
                <DisputeEvidenceFile
                  disputeId={timeline.dispute?.id ?? ""}
                  file={file}
                  key={file.id}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Chưa có tệp bằng chứng nào.
            </p>
          )}
        </CardContent>
      </Card>
    ) : null}

    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lịch sử tiến độ đơn hàng</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-4">
          {timeline.events.map((event, index) => (
            <li className="flex gap-3" key={event.id}>
              <div className="flex flex-col items-center">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                {index < timeline.events.length - 1 ? (
                  <div className="my-1.5 min-h-5 w-0.5 flex-1 bg-border/60" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">
                    {getTimelineEventTitle(event, viewerRole)}
                  </p>
                  <Badge
                    className={getOrderItemStatusColorClassName(
                      event.newStatus
                    )}
                    variant={getOrderItemStatusVariant(event.newStatus)}
                  >
                    {getOrderItemStatusLabel(event.newStatus, viewerRole)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    • {ACTOR_LABELS[event.actorType]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatOrderDate(event.effectiveAt)}
                </p>
                {event.reason ? (
                  <p className="mt-1.5 whitespace-pre-wrap rounded-lg border border-border/40 bg-muted/30 p-2.5 text-xs text-muted-foreground">
                    Ghi chú: {formatEventReason(event.reason)}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  </div>
);
