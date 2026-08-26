import {
  protectionProviderApplication,
  protectionProviderDepositIntent,
} from "@avin/db/schema/protection";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NormalizedSePayEvent } from "../wallet/sepay";

vi.mock("../notifications/notification", () => ({
  createNotificationEvent: vi.fn(() => Promise.resolve()),
  listNotificationRecipientsByRole: vi.fn(() => Promise.resolve([])),
}));

const { createNotificationEvent, listNotificationRecipientsByRole } =
  await import("../notifications/notification");
const { processProviderDepositEvent } =
  await import("./provider-deposit-intent-service");

type Database = Parameters<typeof processProviderDepositEvent>[0];

const now = new Date("2026-08-26T09:16:17.760Z");

const createDatabase = () => {
  const application = {
    id: "application-1",
    policyAcceptedAt: new Date("2026-08-26T09:15:43.106Z"),
    providerUserId: "provider-1",
    revisionCount: 0,
    status: "DRAFT",
  };
  const intent = {
    amount: 1_000_000,
    applicationId: application.id,
    createdAt: new Date("2026-08-26T09:15:43.509Z"),
    expiresAt: new Date("2026-08-27T09:15:43.509Z"),
    id: "deposit-intent-1",
    kind: "APPLICATION",
    matchedAmount: null,
    matchedAt: null,
    matchedEventId: null,
    paymentCode: "AVPROVIDER123456",
    policyVersionId: "policy-1",
    profileId: null,
    providerUserId: application.providerUserId,
    status: "PENDING",
  };

  const select = vi.fn(() => {
    let table: unknown;
    const query = {
      for: vi.fn(() => query),
      from: vi.fn((nextTable: unknown) => {
        table = nextTable;
        return query;
      }),
      limit: vi.fn(() => {
        if (table === protectionProviderDepositIntent) {
          return Promise.resolve([intent]);
        }
        if (table === protectionProviderApplication) {
          return Promise.resolve([application]);
        }
        return Promise.resolve([]);
      }),
      where: vi.fn(() => query),
    };
    return query;
  });

  const update = vi.fn((table: unknown) => ({
    set: vi.fn((values: Record<string, unknown>) => ({
      where: vi.fn(() => {
        if (table === protectionProviderApplication) {
          Object.assign(application, values);
          return Promise.resolve();
        }
        Object.assign(intent, values);
        return {
          returning: vi.fn(() => Promise.resolve([intent])),
        };
      }),
    })),
  }));

  return {
    application,
    database: { select, update } as unknown as Database,
    intent,
  };
};

const createEvent = (
  intent: ReturnType<typeof createDatabase>["intent"]
): NormalizedSePayEvent => ({
  accountNumber: "0123456789",
  amount: intent.amount,
  bankReference: "bank-reference-1",
  content: intent.paymentCode,
  currency: "VND",
  gateway: "SEPAY",
  paymentCode: intent.paymentCode,
  providerEventId: "sepay-event-1",
  rawPayload: {},
  source: "WEBHOOK",
  transactionAt: now,
  transferType: "in",
});

describe("Provider deposit intent matching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("moves a complete draft application into the review queue after an exact match", async () => {
    const { application, database, intent } = createDatabase();

    await expect(
      processProviderDepositEvent({
        database,
        event: createEvent(intent),
        now,
        receivingAccountNumber: "0123456789",
      })
    ).resolves.toEqual({ intentId: intent.id, matched: true });

    expect(application).toMatchObject({
      bondAmount: intent.amount,
      depositIntentId: intent.id,
      recognizedBondAmount: intent.amount,
      status: "PENDING_REVIEW",
      submittedAt: now,
    });
    expect(createNotificationEvent).toHaveBeenCalledOnce();
    expect(listNotificationRecipientsByRole).toHaveBeenCalledOnce();
  });
});
