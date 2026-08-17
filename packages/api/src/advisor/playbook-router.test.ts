import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { call } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuditEvent, Context } from "../runtime/context";
import { defaultAdvisorPlaybookContent } from "./playbook";
import { advisorPlaybookRouter } from "./playbook-router";

const PLAYBOOK_ID = "00000000-0000-4000-8000-000000000001";
const SUB_CATEGORY_ID = "00000000-0000-4000-8000-000000000002";
const FIXED_NOW = new Date("2026-08-18T00:00:00.000Z");

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    insert: vi.fn(),
    query: {
      advisorPlaybook: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      subCategory: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    transaction: vi.fn(),
    update: vi.fn(),
  },
}));

const category = {
  id: SUB_CATEGORY_ID,
  name: "Account setup",
  parentCategory: {
    id: "00000000-0000-4000-8000-000000000003",
    name: "Digital services",
    status: "ACTIVE" as const,
  },
  status: "ACTIVE" as const,
};

const createDraft = (overrides: Record<string, unknown> = {}) => ({
  archivedAt: null,
  content: defaultAdvisorPlaybookContent(),
  createdAt: FIXED_NOW,
  id: PLAYBOOK_ID,
  lastTestedAt: null,
  publishedAt: null,
  scenarioResults: [],
  status: "DRAFT" as const,
  subCategory: category,
  subCategoryId: SUB_CATEGORY_ID,
  updatedAt: FIXED_NOW,
  version: 1,
  ...overrides,
});

