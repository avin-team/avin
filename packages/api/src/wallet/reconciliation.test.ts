import { describe, expect, it } from "vitest";

import {
  fetchSePayTransactions,
  normalizeSePayApiTransaction,
  reconcileSePayTransactions,
} from "./reconciliation";

const concurrentFetchFn = (
  _input: string | URL | Request,
  _init: RequestInit | undefined
) =>
  Promise.resolve(
    Response.json({
      data: [
        {
          account_number: "0123456789",
          amount_in: 50_000,
          amount_out: 0,
          bank_brand_name: "Vietcombank",
          code: "AVABC123456789",
          id: "api-42",
          reference_number: "FT123",
          transaction_content: "AVABC123456789 chuyen tien",
          transaction_date: "2026-08-02 10:00:00",
        },
        {
          account_number: "0123456789",
          amount_in: 75_000,
          amount_out: 0,
          bank_brand_name: "Vietcombank",
          code: "AVXYZ123456789",
          id: "api-43",
          reference_number: "FT124",
          transaction_content: "AVXYZ123456789 chuyen tien",
          transaction_date: "2026-08-02 10:01:00",
        },
      ],
    })
  );

describe("SePay Transactions API reconciliation", () => {
  it("normalizes a bank transaction into the same provider event shape", () => {
    expect(
      normalizeSePayApiTransaction({
        account_number: "0123456789",
        amount_in: 50_000,
        amount_out: 0,
        bank_brand_name: "Vietcombank",
        code: "AVABC123456789",
        id: "api-42",
        reference_number: "FT123",
        transaction_content: "AVABC123456789 chuyen tien",
        transaction_date: "2026-08-02 10:00:00",
      })
    ).toMatchObject({
      accountNumber: "0123456789",
      amount: 50_000,
      bankReference: "FT123",
      paymentCode: "AVABC123456789",
      providerEventId: "api-42",
      source: "API",
      transferType: "in",
    });
  });

  it("uses a fake API response and sends the reconciliation bearer token", async () => {
    let requestHeaders: Headers | undefined;
    let requestUrl: URL | undefined;
    const fetchFn = (
      input: string | URL | Request,
      init: RequestInit | undefined
    ) => {
      requestUrl = new URL(input.toString());
      requestHeaders = new Headers(init?.headers);
      return Promise.resolve(
        Response.json({
          data: [
            {
              account_number: "0123456789",
              amount_in: 50_000,
              amount_out: 0,
              bank_brand_name: "Vietcombank",
              code: "AVABC123456789",
              id: "api-42",
              reference_number: "FT123",
              transaction_content: "AVABC123456789 chuyen tien",
              transaction_date: "2026-08-02 10:00:00",
            },
          ],
        })
      );
    };

    const events = await fetchSePayTransactions({
      configuration: {
        apiToken: "test-token",
        apiUrl: "https://example.test/transactions",
        receivingAccountNumber: "0123456789",
      },
      fetchFn,
      from: new Date("2026-08-02T09:00:00.000Z"),
      to: new Date("2026-08-02T10:00:00.000Z"),
    });

    expect(events).toHaveLength(1);
    expect(requestHeaders?.get("authorization")).toBe("Bearer test-token");
    expect(requestUrl?.searchParams.get("page")).toBe("1");
    expect(requestUrl?.searchParams.get("transaction_date_from")).toBe(
      "2026-08-02 09:00:00"
    );
    expect(requestUrl?.searchParams.get("transaction_date_to")).toBe(
      "2026-08-02 10:00:00"
    );
  });

  it("processes overlapping provider events concurrently through the shared processor", async () => {
    let activeProcessors = 0;
    let maximumActiveProcessors = 0;
    const result = await reconcileSePayTransactions({
      configuration: {
        apiToken: "test-token",
        apiUrl: "https://example.test/transactions",
        receivingAccountNumber: "0123456789",
      },
      fetchFn: concurrentFetchFn,
      now: new Date("2026-08-02T10:02:00.000Z"),
      processEvent: async (event) => {
        activeProcessors += 1;
        maximumActiveProcessors = Math.max(
          maximumActiveProcessors,
          activeProcessors
        );
        await Promise.resolve();
        activeProcessors -= 1;
        return { eventId: event.providerEventId, status: "CREDITED" };
      },
    });

    expect(result).toMatchObject({ credited: 2, fetched: 2 });
    expect(maximumActiveProcessors).toBe(2);
  });
});
