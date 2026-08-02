import { describe, expect, it } from "vitest";

import { createSePaySignature } from "./sepay";
import { handleSePayWebhook } from "./webhook";

const configuration = {
  receivingAccountNumber: "0123456789",
  secret: "test-secret",
  timestampWindowSeconds: 300,
};

describe("SePay webhook handler", () => {
  it("verifies the signed raw body before processing and returns the exact success response", async () => {
    let processedEvent: unknown;
    const body = JSON.stringify({
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
      providerExtraField: "preserved",
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const request = new Request("https://avin.test/webhook/sepay", {
      body,
      headers: {
        "content-type": "application/json",
        "x-sepay-signature": createSePaySignature({
          body,
          secret: configuration.secret,
          timestamp,
        }),
        "x-sepay-timestamp": String(timestamp),
      },
      method: "POST",
    });

    const response = await handleSePayWebhook({
      configuration,
      processEvent: (event) => {
        processedEvent = event;
        return Promise.resolve({ eventId: "event-1", status: "CREDITED" });
      },
      request,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(processedEvent).toMatchObject({
      amount: 50_000,
      rawBody: body,
      rawPayload: { providerExtraField: "preserved" },
    });
  });

  it("rejects a signature over a different raw body", async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const request = new Request("https://avin.test/webhook/sepay", {
      body: '{"id":42}',
      headers: {
        "x-sepay-signature": createSePaySignature({
          body: '{"id":41}',
          secret: configuration.secret,
          timestamp,
        }),
        "x-sepay-timestamp": String(timestamp),
      },
      method: "POST",
    });

    const response = await handleSePayWebhook({
      configuration,
      processEvent: () =>
        Promise.resolve({ eventId: "event-1", status: "CREDITED" }),
      request,
    });

    expect(response.status).toBe(401);
  });
});
