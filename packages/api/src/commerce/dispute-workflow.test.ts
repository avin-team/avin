import { describe, expect, it } from "vitest";

import { addBusinessHours } from "./dispute-contracts";
import {
  cancelDisputeDecision,
  resolveDisputeDecision,
} from "./dispute-workflow";

describe("Dispute decision workflow", () => {
  it("maps a full refund to a refunded item and escrow hold", () => {
    expect(
      resolveDisputeDecision({
        disputeStatus: "OPEN",
        note: "Seller evidence does not satisfy the delivery contract.",
        now: new Date("2026-08-07T01:00:00.000Z"),
        orderItemStatus: "DISPUTED",
        outcome: "RESOLVED_REFUNDED",
      })
    ).toMatchObject({
      disputeStatus: "RESOLVED_REFUNDED",
      escrowHoldStatus: "REFUNDED",
      orderItemStatus: "REFUNDED",
    });
  });

  it("maps a full release to a closed item and released escrow hold", () => {
    expect(
      resolveDisputeDecision({
        disputeStatus: "OPEN",
        note: "Seller fulfilled the contract and provided sufficient evidence.",
        now: new Date("2026-08-07T01:00:00.000Z"),
        orderItemStatus: "DISPUTED",
        outcome: "RESOLVED_RELEASED",
      })
    ).toMatchObject({
      disputeStatus: "RESOLVED_RELEASED",
      escrowHoldStatus: "RELEASED",
      orderItemStatus: "CLOSED",
    });
  });

  it("requires a decision note and an open disputed item", () => {
    expect(() =>
      resolveDisputeDecision({
        disputeStatus: "OPEN",
        note: "  ",
        now: new Date(),
        orderItemStatus: "DISPUTED",
        outcome: "RESOLVED_REFUNDED",
      })
    ).toThrow("Dispute resolution requires a reason");

    expect(() =>
      resolveDisputeDecision({
        disputeStatus: "RESOLVED_REFUNDED",
        note: "Duplicate decision",
        now: new Date(),
        orderItemStatus: "REFUNDED",
        outcome: "RESOLVED_RELEASED",
      })
    ).toThrow("Dispute is no longer open");
  });

  it("cancels an open dispute and restores its prior item status", () => {
    expect(
      cancelDisputeDecision({
        disputeStatus: "OPEN",
        now: new Date("2026-08-07T01:00:00.000Z"),
        orderItemStatus: "DISPUTED",
        previousOrderItemStatus: "IN_WARRANTY",
        reason: "Buyer found an alternative resolution.",
      })
    ).toMatchObject({
      disputeStatus: "CANCELLED",
      orderItemStatus: "IN_WARRANTY",
    });
  });

  it("skips weekends when calculating the Admin SLA", () => {
    expect(
      addBusinessHours(new Date("2026-08-07T23:00:00.000Z"), 2).toISOString()
    ).toBe("2026-08-10T01:00:00.000Z");
  });
});
