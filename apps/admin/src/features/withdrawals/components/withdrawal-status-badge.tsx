import { Badge } from "@avin/ui/components/badge";

import type { WithdrawalStatus } from "../types";

const STATUS_LABELS: Record<WithdrawalStatus, string> = {
  APPROVED: "Đã duyệt",
  CANCELLED: "Đã hủy",
  PAID: "Đã chuyển khoản",
  REJECTED: "Đã từ chối",
  REQUESTED: "Chờ duyệt",
};

export const WithdrawalStatusBadge = ({
  status,
}: {
  status: WithdrawalStatus;
}) => {
  let variant: "default" | "destructive" | "secondary" = "secondary";
  if (status === "REJECTED") {
    variant = "destructive";
  } else if (status === "PAID") {
    variant = "default";
  }
  return <Badge variant={variant}>{STATUS_LABELS[status]}</Badge>;
};
