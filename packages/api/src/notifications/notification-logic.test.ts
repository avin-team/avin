import { describe, expect, it } from "vitest";

import {
  decodeNotificationCursor,
  encodeNotificationCursor,
  isNotificationEventType,
  normalizeNotificationRecipients,
  redactNotificationContext,
} from "./notification-logic";

describe("Notification contract", () => {
  it("accepts only allowlisted event types", () => {
    expect(isNotificationEventType("order_item.transition")).toBe(true);
    expect(isNotificationEventType("chat.message.created")).toBe(false);
  });

  it("deduplicates recipients without changing their first safe target", () => {
    expect(
      normalizeNotificationRecipients([
        { targetPath: "/orders/order-1", userId: "buyer-1" },
        { targetPath: "/orders/order-1", userId: "buyer-1" },
        { targetPath: "/admin/disputes", userId: "admin-1" },
      ])
    ).toEqual([
      { targetPath: "/orders/order-1", userId: "buyer-1" },
      { targetPath: "/admin/disputes", userId: "admin-1" },
    ]);
  });

  it("redacts sensitive and non-primitive context values", () => {
    expect(
      redactNotificationContext({
        amount: 100_000,
        bankAccount: "4111",
        orderId: "order-1",
        snapshot: { secret: true },
        status: "REFUNDED",
      })
    ).toEqual({ amount: 100_000, orderId: "order-1", status: "REFUNDED" });
  });

  it("round-trips a stable cursor", () => {
    const cursor = encodeNotificationCursor({
      createdAt: "2026-08-11T03:00:00.000Z",
      id: "notification-1",
    });

    expect(decodeNotificationCursor(cursor)).toEqual({
      createdAt: "2026-08-11T03:00:00.000Z",
      id: "notification-1",
    });
  });
});
