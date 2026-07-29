import type {
  EnforcementRecord,
  Seller,
  SellerEnforcementStatus,
} from "./types";

export const enforceSeller = (
  seller: Seller,
  newStatus: SellerEnforcementStatus,
  reason: string,
  adminName = "Avin Admin"
): Seller => {
  const trimmedReason = reason.trim();
  if (trimmedReason.length === 0) {
    throw new Error("Mẫu lý do xử lý vi phạm không được để trống");
  }

  if (seller.enforcementStatus === newStatus) {
    throw new Error(`Seller đã ở trạng thái ${newStatus}`);
  }

  const record: EnforcementRecord = {
    adminName,
    createdAt: new Date().toISOString(),
    id: `enf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    newStatus,
    previousStatus: seller.enforcementStatus,
    reason: trimmedReason,
  };

  return {
    ...seller,
    enforcementHistory: [record, ...seller.enforcementHistory],
    enforcementStatus: newStatus,
  };
};

export const canRequestWithdrawal = (
  status: SellerEnforcementStatus
): boolean => status === "ACTIVE";

export const areListingsVisible = (status: SellerEnforcementStatus): boolean =>
  status === "ACTIVE";
