import { Badge } from "@avin/ui/components/badge";

import type { SellerApplicationStatus } from "../types";

const STATUS_LABELS: Record<SellerApplicationStatus, string> = {
  APPROVED: "Đã phê duyệt",
  CHANGES_REQUESTED: "Yêu cầu chỉnh sửa",
  PENDING_REVIEW: "Chờ duyệt",
  REJECTED: "Từ chối",
};

const STATUS_VARIANTS: Record<
  SellerApplicationStatus,
  "default" | "destructive" | "outline" | "secondary"
> = {
  APPROVED: "default",
  CHANGES_REQUESTED: "secondary",
  PENDING_REVIEW: "outline",
  REJECTED: "destructive",
};

export function ApplicationStatusBadge({
  status,
}: {
  readonly status: SellerApplicationStatus;
}) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
  );
}

export function getApplicationStatusLabel(status: SellerApplicationStatus) {
  return STATUS_LABELS[status];
}
