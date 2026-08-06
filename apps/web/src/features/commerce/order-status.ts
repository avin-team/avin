export type { OrderItemStatus } from "@avin/api/commerce/orders";

export interface OrderWarrantyPolicy {
  durationHours?: number;
  kind?: "NO_WARRANTY" | "TIMED";
  terms?: string;
}

export const getWarrantyPolicyLabel = (policy: OrderWarrantyPolicy): string => {
  if (policy.kind === "NO_WARRANTY") {
    return "Không có bảo hành";
  }
  return policy.durationHours ? `${policy.durationHours} giờ` : "Chưa xác định";
};

export const isNoWarrantyPolicy = (policy: OrderWarrantyPolicy): boolean =>
  policy.kind === "NO_WARRANTY";

export const getWarrantyPolicyTerms = (policy: OrderWarrantyPolicy): string => {
  if (isNoWarrantyPolicy(policy)) {
    return "";
  }
  return policy.terms ?? "";
};

export const ORDER_ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  AWAITING_SELLER: "Chờ Seller tiếp nhận",
  CANCELLED: "Đã hủy",
  CLOSED: "Đã hoàn tất",
  DELIVERED: "Đã bàn giao",
  DISPUTED: "Đang tranh chấp",
  IN_PROGRESS: "Đang thực hiện",
  IN_WARRANTY: "Đang bảo hành",
  REFUNDED: "Đã hoàn tiền",
};

export const getOrderItemStatusLabel = (status: OrderItemStatus): string =>
  ORDER_ITEM_STATUS_LABELS[status];

export const getOrderItemStatusVariant = (
  status: OrderItemStatus
): "default" | "destructive" | "outline" | "secondary" => {
  if (status === "DISPUTED" || status === "REFUNDED") {
    return "destructive";
  }
  if (status === "IN_WARRANTY" || status === "CLOSED") {
    return "default";
  }
  if (status === "DELIVERED" || status === "IN_PROGRESS") {
    return "secondary";
  }
  return "outline";
};

export const getOrderItemStatusColorClassName = (
  status: OrderItemStatus
): string => {
  switch (status) {
    case "AWAITING_SELLER": {
      return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
    }
    case "IN_PROGRESS": {
      return "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400";
    }
    case "DELIVERED": {
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    }
    case "IN_WARRANTY": {
      return "border-primary bg-primary text-primary-foreground";
    }
    case "CLOSED": {
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    }
    case "CANCELLED":
    case "REFUNDED": {
      return "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400";
    }
    case "DISPUTED": {
      return "border-destructive/30 bg-destructive/10 text-destructive dark:text-destructive-foreground";
    }
    default: {
      return "";
    }
  }
};

const orderDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export const ORDER_TIMELINE_REFRESH_INTERVAL_MS = 30_000;

export const formatOrderDate = (value: string): string =>
  orderDateFormatter.format(new Date(value));

export const formatOrderDeadline = (value: string | null): string =>
  value ? formatOrderDate(value) : "Chưa xác định";

const isAtOrBefore = (value: string | null, now: Date): boolean => {
  if (!value) {
    return false;
  }

  return now.getTime() <= new Date(value).getTime();
};

const isAtOrAfter = (value: string | null, now: Date): boolean => {
  if (!value) {
    return false;
  }

  return now.getTime() >= new Date(value).getTime();
};

export const canBuyerConfirmDelivery = (
  status: OrderItemStatus,
  deliveryReviewDeadlineAt: string | null,
  now = new Date()
): boolean =>
  status === "DELIVERED" && isAtOrBefore(deliveryReviewDeadlineAt, now);

export const canBuyerCancel = (status: OrderItemStatus): boolean =>
  status === "AWAITING_SELLER";

export const canBuyerOpenDispute = ({
  deliveryReviewDeadlineAt,
  now = new Date(),
  processingDeadlineAt,
  status,
  warrantyExpiresAt,
}: {
  deliveryReviewDeadlineAt: string | null;
  now?: Date;
  processingDeadlineAt: string | null;
  status: OrderItemStatus;
  warrantyExpiresAt: string | null;
}): boolean => {
  if (status === "AWAITING_SELLER" || status === "IN_PROGRESS") {
    return isAtOrAfter(processingDeadlineAt, now);
  }

  if (status === "DELIVERED") {
    return isAtOrBefore(deliveryReviewDeadlineAt, now);
  }

  return (
    status === "IN_WARRANTY" &&
    (!warrantyExpiresAt ||
      now.getTime() < new Date(warrantyExpiresAt).getTime())
  );
};
