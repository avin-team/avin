import { describe, expect, it } from "vitest";

import type { Seller } from "./types";
import {
  areListingsVisible,
  canRequestWithdrawal,
  enforceSeller,
  getActionTypeLabel,
  getAppealStatusLabel,
  getReasonCodeLabel,
} from "./workflow";

describe("Seller enforcement workflow", () => {
  const mockSeller: Seller = {
    activeListingsCount: 12,
    applicantName: "Nguyen Van A",
    averageRating: 4.8,
    completedOrdersCount: 450,
    email: "seller@avin.vn",
    enforcementHistory: [],
    enforcementStatus: "ACTIVE",
    id: "seller_1",
    joinedAt: "2026-01-15T00:00:00Z",
    phone: "0901234567",
    ratingCount: 120,
    storefrontName: "Avin Store",
    wallet: {
      availableBalanceVnd: 12_000_000,
      pendingEscrowBalanceVnd: 5_000_000,
    },
  };

  it("requires a reason to suspend or ban a seller", () => {
    expect(() => enforceSeller(mockSeller, "SUSPENDED", "   ")).toThrow(
      "Lý do xử lý vi phạm không được để trống"
    );
  });

  it("prevents enforcing the exact same status", () => {
    expect(() =>
      enforceSeller(mockSeller, "ACTIVE", "Khôi phục hoạt động")
    ).toThrow("Seller đã ở trạng thái ACTIVE");
  });

  it("requires ban confirmation flags when banning a seller", () => {
    expect(() =>
      enforceSeller(
        mockSeller,
        "BANNED",
        "Gian lận tài chính nghiêm trọng",
        "Avin Admin",
        {
          confirmAffectedEscrowHolds: false,
          confirmAffectedOrderItems: true,
          confirmAffectedWithdrawals: true,
        }
      )
    ).toThrow(
      "Cấm Seller yêu cầu xác nhận đầy đủ 3 cam kết xử lý đơn hàng, escrow và rút tiền"
    );
  });

  it("successfully bans an active seller when all confirmations are provided", () => {
    const banned = enforceSeller(
      mockSeller,
      "BANNED",
      "Gian lận tài chính nghiêm trọng",
      "Avin Admin",
      {
        adminNote: "Ghi chú bảo mật nội bộ",
        confirmAffectedEscrowHolds: true,
        confirmAffectedOrderItems: true,
        confirmAffectedWithdrawals: true,
        reasonCode: "FRAUD_RISK",
      }
    );

    expect(banned.enforcementStatus).toBe("BANNED");
    expect(banned.enforcementHistory).toHaveLength(1);
    expect(banned.enforcementHistory[0]?.reasonCode).toBe("FRAUD_RISK");
    expect(banned.enforcementHistory[0]?.adminNote).toBe(
      "Ghi chú bảo mật nội bộ"
    );
    expect(banned.enforcementHistory[0]?.actionType).toBe("BAN");
  });

  it("successfully suspends an active seller with history", () => {
    const suspended = enforceSeller(
      mockSeller,
      "SUSPENDED",
      "Vi phạm chính sách bảo hành",
      "Avin Admin",
      {
        reasonCode: "POLICY_VIOLATION",
      }
    );
    expect(suspended.enforcementStatus).toBe("SUSPENDED");
    expect(suspended.enforcementHistory).toHaveLength(1);
    expect(suspended.enforcementHistory[0]?.reason).toBe(
      "Vi phạm chính sách bảo hành"
    );
    expect(suspended.enforcementHistory[0]?.previousStatus).toBe("ACTIVE");
    expect(suspended.enforcementHistory[0]?.newStatus).toBe("SUSPENDED");
  });

  it("checks listing visibility and withdrawal rules", () => {
    expect(canRequestWithdrawal("ACTIVE")).toBe(true);
    expect(canRequestWithdrawal("SUSPENDED")).toBe(false);
    expect(canRequestWithdrawal("BANNED")).toBe(false);

    expect(areListingsVisible("ACTIVE")).toBe(true);
    expect(areListingsVisible("SUSPENDED")).toBe(false);
    expect(areListingsVisible("BANNED")).toBe(false);
  });

  it("formats labels correctly", () => {
    expect(getReasonCodeLabel("FRAUD_RISK")).toBe(
      "Nghi ngờ gian lận / Lừa đảo"
    );
    expect(getActionTypeLabel("BAN")).toBe("Cấm vĩnh viễn (Ban)");
    expect(getAppealStatusLabel("SUBMITTED")).toBe(
      "Đã nộp khiếu nại (Chờ xem xét)"
    );
  });
});