const createContext = (
  role: (typeof ACCOUNT_ROLE)[keyof typeof ACCOUNT_ROLE],
  auditEvents: AuditEvent[] = [],
  providerState: "ACTIVE" | "DISABLED" | "UNAVAILABLE" = "ACTIVE",
  twoFactorEnabled = true
): Context => ({
  advisorProvider: {
    activateConfiguration: vi.fn(),
    disableConfiguration: vi.fn(),
    getStatus: vi.fn(() =>
      Promise.resolve({
        configured: providerState !== "DISABLED",
        contractVerifiedAt:
          providerState === "ACTIVE" ? FIXED_NOW.toISOString() : null,
        disabledAt: null,
        isPreview: true,
        isVisionCapable: true,
        keyLastFour: providerState === "DISABLED" ? null : "cret",
        lastCheckedAt: FIXED_NOW.toISOString(),
        lastErrorCode: null,
        lastErrorMessage: null,
        model: "qwen/qwen3.6-27b",
        provider: "groq" as const,
        state: providerState,
        zdrVerifiedAt:
          providerState === "ACTIVE" ? FIXED_NOW.toISOString() : null,
      })
    ),
    markUnavailable: vi.fn(),
    testConfiguration: vi.fn(),
  },
  audit: {
    record: (event) => {
      auditEvents.push(event);
      return Promise.resolve();
    },
  },
  db: dbMock as unknown as Context["db"],
  session: {
    session: {
      createdAt: FIXED_NOW,
      expiresAt: new Date("2026-08-25T00:00:00.000Z"),
      id: "session-1",
      ipAddress: null,
      token: "session-token",
      updatedAt: FIXED_NOW,
      userAgent: null,
      userId: "admin-1",
    },
    user: {
      banExpires: null,
      banned: false,
      createdAt: FIXED_NOW,
      email: "admin@example.com",
      emailVerified: true,
      hasSeenSellerOnboarding: false,
      id: "admin-1",
      image: null,
      name: "Admin User",
      role,
      twoFactorEnabled,
      updatedAt: FIXED_NOW,
    },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.transaction.mockImplementation(
    (callback: (database: typeof dbMock) => Promise<unknown>) =>
      callback(dbMock)
  );
});

describe("Advisor Playbook Admin boundary", () => {
  it("rejects Buyers and Admins without 2FA", async () => {
    await expect(
      call(
        advisorPlaybookRouter.createDraft,
        { subCategoryId: SUB_CATEGORY_ID },
        { context: createContext(ACCOUNT_ROLE.BUYER) }
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      call(
        advisorPlaybookRouter.createDraft,
        { subCategoryId: SUB_CATEGORY_ID },
        { context: createContext(ACCOUNT_ROLE.ADMIN, [], "ACTIVE", false) }
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("creates the next immutable draft version for a Sub-Category", async () => {
    const auditEvents: AuditEvent[] = [];
    const created = createDraft({ version: 4 });
    dbMock.query.subCategory.findFirst.mockResolvedValue(category);
    dbMock.query.advisorPlaybook.findMany.mockResolvedValue([{ version: 3 }]);
    dbMock.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([created]),
      }),
    });

    await expect(
      call(
        advisorPlaybookRouter.createDraft,
        { subCategoryId: SUB_CATEGORY_ID },
        { context: createContext(ACCOUNT_ROLE.ADMIN, auditEvents) }
      )
    ).resolves.toMatchObject({
      status: "DRAFT",
      version: 4,
    });
    expect(auditEvents[0]).toMatchObject({
      action: "advisor.playbook.create",
      outcome: "SUCCESS",
      targetType: "ADVISOR_PLAYBOOK",
    });
  });

  it("blocks publish when the provider contract is unavailable and audits failure", async () => {
    const auditEvents: AuditEvent[] = [];
    dbMock.query.advisorPlaybook.findFirst.mockResolvedValue(createDraft());

    await expect(
      call(
        advisorPlaybookRouter.publish,
        { id: PLAYBOOK_ID },
        {
          context: createContext(
            ACCOUNT_ROLE.ADMIN,
            auditEvents,
            "UNAVAILABLE"
          ),
        }
      )
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

    expect(auditEvents).toMatchObject([
      {
        action: "advisor.playbook.publish",
        outcome: "FAILURE",
        targetId: PLAYBOOK_ID,
        targetType: "ADVISOR_PLAYBOOK",
      },
    ]);
    expect(dbMock.transaction).not.toHaveBeenCalled();
  });

  it("blocks publish when a required scenario fails", async () => {
    const auditEvents: AuditEvent[] = [];
    const content = defaultAdvisorPlaybookContent();
    const failingContent = {
      ...content,
      scenarios: content.scenarios.map((scenario, index) =>
        index === 0
          ? { ...scenario, expectedOutcome: "NO_MATCH" as const }
          : scenario
      ),
    };
    dbMock.query.advisorPlaybook.findFirst.mockResolvedValue(
      createDraft({ content: failingContent })
    );
    dbMock.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    await expect(
      call(
        advisorPlaybookRouter.publish,
        { id: PLAYBOOK_ID },
        { context: createContext(ACCOUNT_ROLE.ADMIN, auditEvents) }
      )
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

    expect(dbMock.transaction).not.toHaveBeenCalled();
    expect(auditEvents[0]).toMatchObject({
      action: "advisor.playbook.publish",
      outcome: "FAILURE",
    });
  });

  it("publishes a passing draft and archives the previous published version atomically", async () => {
    const auditEvents: AuditEvent[] = [];
    const updated = createDraft({
      publishedAt: FIXED_NOW,
      scenarioResults: [],
      status: "PUBLISHED" as const,
    });
    dbMock.query.advisorPlaybook.findFirst.mockResolvedValue(createDraft());
    dbMock.transaction.mockImplementation((callback) => {
      dbMock.query.subCategory.findFirst.mockResolvedValue(category);
      dbMock.update
        .mockReturnValueOnce({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        })
        .mockReturnValueOnce({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updated]),
            }),
          }),
        });
      return callback(dbMock);
    });

    await expect(
      call(
        advisorPlaybookRouter.publish,
        { id: PLAYBOOK_ID },
        { context: createContext(ACCOUNT_ROLE.ADMIN, auditEvents) }
      )
    ).resolves.toMatchObject({
      id: PLAYBOOK_ID,
      status: "PUBLISHED",
      version: 1,
    });
    expect(auditEvents[0]).toMatchObject({
      action: "advisor.playbook.publish",
      outcome: "SUCCESS",
      targetType: "ADVISOR_PLAYBOOK",
    });
  });

  it("rejects publishing for hidden taxonomy and preserves the draft", async () => {
    const hiddenCategory = {
      ...category,
      status: "HIDDEN" as const,
    };
    dbMock.query.advisorPlaybook.findFirst.mockResolvedValue(createDraft());
    dbMock.transaction.mockImplementation((callback) => {
      dbMock.query.subCategory.findFirst.mockResolvedValue(hiddenCategory);
      return callback(dbMock);
    });

    await expect(
      call(
        advisorPlaybookRouter.publish,
        { id: PLAYBOOK_ID },
        { context: createContext(ACCOUNT_ROLE.ADMIN) }
      )
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(dbMock.update).not.toHaveBeenCalled();
  });

  it("archives a version without deleting its historical content", async () => {
    const auditEvents: AuditEvent[] = [];
    const archived = createDraft({
      archivedAt: FIXED_NOW,
      status: "ARCHIVED" as const,
    });
    dbMock.query.advisorPlaybook.findFirst.mockResolvedValue(createDraft());
    dbMock.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([archived]),
        }),
      }),
    });

    await expect(
      call(
        advisorPlaybookRouter.archive,
        { id: PLAYBOOK_ID },
        { context: createContext(ACCOUNT_ROLE.ADMIN, auditEvents) }
      )
    ).resolves.toMatchObject({
      id: PLAYBOOK_ID,
      status: "ARCHIVED",
    });
    expect(auditEvents[0]).toMatchObject({
      action: "advisor.playbook.archive",
      outcome: "SUCCESS",
    });
  });
});
