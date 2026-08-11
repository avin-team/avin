import {
  cartItem,
  checkout,
  checkoutAttachmentDraft,
  order,
  orderItem,
  orderItemLifecycleEvent,
} from "@avin/db/schema/commerce";
import { describe, expect, it, vi } from "vitest";

import type { CommerceExecutor } from "./cart";
import { createCheckout, createOrdersAndEscrowHolds } from "./checkout";
import { fingerprintCheckoutRequest } from "./contracts";

const { createNotificationEvent } = vi.hoisted(() => ({
  createNotificationEvent: vi.fn(),
}));

vi.mock("../notifications/notification", () => ({
  createNotificationEvent,
}));

type TransactionRunner = (tx: CommerceExecutor) => Promise<unknown>;

describe("createCheckout", () => {
  it("sends role-specific notifications when checkout awaits seller confirmation", async () => {
    const now = new Date("2026-08-11T09:11:01.839Z");
    const transaction = {
      insert: vi.fn((table: unknown) => ({
        values: vi.fn(() => {
          if (table === order) {
            return {
              returning: vi.fn().mockResolvedValue([{ id: "order-1" }]),
            };
          }
          if (table === orderItem) {
            return {
              returning: vi.fn().mockResolvedValue([{ id: "item-1" }]),
            };
          }
          if (table === orderItemLifecycleEvent) {
            return {
              returning: vi
                .fn()
                .mockResolvedValue([{ id: "lifecycle-event-1" }]),
            };
          }
          return Promise.resolve([]);
        }),
      })),
      select: vi.fn(() => ({
        from: vi.fn((table: unknown) => {
          if (table === checkoutAttachmentDraft) {
            return { where: vi.fn().mockResolvedValue([]) };
          }
          throw new Error("Unexpected select in checkout order creation test");
        }),
      })),
    };

    await createOrdersAndEscrowHolds(
      transaction as unknown as CommerceExecutor,
      "checkout-1",
      "buyer-1",
      "purchase-transaction-1",
      [
        {
          buyerDescription: "",
          contract: {
            listingSnapshot: {},
            priceAmount: 100_000,
            processingTimeHours: 24,
            servicePackageId: null,
            servicePackageSnapshot: null,
            warrantyPolicy: { kind: "UNTIL_CLOSED" },
          },
          row: {
            listingId: "listing-1",
            sellerId: "seller-1",
          },
        },
      ] as never,
      "checkout-key-1",
      now
    );

    expect(createNotificationEvent).toHaveBeenCalledTimes(2);
    expect(createNotificationEvent).toHaveBeenCalledWith(transaction, {
      body: "Đơn hàng của bạn đã được tạo và đang chờ người bán xác nhận.",
      context: {
        orderId: "order-1",
        orderItemId: "item-1",
        status: "AWAITING_SELLER",
      },
      eventType: "order_item.transition",
      now,
      recipients: [{ targetPath: "/orders/order-1", userId: "buyer-1" }],
      sourceId: "lifecycle-event-1",
      sourceType: "ORDER_ITEM_LIFECYCLE",
      title: "Đặt hàng thành công",
    });
    expect(createNotificationEvent).toHaveBeenCalledWith(transaction, {
      body: "Bạn có đơn hàng mới đang chờ xác nhận.",
      context: {
        orderId: "order-1",
        orderItemId: "item-1",
        status: "AWAITING_SELLER",
      },
      eventType: "order_item.transition",
      now,
      recipients: [
        {
          targetPath: "/seller/store?section=orders",
          userId: "seller-1",
        },
      ],
      sourceId: "lifecycle-event-1",
      sourceType: "ORDER_ITEM_LIFECYCLE",
      title: "Đơn hàng mới cần xác nhận",
    });
  });

  it("rejects non-BUYER roles with FORBIDDEN", async () => {
    const database = {
      transaction: vi.fn(async (runner: TransactionRunner) => {
        const tx = {
          select: vi.fn(() => ({
            from: () => ({
              where: () => ({
                for: () => ({
                  limit: () => [{ id: "user-1", role: "SELLER" }],
                }),
              }),
            }),
          })),
        };
        return await runner(tx as unknown as CommerceExecutor);
      }),
    };

    await expect(
      createCheckout(database as never, "user-1", {
        confirmMaterialChanges: false,
        idempotencyKey: "checkout-key-123456",
        items: [
          {
            contractFingerprint: "a".repeat(64),
            listingId: "00000000-0000-4000-8000-000000000001",
          },
        ],
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Chỉ Buyer mới có thể Checkout.",
    });
  });

  it("returns existing checkout result if idempotency key matches", async () => {
    const existingId = "00000000-0000-4000-8000-000000000099";
    const inputPayload = {
      confirmMaterialChanges: false,
      idempotencyKey: "checkout-key-123456",
      items: [
        {
          contractFingerprint: "a".repeat(64),
          listingId: "00000000-0000-4000-8000-000000000001",
        },
      ],
    };
    const expectedFingerprint = fingerprintCheckoutRequest(inputPayload);

    const database = {
      transaction: vi.fn(async (runner: TransactionRunner) => {
        const tx = {
          select: vi.fn((fields) => {
            if (fields && "id" in fields && "role" in fields) {
              return {
                from: () => ({
                  where: () => ({
                    for: () => ({
                      limit: () => [{ id: "user-1", role: "BUYER" }],
                    }),
                  }),
                }),
              };
            }
            return {
              from: (table: unknown) => {
                if (table === checkout) {
                  return {
                    where: () => ({
                      for: () => ({
                        limit: () => [
                          {
                            id: existingId,
                            purchaseTransactionId: "tx-1",
                            requestFingerprint: expectedFingerprint,
                            totalAmount: 100_000,
                          },
                        ],
                      }),
                      limit: () => [
                        {
                          id: existingId,
                          purchaseTransactionId: "tx-1",
                          totalAmount: 100_000,
                        },
                      ],
                    }),
                  };
                }
                if (table === order) {
                  return {
                    where: () => ({
                      orderBy: () => [
                        {
                          id: "order-1",
                          sellerId: "seller-1",
                          totalAmount: 100_000,
                        },
                      ],
                    }),
                  };
                }
                if (table === orderItem) {
                  return {
                    innerJoin: () => ({
                      where: () => ({
                        orderBy: () => [],
                      }),
                    }),
                  };
                }
                return {
                  where: () => ({
                    limit: () => [],
                  }),
                };
              },
            };
          }),
        };
        return await runner(tx as unknown as CommerceExecutor);
      }),
    };

    const result = await createCheckout(
      database as never,
      "user-1",
      inputPayload
    );

    expect(result.checkoutId).toBe(existingId);
  });

  it("locks cartItem specifically with { of: cartItem } during selection query", async () => {
    const forUpdateMock = vi.fn(() => []);
    const database = {
      transaction: vi.fn(async (runner: TransactionRunner) => {
        const tx = {
          select: vi.fn((fields) => {
            if (fields && "id" in fields && "role" in fields) {
              return {
                from: () => ({
                  where: () => ({
                    for: () => ({
                      limit: () => [{ id: "user-1", role: "BUYER" }],
                    }),
                  }),
                }),
              };
            }
            return {
              from: (table: unknown) => {
                if (table === checkout) {
                  return {
                    where: () => ({
                      for: () => ({
                        limit: () => [],
                      }),
                    }),
                  };
                }
                if (table === cartItem) {
                  return {
                    innerJoin: () => ({
                      innerJoin: () => ({
                        innerJoin: () => ({
                          innerJoin: () => ({
                            leftJoin: () => ({
                              leftJoin: () => ({
                                where: () => ({
                                  orderBy: () => ({
                                    for: forUpdateMock,
                                  }),
                                }),
                              }),
                            }),
                          }),
                        }),
                      }),
                    }),
                  };
                }
                return {
                  where: () => ({
                    limit: () => [],
                  }),
                };
              },
            };
          }),
        };
        return await runner(tx as unknown as CommerceExecutor);
      }),
    };

    await expect(
      createCheckout(database as never, "user-1", {
        confirmMaterialChanges: false,
        idempotencyKey: "checkout-key-123456",
        items: [
          {
            contractFingerprint: "a".repeat(64),
            listingId: "00000000-0000-4000-8000-000000000001",
          },
        ],
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Cart chưa có Listing nào được chọn.",
    });

    expect(forUpdateMock).toHaveBeenCalledWith("update", { of: cartItem });
  });
});
