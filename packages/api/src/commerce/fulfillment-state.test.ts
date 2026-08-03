import { describe, expect, it } from "vitest";

import { decideOrderItemTransition } from "./fulfillment-state";
import type { OrderItemTransitionInput } from "./fulfillment-state";

const now = new Date("2026-08-03T00:00:00.000Z");

const transition = (
  overrides: Partial<OrderItemTransitionInput>
): OrderItemTransitionInput => ({
  command: { type: "START_FULFILLMENT" },
  currentStatus: "AWAITING_SELLER",
  now,
  ...overrides,
});

describe("OrderItem fulfillment state", () => {
  it("requires an explicit Seller start before delivery can be submitted", () => {
    expect(
      decideOrderItemTransition(
        transition({ command: { type: "START_FULFILLMENT" } })
      )
    ).toMatchObject({
      newStatus: "IN_PROGRESS",
      oldStatus: "AWAITING_SELLER",
    });

    expect(() =>
      decideOrderItemTransition(
        transition({
          command: {
            deliveryNote: "Here is the completed work",
            type: "SUBMIT_DELIVERY",
          },
        })
      )
    ).toThrow("OrderItem must be IN_PROGRESS before delivery");
  });

  it("sets the delivery review deadline from the server delivery time", () => {
    const result = decideOrderItemTransition(
      transition({
        command: {
          deliveryNote: "Here is the completed work",
          type: "SUBMIT_DELIVERY",
        },
        currentStatus: "IN_PROGRESS",
      })
    );

    expect(result).toMatchObject({
      deliveryReviewDeadlineAt: new Date("2026-08-05T00:00:00.000Z"),
      newStatus: "DELIVERED",
      oldStatus: "IN_PROGRESS",
    });
  });

  it("uses the fixed review deadline as the warranty start for timeout", () => {
    const reviewDeadlineAt = new Date("2026-08-03T00:00:00.000Z");
    const result = decideOrderItemTransition({
      command: { type: "EXPIRE_DELIVERY_REVIEW" },
      currentStatus: "DELIVERED",
      deliveryReviewDeadlineAt: reviewDeadlineAt,
      now,
      warrantyDurationHours: 72,
    });

    expect(result).toMatchObject({
      effectiveAt: reviewDeadlineAt,
      newStatus: "IN_WARRANTY",
      warrantyExpiresAt: new Date("2026-08-06T00:00:00.000Z"),
      warrantyStartedAt: reviewDeadlineAt,
    });
  });

  it("closes the item when the Warranty period expires", () => {
    const warrantyExpiresAt = new Date("2026-08-03T00:00:00.000Z");
    const result = decideOrderItemTransition({
      command: { type: "EXPIRE_WARRANTY" },
      currentStatus: "IN_WARRANTY",
      now,
      warrantyExpiresAt,
    });

    expect(result).toMatchObject({
      effectiveAt: warrantyExpiresAt,
      newStatus: "CLOSED",
      oldStatus: "IN_WARRANTY",
    });
  });

  it("rejects confirmation and review Dispute requests after the review deadline", () => {
    const reviewDeadlineAt = new Date("2026-08-03T00:00:00.000Z");
    const afterReview = new Date("2026-08-03T00:00:01.000Z");

    expect(() =>
      decideOrderItemTransition({
        command: { type: "CONFIRM_DELIVERY" },
        currentStatus: "DELIVERED",
        deliveryReviewDeadlineAt: reviewDeadlineAt,
        now: afterReview,
        warrantyDurationHours: 72,
      })
    ).toThrow("Delivery review window has expired");

    expect(() =>
      decideOrderItemTransition({
        command: {
          reason: "The delivery is not acceptable",
          type: "OPEN_DISPUTE",
        },
        currentStatus: "DELIVERED",
        deliveryReviewDeadlineAt: reviewDeadlineAt,
        now: afterReview,
      })
    ).toThrow("Delivery review window has expired");
  });

  it("rejects a Dispute after the Warranty period expires", () => {
    expect(() =>
      decideOrderItemTransition({
        command: {
          reason: "The warranty issue was not resolved",
          type: "OPEN_DISPUTE",
        },
        currentStatus: "IN_WARRANTY",
        now,
        warrantyExpiresAt: new Date("2026-08-02T23:59:59.000Z"),
      })
    ).toThrow("Warranty period has expired");
  });

  it("allows a late-delivery Dispute only after the Processing Expectation deadline", () => {
    expect(() =>
      decideOrderItemTransition({
        command: { reason: "Seller has not delivered", type: "OPEN_DISPUTE" },
        currentStatus: "AWAITING_SELLER",
        now,
        processingDeadlineAt: new Date("2026-08-03T00:00:01.000Z"),
      })
    ).toThrow("Processing Expectation has not expired");

    expect(
      decideOrderItemTransition({
        command: { reason: "Seller has not delivered", type: "OPEN_DISPUTE" },
        currentStatus: "AWAITING_SELLER",
        now,
        processingDeadlineAt: new Date("2026-08-02T23:59:59.000Z"),
      })
    ).toMatchObject({ newStatus: "DISPUTED" });
  });

  it("permits Buyer cancellation only before Seller starts and Seller cancellation with a reason", () => {
    expect(
      decideOrderItemTransition({
        command: { type: "CANCEL_BY_BUYER" },
        currentStatus: "AWAITING_SELLER",
        now,
      })
    ).toMatchObject({ newStatus: "CANCELLED" });

    expect(() =>
      decideOrderItemTransition({
        command: { type: "CANCEL_BY_BUYER" },
        currentStatus: "IN_PROGRESS",
        now,
      })
    ).toThrow("Buyer can cancel only while awaiting Seller");

    expect(() =>
      decideOrderItemTransition({
        command: { reason: "   ", type: "CANCEL_BY_SELLER" },
        currentStatus: "IN_PROGRESS",
        now,
      })
    ).toThrow("Seller cancellation requires a reason");

    expect(
      decideOrderItemTransition({
        command: {
          reason: "Seller account is banned",
          type: "CANCEL_BY_SYSTEM",
        },
        currentStatus: "IN_PROGRESS",
        now,
      })
    ).toMatchObject({ newStatus: "CANCELLED" });
  });
});
