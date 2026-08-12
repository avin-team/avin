import { db } from "@avin/db";

import { processSePayEvent } from "./processor";
import type { NormalizedSePayEvent } from "./sepay";

export interface SePayTransactionsConfiguration {
  apiUrl: string;
  apiToken: string;
  receivingAccountNumber: string;
}

export interface ReconciliationResult {
  credited: number;
  duplicate: number;
  fetched: number;
  skipped: number;
  unmatched: number;
}

const TRANSACTIONS_API_PAGE_SIZE = 100;
const MAX_TRANSACTIONS_API_PAGES = 100;
const RECONCILIATION_LOOKBACK_MS = 24 * 60 * 60_000;

type FetchFunction = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("SePay transaction must be an object");
  }
  return value as Record<string, unknown>;
};

const formatSePayApiDate = (date: Date): string =>
  date.toISOString().slice(0, 19).replace("T", " ");

const readString = (
  record: Record<string, unknown>,
  ...keys: string[]
): string => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isInteger(value)) {
      return String(value);
    }
  }
  throw new Error(`SePay transaction is missing ${keys[0]}`);
};

const readOptionalString = (
  record: Record<string, unknown>,
  ...keys: string[]
): string | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
};

const readAmount = (
  record: Record<string, unknown>,
  ...keys: string[]
): number => {
  for (const key of keys) {
    const value = record[key];
    let amount = Number.NaN;
    if (typeof value === "number") {
      amount = value;
    } else if (typeof value === "string") {
      amount = Number(value);
    }
    if (Number.isInteger(amount) && amount >= 0) {
      return amount;
    }
  }
  return 0;
};

const parseTransactionDate = (value: string): Date => {
  const normalizedValue = value.includes("T") ? value : value.replace(" ", "T");
  const withTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/u.test(normalizedValue)
    ? normalizedValue
    : `${normalizedValue}Z`;
  const date = new Date(withTimezone);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("SePay transaction date is invalid");
  }
  return date;
};

export const normalizeSePayApiTransaction = (
  payload: unknown
): NormalizedSePayEvent => {
  const record = asRecord(payload);
  const amountIn = readAmount(record, "amount_in", "amountIn");
  const amountOut = readAmount(record, "amount_out", "amountOut");
  const amount = amountIn > 0 ? amountIn : amountOut;

  return {
    accountNumber: readString(record, "account_number", "accountNumber"),
    amount,
    bankReference: readOptionalString(
      record,
      "reference_number",
      "referenceCode",
      "reference_code"
    ),
    content: readOptionalString(record, "transaction_content", "content") ?? "",
    currency: (readOptionalString(record, "currency") ?? "VND").toUpperCase(),
    gateway: readString(record, "bank_brand_name", "gateway"),
    paymentCode: readOptionalString(record, "code")?.toUpperCase() ?? null,
    providerEventId: readString(record, "id"),
    rawBody: JSON.stringify(record),
    rawPayload: record,
    source: "API",
    transactionAt: parseTransactionDate(
      readString(record, "transaction_date", "transactionDate")
    ),
    transferType: amountIn > 0 ? "in" : "out",
  };
};

const extractTransactions = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }
  const record = asRecord(payload);
  const { data } = record;
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const nested = data as Record<string, unknown>;
    if (Array.isArray(nested.transactions)) {
      return nested.transactions;
    }
    if (Array.isArray(nested.items)) {
      return nested.items;
    }
  }
  if (Array.isArray(record.transactions)) {
    return record.transactions;
  }
  return [];
};

export const fetchSePayTransactions = async ({
  configuration,
  fetchFn = fetch,
  from,
  to,
}: {
  configuration: SePayTransactionsConfiguration;
  fetchFn?: FetchFunction;
  from: Date;
  to: Date;
}): Promise<NormalizedSePayEvent[]> => {
  const transactions: unknown[] = [];
  for (let page = 1; ; page += 1) {
    const url = new URL(configuration.apiUrl);
    url.searchParams.set("page", String(page));
    url.searchParams.set("transaction_date_from", formatSePayApiDate(from));
    url.searchParams.set("transaction_date_to", formatSePayApiDate(to));
    url.searchParams.set("per_page", String(TRANSACTIONS_API_PAGE_SIZE));

    const response = await fetchFn(url, {
      headers: {
        Authorization: `Bearer ${configuration.apiToken}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`SePay Transactions API returned ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    const pageTransactions = extractTransactions(payload);
    transactions.push(...pageTransactions);
    if (pageTransactions.length < TRANSACTIONS_API_PAGE_SIZE) {
      break;
    }
    if (page >= MAX_TRANSACTIONS_API_PAGES) {
      throw new Error("SePay Transactions API pagination limit was exceeded");
    }
  }

  return transactions.map(normalizeSePayApiTransaction);
};

export const reconcileSePayTransactions = async ({
  configuration,
  database = db,
  fetchFn = fetch,
  now = new Date(),
  processEvent = processSePayEvent,
}: {
  configuration: SePayTransactionsConfiguration;
  database?: typeof db;
  fetchFn?: FetchFunction;
  now?: Date;
  processEvent?: typeof processSePayEvent;
}): Promise<ReconciliationResult> => {
  const events = await fetchSePayTransactions({
    configuration,
    fetchFn,
    from: new Date(now.getTime() - RECONCILIATION_LOOKBACK_MS),
    to: now,
  });
  const result: ReconciliationResult = {
    credited: 0,
    duplicate: 0,
    fetched: events.length,
    skipped: 0,
    unmatched: 0,
  };

  const statuses = await Promise.all(
    events.map(async (event) => {
      try {
        const processed = await processEvent(
          event,
          { receivingAccountNumber: configuration.receivingAccountNumber },
          now,
          database
        );
        return processed.status;
      } catch {
        return "SKIPPED" as const;
      }
    })
  );

  for (const status of statuses) {
    if (status === "CREDITED") {
      result.credited += 1;
    } else if (status === "DUPLICATE") {
      result.duplicate += 1;
    } else if (status === "UNMATCHED") {
      result.unmatched += 1;
    } else {
      result.skipped += 1;
    }
  }

  return result;
};
