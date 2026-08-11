import type {
  AppealStatus,
  EnforcementRecord,
  Seller,
  SellerEnforcementActionType,
  SellerEnforcementReasonCode,
  SellerEnforcementStatus,
} from "./types";

export const REASON_CODE_LABELS: Record<SellerEnforcementReasonCode, string> = {
  FINANCIAL_RISK: "Rủi ro tài chính / Thanh toán",
  FRAUD_RISK: "Nghi ngờ gian lận / Lừa đảo",
  FULFILLMENT_RISK: "Rủi ro bàn giao đơn hàng",
  OTHER: "Lý do khác",
  POLICY_VIOLATION: "Vi phạm điều khoản chính sách",
};

export const ACTION_TYPE_LABELS: Record<SellerEnforcementActionType, string> = {
  BAN: "Cấm vĩnh viễn (Ban)",
  ESCALATE: "Nâng mức xử lý (Escalate)",
  EXPIRE: "Hết hạn tạm dừng (Expire)",
  LIFT: "Khôi phục hoạt động (Lift)",
  OVERTURN: "Hủy phạt do Appeal (Overturn)",
  REASON_CORRECTED: "Hiệu chỉnh lý do (Reason Corrected)",
  SUSPEND: "Tạm dừng gian hàng (Suspend)",
};

export const APPEAL_STATUS_LABELS: Record<AppealStatus, string> = {
  OVERTURNED: "Chấp thuận khiếu nại (Đã hủy phạt)",
  SUBMITTED: "Đã nộp khiếu nại (Chờ xem xét)",
  SUPERSEDED: "Khiếu nại hết hiệu lực (Đã có quyết định mới)",
  UNDER_REVIEW: "Đang thẩm định",
  UPHELD: "Bác bỏ khiếu nại (Giữ nguyên)",
};

export const getReasonCodeLabel = (
  code?: SellerEnforcementReasonCode | string | null
): string => {
  if (!code) {
    return "Không xác định";
  }
  return (
    REASON_CODE_LABELS[code as SellerEnforcementReasonCode] ?? String(code)
  );
};

export const getActionTypeLabel = (
  actionType?: SellerEnforcementActionType | string | null
): string => {
  if (!actionType) {
    return "Xử lý vi phạm";
  }
  return (
    ACTION_TYPE_LABELS[actionType as SellerEnforcementActionType] ??
    String(actionType)
  );
};

export const getAppealStatusLabel = (
  status?: AppealStatus | string | null
): string => {
  if (!status) {
    return "Chưa khiếu nại";
  }
  return APPEAL_STATUS_LABELS[status as AppealStatus] ?? String(status);
};

export const validateEnforcementTransition = (
  current: SellerEnforcementStatus,
  target: SellerEnforcementStatus
): boolean => {
  if (current === target) {
    return false;
  }
  return true;
};

export const validateEnforcementInput = (params: {
  confirmAffectedEscrowHolds?: boolean;
  confirmAffectedOrderItems?: boolean;
  confirmAffectedWithdrawals?: boolean;
  expiresAt?: string | null;
  reason: string;
  state: SellerEnforcementStatus;
}): void => {
  const trimmed = params.reason.trim();
  if (trimmed.length === 0) {
    throw new Error("Lý do xử lý vi phạm không được để trống");
  }
  if (trimmed.length > 2000) {
    throw new Error("Lý do xử lý vi phạm không vượt quá 2000 ký tự");
  }

  if (
    params.state === "BANNED" &&
    (!params.confirmAffectedOrderItems ||
      !params.confirmAffectedEscrowHolds ||
      !params.confirmAffectedWithdrawals)
  ) {
    throw new Error(
      "Cấm Seller yêu cầu xác nhận đầy đủ 3 cam kết xử lý đơn hàng, escrow và rút tiền"
    );
  }

  if (params.state === "SUSPENDED" && params.expiresAt) {
    const expiry = new Date(params.expiresAt);
    if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) {
      throw new Error("Hạn tạm dừng phải là một mốc thời gian trong tương lai");
    }
  }
};

const getActionTypeForEnforcementStatus = (
  newStatus: SellerEnforcementStatus
): SellerEnforcementActionType => {
  if (newStatus === "ACTIVE") {
    return "LIFT";
  }
  if (newStatus === "SUSPENDED") {
    return "SUSPEND";
  }
  return "BAN";
};

export const enforceSeller = (
  seller: Seller,
  newStatus: SellerEnforcementStatus,
  reason: string,
  adminName = "Avin Admin",
  options?: {
    adminNote?: string | null;
    confirmAffectedEscrowHolds?: boolean;
    confirmAffectedOrderItems?: boolean;
    confirmAffectedWithdrawals?: boolean;
    expiresAt?: string | null;
    reasonCode?: SellerEnforcementReasonCode;
  }
): Seller => {
  if (!validateEnforcementTransition(seller.enforcementStatus, newStatus)) {
    throw new Error(`Seller đã ở trạng thái ${newStatus}`);
  }

  validateEnforcementInput({
    confirmAffectedEscrowHolds: options?.confirmAffectedEscrowHolds,
    confirmAffectedOrderItems: options?.confirmAffectedOrderItems,
    confirmAffectedWithdrawals: options?.confirmAffectedWithdrawals,
    expiresAt: options?.expiresAt,
    reason,
    state: newStatus,
  });

  const record: EnforcementRecord = {
    actionType: getActionTypeForEnforcementStatus(newStatus),
    adminName,
    adminNote: options?.adminNote,
    createdAt: new Date().toISOString(),
    effectiveAt: new Date().toISOString(),
    expiresAt: options?.expiresAt,
    id: `enf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    newStatus,
    previousStatus: seller.enforcementStatus,
    reason: reason.trim(),
    reasonCode: options?.reasonCode ?? "POLICY_VIOLATION",
    sellerReason: reason.trim(),
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
