import { createHash } from "node:crypto";

import { ACCOUNT_ROLE } from "@avin/auth/permissions";
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
  generationStartedAt: null,
  generationStatus: "IDLE" as const,
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

const createUserSession = (userId: string): NonNullable<Context["session"]> =>
  ({
    session: {
      createdAt: NOW,
      expiresAt: new Date("2026-08-25T00:00:00.000Z"),
      id: "auth-session-1",
      ipAddress: null,
      token: "auth-session-token",
      updatedAt: NOW,
      userAgent: null,
      userId,
    },
    user: {
      banExpires: null,
      banReason: null,
      banned: false,
      createdAt: NOW,
      email: `${userId}@example.com`,
      emailVerified: true,
      hasSeenSellerOnboarding: false,
      id: userId,
      image: null,
      name: "Advisor Test User",
      role: ACCOUNT_ROLE.BUYER,
      twoFactorEnabled: false,
      updatedAt: NOW,
    },
  }) satisfies NonNullable<Context["session"]>;

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
    delete: vi.fn(),
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

const createContext = (
  sessionOverride: Context["session"] = null
): Context => ({
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
  session: sessionOverride,
});

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.transaction.mockImplementation(
    (callback: (database: typeof dbMock) => Promise<unknown>) =>
      callback(dbMock)
  );
  dbMock.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([session]),
      }),
    }),
  });
  dbMock.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi
        .fn()
        .mockResolvedValue([{ acceptedAt: NOW, id: CONSENT_ID }]),
    }),
  });
  dbMock.delete.mockReturnValue({
    where: vi.fn().mockResolvedValue(null),
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

  it("renews a Visitor session from the fixed activity clock", async () => {
    dbMock.query.advisorSession.findFirst.mockResolvedValue(session);
    dbMock.query.advisorMessage.findMany.mockResolvedValue([]);
    dbMock.query.advisorRecommendation.findMany.mockResolvedValue([]);
    const updates: Record<string, unknown>[] = [];
    dbMock.update.mockReturnValue({
      set: vi.fn().mockImplementation((values: Record<string, unknown>) => {
        updates.push(values);
        return {
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([session]),
          }),
        };
      }),
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T06:00:00.000Z"));

    try {
      await call(
        advisorSessionRouter.get,
        { sessionId: SESSION_ID, visitorCapability: CAPABILITY },
        { context: createContext() }
      );
    } finally {
      vi.useRealTimers();
    }

    expect(updates[0]).toMatchObject({
      expiresAt: new Date("2026-08-19T06:00:00.000Z"),
      updatedAt: new Date("2026-08-18T06:00:00.000Z"),
    });
  });

  it("requires an explicit authenticated link and keeps sign-in alone isolated", async () => {
    dbMock.query.advisorSession.findFirst.mockResolvedValue(session);

    await expect(
      call(
        advisorSessionRouter.get,
        { sessionId: SESSION_ID, visitorCapability: CAPABILITY },
        { context: createContext(createUserSession("different-user")) }
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const updates: Record<string, unknown>[] = [];
    dbMock.update.mockReturnValue({
      set: vi.fn().mockImplementation((values: Record<string, unknown>) => {
        updates.push(values);
        return {
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                ...session,
                expiresAt: new Date("2026-09-17T00:00:00.000Z"),
                userId: "user-1",
                visitorCapabilityHash: null,
              },
            ]),
          }),
        };
      }),
    });

    const result = await call(
      advisorSessionRouter.link,
      { sessionId: SESSION_ID, visitorCapability: CAPABILITY },
      { context: createContext(createUserSession("user-1")) }
    );

    expect(result).toMatchObject({ id: SESSION_ID, linked: true });
    expect(updates[0]).toMatchObject({
      userId: "user-1",
      visitorCapabilityHash: null,
    });
  });

  it("rejects a second turn while generation is active", async () => {
    dbMock.query.advisorSession.findFirst.mockResolvedValue({
      ...session,
      generationStatus: "RUNNING",
    });
    let updateCount = 0;
    dbMock.update.mockImplementation(() => {
      updateCount += 1;
      return {
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi
              .fn()
              .mockResolvedValue(
                updateCount === 1
                  ? [{ ...session, generationStatus: "RUNNING" }]
                  : []
              ),
          }),
        }),
      };
    });

    await expect(
      call(
        advisorSessionRouter.turn,
        {
          idempotencyKey: "active-turn-key",
          sessionId: SESSION_ID,
          text: "Tôi cần hỗ trợ account",
          visitorCapability: CAPABILITY,
        },
        { context: createContext() }
      )
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("replays a completed turn for the same idempotency key", async () => {
    const previousResponse = {
      browsePath: null,
      completed: false,
      kind: "QUESTION" as const,
      message: "Cần thêm thông tin.",
      question: {
        allowFreeText: true as const,
        id: "scope",
        options: [{ label: "Cá nhân", value: "personal" }],
        prompt: "Bạn cần cho mục đích nào?",
      },
      recommendation: null,
    };
    const idempotentSession = {
      ...session,
      lastIdempotencyKey: "same-turn-key",
      lastTurnResponse: previousResponse,
    };
    dbMock.query.advisorSession.findFirst.mockResolvedValue(idempotentSession);
    dbMock.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([idempotentSession]),
        }),
      }),
    });

    const result = await call(
      advisorSessionRouter.turn,
      {
        idempotencyKey: "same-turn-key",
        sessionId: SESSION_ID,
        text: "Tôi cần hỗ trợ account",
        visitorCapability: CAPABILITY,
      },
      { context: createContext() }
    );

    expect(result.response).toEqual(previousResponse);
    expect(dbMock.transaction).not.toHaveBeenCalled();
    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it("deletes the owned session through the cascade boundary", async () => {
    dbMock.query.advisorSession.findFirst.mockResolvedValue(session);

    const result = await call(
      advisorSessionRouter.delete,
      { sessionId: SESSION_ID, visitorCapability: CAPABILITY },
      { context: createContext() }
    );

    expect(result).toEqual({ deleted: true, id: SESSION_ID });
    expect(dbMock.delete).toHaveBeenCalledTimes(1);
  });
});
