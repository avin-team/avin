import { cartItem, checkout, order, orderItem } from "@avin/db/schema/commerce";
import { describe, expect, it, vi } from "vitest";

import type { CommerceExecutor } from "./cart";
import { createCheckout } from "./checkout";
import { fingerprintCheckoutRequest } from "./contracts";

type TransactionRunner = (tx: CommerceExecutor) => Promise<unknown>;

describe("createCheckout", () => {
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
