import { describe, expect, it } from "vitest";

import {
  buildVietQrUrl,
  createSePaySignature,
  generatePaymentCode,
  normalizeSePayWebhookPayload,
  verifySePaySignature,
} from "./sepay";

describe("wallet deposit references", () => {
  it("generates an AV reference with twelve uppercase alphanumeric characters", () => {
    const paymentCode = generatePaymentCode(() => 0);

    expect(paymentCode).toMatch(/^AV[A-Z0-9]{12}$/u);
    expect(paymentCode).toBe("AVAAAAAAAAAAAA");
  });

  it("builds the documented VietQR URL with encoded fallback details", () => {
    expect(
      buildVietQrUrl({
        accountName: "AVIN MARKET",
        accountNumber: "0123456789",
        amount: 50_000,
        bank: "Vietcombank",
        paymentCode: "AVABC123456789",
      })
    ).toBe(
      "https://vietqr.app/img?acc=0123456789&bank=Vietcombank&amount=50000&des=AVABC123456789"
    );
  });
});

describe("SePay webhook authentication", () => {
  it("signs and verifies the exact raw body", () => {
    const body = '{"id":42,"content":"AVABC123456789"}';
    const timestamp = 1_754_000_000;
    const signature = createSePaySignature({
      body,
      secret: "test-secret",
      timestamp,
    });

    expect(signature).toMatch(/^sha256=[0-9a-f]{64}$/u);
    expect(
      verifySePaySignature({
        body,
        now: new Date(timestamp * 1000 + 30_000),
        secret: "test-secret",
        signature,
        timestamp,
      })
    ).toBe(true);
    expect(
      verifySePaySignature({
        body: `${body} `,
        now: new Date(timestamp * 1000 + 30_000),
        secret: "test-secret",
        signature,
        timestamp,
      })
    ).toBe(false);
  });

  it("rejects signatures outside the five-minute replay window", () => {
    const timestamp = 1_754_000_000;
    const signature = createSePaySignature({
      body: "{}",
      secret: "test-secret",
      timestamp,
    });

    expect(
      verifySePaySignature({
        body: "{}",
        now: new Date((timestamp + 301) * 1000),
        secret: "test-secret",
        signature,
        timestamp,
      })
    ).toBe(false);
  });
});

describe("SePay webhook payloads", () => {
  it("normalizes incoming VND transfers without losing the raw payload", () => {
    const payload = {
      accountNumber: "0123456789",
      code: "AVABC123456789",
      content: "AVABC123456789 chuyen tien",
      currency: "VND",
      gateway: "Vietcombank",
      id: 42,
      referenceCode: "FT123",
      transactionDate: "2026-08-02 10:00:00",
      transferAmount: 50_000,
      transferType: "in",
    };

    expect(normalizeSePayWebhookPayload(payload)).toEqual({
      accountNumber: "0123456789",
      amount: 50_000,
      bankReference: "FT123",
      content: "AVABC123456789 chuyen tien",
      currency: "VND",
      gateway: "Vietcombank",
      paymentCode: "AVABC123456789",
      providerEventId: "42",
      rawPayload: payload,
      source: "WEBHOOK",
      transactionAt: new Date("2026-08-02T10:00:00.000Z"),
      transferType: "in",
    });
  });
});
