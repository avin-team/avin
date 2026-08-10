import type { OrderItemStatus } from "@avin/db/schema/commerce";

export interface CanReviewInput {
  buyerId: string;
  closedAt: Date | null;
  hasExistingReview: boolean;
  now?: Date;
  orderItemStatus: OrderItemStatus;
  requesterUserId: string;
}

export interface CanReviewResult {
  eligible: boolean;
  reason?: string;
}

export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const maskBuyerName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Người dùng";
  }

  const words = trimmed.split(/\s+/u);
  if (words.length === 1) {
    const w = words[0] ?? "";
    return `${w.charAt(0)}***`;
  }

  const firstName = words[0] ?? "";
  const lastName = words.at(-1) ?? "";
  const lastInitial = lastName.charAt(0).toUpperCase();

  return `${firstName} ${lastInitial}.`;
};

export const canReviewOrderItem = ({
  buyerId,
  closedAt,
  hasExistingReview,
  now = new Date(),
  orderItemStatus,
  requesterUserId,
}: CanReviewInput): CanReviewResult => {
  if (orderItemStatus !== "CLOSED") {
    return {
      eligible: false,
      reason: "Đơn hàng chưa ở trạng thái hoàn thành (CLOSED).",
    };
  }

  if (requesterUserId !== buyerId) {
    return {
      eligible: false,
      reason: "Chỉ người mua (Buyer) mới có quyền đánh giá đơn hàng này.",
    };
  }

  if (hasExistingReview) {
    return {
      eligible: false,
      reason: "Đơn hàng này đã được đánh giá.",
    };
  }

  if (closedAt) {
    const elapsed = now.getTime() - closedAt.getTime();
    if (elapsed > THIRTY_DAYS_MS) {
      return {
        eligible: false,
        reason: "Hạn gửi đánh giá (30 days) kể từ khi hoàn tất đã hết.",
      };
    }
  }

  return { eligible: true };
};

export interface RatingCountRow {
  count: number;
  rating: number;
}

export interface StarDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export const calculateStarDistribution = (
  rows: RatingCountRow[]
): StarDistribution => {
  const dist: StarDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of rows) {
    if (r.rating >= 1 && r.rating <= 5) {
      dist[r.rating as keyof StarDistribution] = r.count;
    }
  }
  return dist;
};
