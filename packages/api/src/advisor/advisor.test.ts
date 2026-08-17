import { describe, expect, it, vi } from "vitest";

import type { Context } from "../runtime/context";
import {
  ADVISOR_USER_SESSION_DAYS,
  ADVISOR_VISITOR_SESSION_HOURS,
  advisorRecommendationPayloadSchema,
  cleanupExpiredAdvisorSessions,
  getAdvisorSessionExpiry,
  orchestrateAdvisorTurn,
  parseAdvisorRecommendationWithRepair,
} from "./advisor";
import type { AdvisorSessionRecord } from "./advisor";
import { defaultAdvisorPlaybookContent } from "./playbook";

const SUB_CATEGORY_ID = "00000000-0000-4000-8000-000000000001";
const PLAYBOOK_ID = "00000000-0000-4000-8000-000000000002";
const LISTING_ID = "00000000-0000-4000-8000-000000000003";
const PACKAGE_ID = "00000000-0000-4000-8000-000000000004";
const SELLER_ID = "seller-1";
const NOW = new Date("2026-08-18T00:00:00.000Z");

const playbook = {
  content: defaultAdvisorPlaybookContent(),
  id: PLAYBOOK_ID,
  status: "PUBLISHED" as const,
  subCategory: {
    id: SUB_CATEGORY_ID,
    name: "Account setup",
    parentCategory: {
      name: "Digital services",
      slug: "digital-services",
      status: "ACTIVE" as const,
    },
    slug: "account-setup",
    status: "ACTIVE" as const,
  },
};

const candidate = {
  category: {
    parentCategory: { status: "ACTIVE" as const },
    status: "ACTIVE" as const,
  },
  completedOrderCount: 4,
  description: "Thiết lập account an toàn cho website",
  id: LISTING_ID,
  priceAmount: 100_000,
  processingTimeHours: 24,
  ratingCount: 12,
  ratingScore: "4.8",
  seller: { id: SELLER_ID, name: "Seller One" },
  sellerId: SELLER_ID,
  sellerProfile: { storefrontName: "Seller One Studio" },
  servicePackages: [
    {
      id: PACKAGE_ID,
      name: "Gói cơ bản",
      priceAmount: 120_000,
      processingTimeHours: 24,
      warrantyPolicy: { kind: "NO_WARRANTY" },
    },
  ],
  slug: "account-setup-service",
  title: "Thiết lập tài khoản website",
};

const session = (overrides: Partial<AdvisorSessionRecord> = {}) =>
  ({
    answers: {},
    consentId: "00000000-0000-4000-8000-000000000005",
    createdAt: NOW,
    expiresAt: new Date("2026-08-19T00:00:00.000Z"),
    generationStartedAt: null,
    generationStatus: "IDLE" as const,
    id: "00000000-0000-4000-8000-000000000006",
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
    visitorCapabilityHash: "hash",
    ...overrides,
  }) satisfies AdvisorSessionRecord;

const database = {
  query: {
    advisorPlaybook: {
      findMany: vi.fn().mockResolvedValue([playbook]),
    },
    listing: {
      findMany: vi.fn().mockResolvedValue([candidate]),
    },
  },
} as unknown as Context["db"];

describe("Advisor text-only orchestration", () => {
  it("asks one required question, then returns a live SERVICE recommendation", async () => {
    const first = await orchestrateAdvisorTurn({
      database,
      session: session(),
      text: "Tôi cần hỗ trợ account",
    });

    expect(first.response.kind).toBe("QUESTION");
    expect(first.response.question?.id).toBe("scope");
    expect(first.response.question?.options).toEqual(
      expect.arrayContaining([{ label: "Cá nhân", value: "personal" }])
    );
    expect(first.pinnedPlaybookId).toBe(PLAYBOOK_ID);

    const second = await orchestrateAdvisorTurn({
      database,
      session: session({
        answers: {},
        pendingQuestionId: first.pendingQuestionId,
        pinnedPlaybookId: first.pinnedPlaybookId,
        pinnedSubCategoryId: first.pinnedSubCategoryId,
        serviceNeed: first.serviceNeed,
      }),
      text: "Cá nhân",
    });

    expect(second.response.kind).toBe("RECOMMENDATION");
    expect(second.response.recommendation?.listings).toHaveLength(1);
    expect(second.response.recommendation?.listings[0]).toMatchObject({
      id: LISTING_ID,
      servicePackage: { id: PACKAGE_ID },
    });
  });

  it("blocks an exclusion without producing a recommendation", async () => {
    const result = await orchestrateAdvisorTurn({
      database,
      session: session(),
      text: "Tôi quên password của account",
    });

    expect(result.response).toMatchObject({
      kind: "NO_MATCH",
      recommendation: null,
    });
    expect(result.response.message).toContain("loại trừ");
  });

  it("repairs structured output at most once", () => {
    const valid = {
      isAiGenerated: true as const,
      label: "Gợi ý do AI tạo",
      listings: [],
      subCategoryId: SUB_CATEGORY_ID,
      subCategoryName: "Account setup",
    };
    const repaired = parseAdvisorRecommendationWithRepair({
      raw: { invalid: true },
      repair: () => ({
        ...valid,
        listings: [
          {
            completedOrderCount: 4,
            id: LISTING_ID,
            listingPath: "/listing/account-setup-service",
            priceAmount: 120_000,
            processingTimeHours: 24,
            ratingCount: 12,
            ratingScore: 4.8,
            reasons: ["Phù hợp với nhóm Account setup."],
            seller: { id: SELLER_ID, name: "Seller One" },
            servicePackage: {
              id: PACKAGE_ID,
              name: "Gói cơ bản",
              priceAmount: 120_000,
              processingTimeHours: 24,
              warrantyPolicy: { kind: "NO_WARRANTY" },
            },
            slug: "account-setup-service",
            title: "Thiết lập tài khoản website",
            warrantyPolicy: { kind: "NO_WARRANTY" },
          },
        ],
      }),
    });

    expect(advisorRecommendationPayloadSchema.safeParse(repaired).success).toBe(
      true
    );
  });

  it("uses short Visitor expiry and longer User expiry", () => {
    const visitorExpiry = getAdvisorSessionExpiry(NOW, { userId: null });
    const userExpiry = getAdvisorSessionExpiry(NOW, { userId: "user-1" });

    expect(visitorExpiry.getTime() - NOW.getTime()).toBe(
      ADVISOR_VISITOR_SESSION_HOURS * 60 * 60 * 1000
    );
    expect(userExpiry.getTime() - NOW.getTime()).toBe(
      ADVISOR_USER_SESSION_DAYS * 24 * 60 * 60 * 1000
    );
  });

  it("reconciles expired sessions idempotently", async () => {
    const findMany = vi
      .fn()
      .mockResolvedValueOnce([{ id: "expired-session" }])
      .mockResolvedValueOnce([]);
    const returning = vi.fn().mockResolvedValue([{ id: "expired-session" }]);
    const cleanupDatabase = {
      delete: vi.fn(() => ({
        where: vi.fn(() => ({ returning })),
      })),
      query: { advisorSession: { findMany } },
    } as unknown as Context["db"];

    await expect(
      cleanupExpiredAdvisorSessions({ database: cleanupDatabase, now: NOW })
    ).resolves.toBe(1);
    await expect(
      cleanupExpiredAdvisorSessions({ database: cleanupDatabase, now: NOW })
    ).resolves.toBe(0);
    expect(cleanupDatabase.delete).toHaveBeenCalledTimes(1);
  });
});
