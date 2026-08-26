import { describe, expect, it, vi } from "vitest";

import { matchSePayDeposit, processSePayEvent } from "./processor";
import type { NormalizedSePayEvent } from "./sepay";

const event: NormalizedSePayEvent = {
  accountNumber: "0123456789",
  amount: 50_000,
  bankReference: "FT123",
  content: "AVABC123456789 chuyen tien",
  currency: "VND",
  gateway: "Vietcombank",
  paymentCode: "AVABC123456789",
  providerEventId: "42",
  rawPayload: {},
  source: "WEBHOOK",
  transactionAt: new Date("2026-08-02T10:00:00.000Z"),
  transferType: "in",
};

describe("SePay deposit matching", () => {
  it("accepts an exact incoming VND payment for a pending request", () => {
    expect(
      matchSePayDeposit({
        event,
        receivingAccountNumber: "0123456789",
        request: { amount: 50_000, id: "request-1", status: "PENDING" },
      })
    ).toEqual({ reason: "matched", requestId: "request-1" });
  });

  it("keeps a wrong amount available for reconciliation without crediting it", () => {
    expect(
      matchSePayDeposit({
        event: { ...event, amount: 49_000 },
        receivingAccountNumber: "0123456789",
        request: { amount: 50_000, id: "request-1", status: "PENDING" },
      })
    ).toEqual({ reason: "amount_mismatch", requestId: "request-1" });
  });

  it("associates other provider mismatches with the matching request", () => {
    expect(
      matchSePayDeposit({
        event: { ...event, currency: "USD" },
        receivingAccountNumber: "0123456789",
        request: { amount: 50_000, id: "request-1", status: "PENDING" },
      })
    ).toEqual({ reason: "currency_mismatch", requestId: "request-1" });
  });

  it("does not automatically credit a second payment for a credited request", () => {
    expect(
      matchSePayDeposit({
        event,
        receivingAccountNumber: "0123456789",
        request: { amount: 50_000, id: "request-1", status: "CREDITED" },
      })
    ).toEqual({
      reason: "deposit_request_already_credited",
      requestId: "request-1",
    });
  });
});

describe("SePay event processing", () => {
  it("associates an amount mismatch with its deposit request for buyer review", async () => {
    const updates: Record<string, unknown>[] = [];
    let selectCount = 0;
    const transaction = {
      insert: vi.fn(() => ({
        values: () => ({
          onConflictDoNothing: () => ({
            returning: () =>
              Promise.resolve([
                {
                  ...event,
                  id: "event-1",
                },
              ]),
          }),
        }),
      })),
      select: vi.fn(() => {
        const query = {
          for: () => query,
          from: () => query,
          limit: () => {
            selectCount += 1;
            return Promise.resolve(
              selectCount <= 3
                ? []
                : [{ amount: 50_000, id: "request-1", status: "PENDING" }]
            );
          },
          where: () => query,
        };
        return query;
      }),
      update: vi.fn(() => ({
        set: (values: Record<string, unknown>) => {
          updates.push(values);
          return { where: () => Promise.resolve([]) };
        },
      })),
    };
    // This fake mirrors Drizzle's transaction callback boundary.
    const database = {
      transaction: (
        callback: (executor: typeof transaction) => Promise<unknown>
      ) => callback(transaction),
    };
    /* eslint-enable promise/prefer-await-to-callbacks */

    const result = await processSePayEvent(
      { ...event, amount: 49_000 },
      { receivingAccountNumber: event.accountNumber },
      new Date("2026-08-02T10:05:00.000Z"),
      database as never
    );

    expect(result).toEqual({ eventId: "event-1", status: "UNMATCHED" });
    expect(updates).toContainEqual(
      expect.objectContaining({
        depositRequestId: "request-1",
        failureReason: "amount_mismatch",
        processedAt: new Date("2026-08-02T10:05:00.000Z"),
        status: "UNMATCHED",
      })
    );
  });
});
