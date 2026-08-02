import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { z } from "zod";

const PAYMENT_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const PAYMENT_CODE_LENGTH = 12;
const PAYMENT_CODE_PREFIX = "AV";
const DEFAULT_SIGNATURE_WINDOW_SECONDS = 5 * 60;
export const DEPOSIT_MINIMUM_AMOUNT = 5000;

const sePayWebhookPayloadSchema = z.looseObject({
  accountNumber: z.string().min(1),
  code: z.string().nullable().optional(),
  content: z.string().default(""),
  currency: z.string().default("VND"),
  gateway: z.string().default(""),
  id: z.union([z.string().min(1), z.number().int()]),
  referenceCode: z.string().nullable().optional(),
  transactionDate: z.string().min(1),
  transferAmount: z.coerce.number().int().nonnegative(),
  transferType: z.enum(["in", "out"]),
});

export interface VietQrUrlInput {
  accountName: string;
  accountNumber: string;
  amount: number;
  bank: string;
  paymentCode: string;
}

export interface NormalizedSePayEvent {
  accountNumber: string;
  amount: number;
  bankReference: string | null;
  content: string;
  currency: string;
  gateway: string;
  paymentCode: string | null;
  providerEventId: string;
  rawPayload: Record<string, unknown>;
  rawBody?: string;
  source: "API" | "WEBHOOK";
  transactionAt: Date;
  transferType: "in" | "out";
}

export const generatePaymentCode = (
  randomByte: () => number = () => randomBytes(1)[0] ?? 0
): string => {
  const suffix = Array.from({ length: PAYMENT_CODE_LENGTH }, () => {
    const index = randomByte() % PAYMENT_CODE_ALPHABET.length;
    return PAYMENT_CODE_ALPHABET[index] ?? "A";
  }).join("");

  return `${PAYMENT_CODE_PREFIX}${suffix}`;
};

export const buildVietQrUrl = ({
  accountNumber,
  amount,
  bank,
  paymentCode,
}: VietQrUrlInput): string => {
  const url = new URL("https://vietqr.app/img");
  url.searchParams.set("acc", accountNumber);
  url.searchParams.set("bank", bank);
  url.searchParams.set("amount", String(amount));
  url.searchParams.set("des", paymentCode);
  return url.toString();
};

export const createSePaySignature = ({
  body,
  secret,
  timestamp,
}: {
  body: string;
  secret: string;
  timestamp: number;
}): string =>
  `sha256=${createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex")}`;

export const verifySePaySignature = ({
  body,
  maxAgeSeconds = DEFAULT_SIGNATURE_WINDOW_SECONDS,
  now = new Date(),
  secret,
  signature,
  timestamp,
}: {
  body: string;
  maxAgeSeconds?: number;
  now?: Date;
  secret: string;
  signature: string;
  timestamp: number;
}): boolean => {
  if (!Number.isInteger(timestamp)) {
    return false;
  }

  const nowSeconds = Math.floor(now.getTime() / 1000);
  if (Math.abs(nowSeconds - timestamp) > maxAgeSeconds) {
    return false;
  }

  const expected = Buffer.from(
    createSePaySignature({ body, secret, timestamp }),
    "utf-8"
  );
  const received = Buffer.from(signature, "utf-8");

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
};

const parseProviderDate = (value: string): Date => {
  const normalizedValue = value.includes("T") ? value : value.replace(" ", "T");
  const withTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/u.test(normalizedValue)
    ? normalizedValue
    : `${normalizedValue}Z`;
  const parsed = new Date(withTimezone);

  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError("SePay transactionDate is invalid");
  }

  return parsed;
};

export const normalizeSePayWebhookPayload = (
  payload: unknown
): NormalizedSePayEvent => {
  const parsed = sePayWebhookPayloadSchema.parse(payload);
  const rawPayload = parsed as Record<string, unknown>;
  const paymentCode = parsed.code?.trim().toUpperCase() || null;
  const bankReference = parsed.referenceCode?.trim() || null;

  return {
    accountNumber: parsed.accountNumber.trim(),
    amount: parsed.transferAmount,
    bankReference,
    content: parsed.content,
    currency: parsed.currency.trim().toUpperCase(),
    gateway: parsed.gateway.trim(),
    paymentCode,
    providerEventId: String(parsed.id),
    rawPayload,
    source: "WEBHOOK",
    transactionAt: parseProviderDate(parsed.transactionDate),
    transferType: parsed.transferType,
  };
};

export const isAvinPaymentCode = (paymentCode: string | null): boolean =>
  paymentCode !== null && /^AV[A-Z0-9]{12}$/u.test(paymentCode);

export const validateDepositAmount = (amount: number): void => {
  if (!Number.isInteger(amount) || amount < DEPOSIT_MINIMUM_AMOUNT) {
    throw new Error("Số tiền nạp tối thiểu là 5.000 VND");
  }
};
