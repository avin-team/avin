import { createHash } from "node:crypto";

import { call } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Context } from "../runtime/context";
import { advisorConsentRouter, advisorSessionRouter } from "./advisor-router";
import { defaultAdvisorPlaybookContent } from "./playbook";

const CAPABILITY = "visitor-capability-".padEnd(64, "x");
const CAPABILITY_HASH = createHash("sha256").update(CAPABILITY).digest("hex");
const SESSION_ID = "00000000-0000-4000-8000-000000000001";
const CONSENT_ID = "00000000-0000-4000-8000-000000000002";
const NOW = new Date("2026-08-18T00:00:00.000Z");

const session = {
  answers: {},
  consentId: CONSENT_ID,
  createdAt: NOW,
  expiresAt: new Date("2026-08-19T00:00:00.000Z"),
  id: SESSION_ID,
  lastIdempotencyKey: null,
  lastTurnResponse: null,
  pendingQuestionId: null,
  pinnedPlaybookId: null,
  pinnedSubCategoryId: null,
  serviceNeed: "",
  status: "ACTIVE" as const,
  turnCount: 0,
  updatedAt: NOW,
  userId: null,
  visitorCapabilityHash: CAPABILITY_HASH,
};

const subCategory = {
  id: "00000000-0000-4000-8000-000000000003",
  name: "Account setup",
  parentCategory: {
    name: "Digital services",
    slug: "digital-services",
    status: "ACTIVE" as const,
  },
  slug: "account-setup",
  status: "ACTIVE" as const,
};

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    insert: vi.fn(),
    query: {
      advisorConsent: { findFirst: vi.fn() },
      advisorMessage: { findMany: vi.fn() },
      advisorPlaybook: { findMany: vi.fn() },
      advisorRecommendation: { findMany: vi.fn() },
      advisorSession: { findFirst: vi.fn() },
      listing: { findMany: vi.fn() },
    },
    transaction: vi.fn(),
    update: vi.fn(),
  },
}));

const createContext = (): Context => ({
  advisorProvider: {
    activateConfiguration: vi.fn(),
    disableConfiguration: vi.fn(),
    getStatus: vi.fn(() =>
      Promise.resolve({
        contractVerifiedAt: NOW.toISOString(),
        state: "ACTIVE",
      } as never)
    ),
    markUnavailable: vi.fn(),
    testConfiguration: vi.fn(),
  },
  audit: { record: vi.fn(() => Promise.resolve()) },
  db: dbMock as unknown as Context["db"],
  session: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.transaction.mockImplementation(
    (callback: (database: typeof dbMock) => Promise<unknown>) =>
      callback(dbMock)
  );
  dbMock.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  });
  dbMock.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi
        .fn()
        .mockResolvedValue([{ acceptedAt: NOW, id: CONSENT_ID }]),
    }),
  });
});

describe("Advisor public session boundary", () => {
  it("hashes Visitor capability before recording versioned consent", async () => {
    let inserted: Record<string, unknown> | undefined;
    dbMock.insert.mockReturnValue({
      values: vi.fn().mockImplementation((values: Record<string, unknown>) => {
        inserted = values;
        return {
          returning: vi
            .fn()
            .mockResolvedValue([{ acceptedAt: NOW, id: CONSENT_ID }]),
        };
      }),
    });

    await call(
      advisorConsentRouter.record,
      { version: "v1", visitorCapability: CAPABILITY },
      { context: createContext() }
    );

    expect(inserted).toMatchObject({ version: "v1" });
    expect(inserted?.visitorCapabilityHash).toBe(CAPABILITY_HASH);
    expect(JSON.stringify(inserted)).not.toContain(CAPABILITY);
  });

  it("rejects a consent owned by another Visitor capability", async () => {
    dbMock.query.advisorConsent.findFirst.mockResolvedValue({
      id: CONSENT_ID,
      userId: null,
      version: "v1",
      visitorCapabilityHash: "another-hash",
    });

    await expect(
      call(
        advisorSessionRouter.create,
        { consentId: CONSENT_ID, visitorCapability: CAPABILITY },
        { context: createContext() }
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it("persists a user turn without exposing a commerce mutation", async () => {
    dbMock.query.advisorSession.findFirst.mockResolvedValue(session);
    dbMock.query.advisorPlaybook.findMany.mockResolvedValue([
      {
        content: defaultAdvisorPlaybookContent(),
        id: "00000000-0000-4000-8000-000000000004",
        status: "PUBLISHED",
        subCategory,
      },
    ]);
    dbMock.query.listing.findMany.mockResolvedValue([]);
    dbMock.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    });

    const result = await call(
      advisorSessionRouter.turn,
      {
        idempotencyKey: "turn-key-1",
        sessionId: SESSION_ID,
        text: "Tôi cần hỗ trợ account",
        visitorCapability: CAPABILITY,
      },
      { context: createContext() }
    );

    expect(result.response.kind).toBe("QUESTION");
    expect(dbMock.insert).toHaveBeenCalledTimes(2);
    expect(dbMock.query).not.toHaveProperty("cart");
  });
});
