export type ListingStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "PAUSED"
  | "HIDDEN"
  | "ARCHIVED";

export type ModerationAction = "HIDE" | "RESTORE" | "ARCHIVE";

export type ListingFilterStatus = ListingStatus | "ALL";

const MODERATION_ACTION_LABELS: Record<ModerationAction, string> = {
  ARCHIVE: "Lưu trữ Listing",
  HIDE: "Ẩn Listing",
  RESTORE: "Khôi phục Listing",
};

export const getModerationActions = (
  status: ListingStatus
): readonly ModerationAction[] => {
  switch (status) {
    case "PUBLISHED": {
      return ["HIDE", "ARCHIVE"];
    }
    case "HIDDEN": {
      return ["RESTORE", "ARCHIVE"];
    }
    case "DRAFT":
    case "PAUSED": {
      return ["ARCHIVE"];
    }
    case "ARCHIVED": {
      return [];
    }
    default: {
      return [];
    }
  }
};

export const getModerationActionLabel = (action: ModerationAction): string =>
  MODERATION_ACTION_LABELS[action];

export const getListingStatusLabel = (status: ListingStatus): string => {
  switch (status) {
    case "DRAFT": {
      return "Bản nháp";
    }
    case "PUBLISHED": {
      return "Đang công khai";
    }
    case "PAUSED": {
      return "Seller tạm dừng";
    }
    case "HIDDEN": {
      return "Đã ẩn bởi Admin";
    }
    case "ARCHIVED": {
      return "Đã lưu trữ";
    }
    default: {
      return status;
    }
  }
};
