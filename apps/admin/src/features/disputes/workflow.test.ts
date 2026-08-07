import { describe, expect, it } from "vitest";

import type { Dispute } from "./types";
import { canResolveDispute, resolveDispute } from "./workflow";

describe("Dispute workflow", () => {
  const mockDispute: Dispute = {
    buyerEmail: "buyer@gmail.com",
    buyerName: "Nguyen Van B",
    chatMessages: [],
    createdAt: "2026-07-29T10:00:00Z",
    evidenceList: [],
    id: "disp_1",
    itemSnapshot: {
      buyerInputs: { account_id: "buyer_canva_account" },
      categoryName: "Mở Khóa & Activation Tool",
      id: "item_99",
      listingTitle: "Key kích hoạt Canva Pro 1 năm",
      orderId: "ord_100",
      quantity: 1,
      servicePackageDescription: null,
      servicePackageName: null,
      servicePackageScope: null,
      totalAmountVnd: 150_000,
      unitPriceVnd: 150_000,
      warrantyDurationHours: 72,
      warrantyPolicyTerms: "Bảo hành 1 đổi 1 trong 72h",
    },
    orderItemId: "item_99",
    reason: "Mã key đã qua sử dụng, seller không hỗ trợ đổi mới",
    responseDeadlineAt: "2026-07-31T10:00:00Z",
    sellerEmail: "seller@fast.vn",
    sellerStorefrontName: "Fast Unlock Store",
    status: "OPEN",
  };

  it("checks whether dispute can be resolved", () => {
    expect(canResolveDispute("OPEN")).toBe(true);
    expect(canResolveDispute("UNDER_REVIEW")).toBe(true);
    expect(canResolveDispute("RESOLVED_REFUNDED")).toBe(false);
    expect(canResolveDispute("RESOLVED_RELEASED")).toBe(false);
  });

  it("requires a non-empty resolution note", () => {
    expect(() =>
      resolveDispute(mockDispute, "RESOLVED_REFUNDED", "  ")
    ).toThrow("Ghi chú quyết định xử lý khiếu nại không được để trống");
  });

  it("resolves with full refund to user and appends admin message", () => {
    const resolved = resolveDispute(
      mockDispute,
      "RESOLVED_REFUNDED",
      "Bằng chứng cho thấy key đã activated trước thời điểm mua",
      "Admin quyết định hoàn tiền 100% về ví Buyer."
    );

    expect(resolved.status).toBe("RESOLVED_REFUNDED");
    expect(resolved.resolutionNote).toBe(
      "Bằng chứng cho thấy key đã activated trước thời điểm mua"
    );
    expect(resolved.chatMessages).toHaveLength(1);
    expect(resolved.chatMessages[0]?.senderRole).toBe("ADMIN");
  });

  it("fails if dispute is already resolved", () => {
    const resolved = resolveDispute(mockDispute, "RESOLVED_REFUNDED", "Done");
    expect(() =>
      resolveDispute(resolved, "RESOLVED_RELEASED", "Retry")
    ).toThrow("Tranh chấp đã được xử lý xong (RESOLVED_REFUNDED)");
  });
});
