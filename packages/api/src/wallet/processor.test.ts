import { describe, expect, it } from "vitest";

import { matchSePayDeposit } from "./processor";
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
