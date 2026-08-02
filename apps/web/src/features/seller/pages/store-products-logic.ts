export type SellerListingStatus =
  | "ARCHIVED"
  | "DRAFT"
  | "HIDDEN"
  | "PAUSED"
  | "PUBLISHED";

export type SellerListingType = "COURSE" | "SERVICE";

const LISTING_STATUS_LABELS: Record<SellerListingStatus, string> = {
  ARCHIVED: "Đã lưu trữ",
  DRAFT: "Bản nháp",
  HIDDEN: "Đang ẩn",
  PAUSED: "Tạm dừng",
  PUBLISHED: "Đang bán",
};

const LISTING_STATUS_CLASSES: Record<SellerListingStatus, string> = {
  ARCHIVED: "border-border bg-muted text-muted-foreground",
  DRAFT: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  HIDDEN: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  PAUSED: "border-orange-400/30 bg-orange-400/10 text-orange-300",
  PUBLISHED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
};

export const getSellerListingStatusLabel = (
  status: SellerListingStatus
): string => LISTING_STATUS_LABELS[status];

export const getSellerListingStatusClass = (
  status: SellerListingStatus
): string => LISTING_STATUS_CLASSES[status];

export const getSellerListingTypeLabel = (type: SellerListingType): string =>
  type === "COURSE" ? "Khóa học" : "Dịch vụ";

export const formatSellerListingPrice = (amount: number | null): string =>
  amount === null ? "Chưa đặt giá" : `${amount.toLocaleString("vi-VN")} ₫`;
