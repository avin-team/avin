import { describe, expect, it } from "vitest";

import {
  canBuyerCancel,
  canBuyerConfirmDelivery,
  canBuyerOpenDispute,
  getOrderItemStatusLabel,
  getOrderItemStatusVariant,
} from "@/features/commerce/order-status";

const now = new Date("2026-08-03T00:00:00.000Z");

describe("order status UI rules", () => {
  it("exposes the status labels and visual variants used by both workspaces", () => {
    expect(getOrderItemStatusLabel("AWAITING_SELLER")).toBe(
      "Chờ người bán tiếp nhận"
    );
    expect(getOrderItemStatusLabel("IN_WARRANTY")).toBe("Đang bảo hành");
    expect(getOrderItemStatusVariant("DISPUTED")).toBe("destructive");
    expect(getOrderItemStatusVariant("DELIVERED")).toBe("secondary");
  });

  it("keeps Buyer confirmation on the delivered review window boundary", () => {
    const deadline = "2026-08-03T00:00:00.000Z";

    expect(canBuyerConfirmDelivery("DELIVERED", deadline, now)).toBe(true);
    expect(
      canBuyerConfirmDelivery(
        "DELIVERED",
        deadline,
        new Date("2026-08-03T00:00:00.001Z")
      )
    ).toBe(false);
    expect(canBuyerConfirmDelivery("IN_PROGRESS", deadline, now)).toBe(false);
  });

  it("allows Buyer cancellation only while the Seller is still awaiting", () => {
    expect(canBuyerCancel("AWAITING_SELLER")).toBe(true);
    expect(canBuyerCancel("IN_PROGRESS")).toBe(false);
    expect(canBuyerCancel("DELIVERED")).toBe(false);
  });

  it("matches the API Dispute eligibility windows", () => {
    const processingDeadlineAt = "2026-08-03T00:00:00.000Z";
    const reviewDeadlineAt = "2026-08-03T00:00:00.000Z";
    const warrantyExpiresAt = "2026-08-04T00:00:00.000Z";

    expect(
      canBuyerOpenDispute({
        deliveryReviewDeadlineAt: null,
        now,
        processingDeadlineAt,
        status: "IN_PROGRESS",
        warrantyExpiresAt: null,
      })
    ).toBe(true);
    expect(
      canBuyerOpenDispute({
        deliveryReviewDeadlineAt: reviewDeadlineAt,
        now: new Date("2026-08-03T00:00:00.001Z"),
        processingDeadlineAt: null,
        status: "DELIVERED",
        warrantyExpiresAt: null,
      })
    ).toBe(false);
    expect(
      canBuyerOpenDispute({
        deliveryReviewDeadlineAt: null,
        now,
        processingDeadlineAt: null,
        status: "IN_WARRANTY",
        warrantyExpiresAt,
      })
    ).toBe(true);
    expect(
      canBuyerOpenDispute({
        deliveryReviewDeadlineAt: null,
        now: new Date("2026-08-04T00:00:00.000Z"),
        processingDeadlineAt: null,
        status: "IN_WARRANTY",
        warrantyExpiresAt,
      })
    ).toBe(false);
    expect(
      canBuyerOpenDispute({
        deliveryReviewDeadlineAt: null,
        now,
        processingDeadlineAt: null,
        status: "CLOSED",
        warrantyExpiresAt: null,
      })
    ).toBe(false);
  });
});
