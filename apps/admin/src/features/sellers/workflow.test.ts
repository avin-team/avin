import { describe, expect, it } from "vitest";

import type { Seller } from "./types";
import {
  areListingsVisible,
  canRequestWithdrawal,
  enforceSeller,
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
      "Mẫu lý do xử lý vi phạm không được để trống"
    );
  });

  it("prevents enforcing the exact same status", () => {
    expect(() =>
      enforceSeller(mockSeller, "ACTIVE", "Khôi phục hoạt động")
    ).toThrow("Seller đã ở trạng thái ACTIVE");
  });

  it("successfully suspends an active seller with history", () => {
    const suspended = enforceSeller(
      mockSeller,
      "SUSPENDED",
      "Vi phạm chính sách bảo hành"
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
});
