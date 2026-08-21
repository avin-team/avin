import {
  protectionProviderProfile,
  protectionRiskIdentifier,
  protectionRiskReport,
} from "@avin/db/schema/protection";
import { afterEach, describe, expect, it } from "vitest";

import {
  assertRiskIdentifierLookupAllowed,
  getPublicRiskStatistics,
  RISK_IDENTIFIER_LOOKUPS_PER_MINUTE,
  resetRiskIdentifierLookupRateLimitForTests,
  searchPublicRiskIdentifiers,
} from "./risk-lookup";
import {
  normalizeRiskIdentifier,
  publicRiskReportStatuses,
} from "./risk-report";

const publishedAt = new Date("2026-08-01T10:00:00.000Z");
const updatedAt = new Date("2026-08-02T10:00:00.000Z");

const createSearchDatabase = (
  identifiers: readonly Record<string, unknown>[],
  reports: readonly Record<string, unknown>[]
) =>
  ({
    select: () => ({
      from: (table: unknown) => {
        if (table === protectionRiskIdentifier) {
          return {
            where: () => ({
              orderBy: () => ({
                limit: () => Promise.resolve(identifiers),
              }),
            }),
          };
        }
        return {
          where: () => Promise.resolve(reports),
        };
      },
    }),
  }) as never;

const createStatisticsDatabase = (
  reports: readonly Record<string, unknown>[],
  identifiers: readonly Record<string, unknown>[],
  providers: readonly Record<string, unknown>[]
) =>
  ({
    select: () => ({
      from: (table: unknown) => {
        if (table === protectionRiskReport) {
          return { where: () => Promise.resolve(reports) };
        }
        if (table === protectionRiskIdentifier) {
          return { where: () => Promise.resolve(identifiers) };
        }
        if (table === protectionProviderProfile) {
          return Promise.resolve(providers);
        }
        throw new Error("Unexpected table in statistics query");
      },
    }),
  }) as never;

const createReport = (overrides: Record<string, unknown> = {}) => ({
  claimedLoss: 125_000,
  id: "report-1",
  publicSlug: "warning-report-1",
  publishedAt,
  status: "PUBLISHED",
  type: "BANK_WALLET_PHONE",
  updatedAt,
  ...overrides,
});

describe("public risk identifier lookup", () => {
  afterEach(() => {
    resetRiskIdentifierLookupRateLimitForTests();
  });

  it("returns only a positive exact match with a safe public projection", async () => {
    const database = createSearchDatabase(
      [
        {
          normalizedValue: "0123456789",
          reportId: "report-1",
          type: "BANK_ACCOUNT",
        },
      ],
      [createReport()]
    );

    const result = await searchPublicRiskIdentifiers(
      database,
      { type: "BANK_ACCOUNT", value: " 0123-456.789 " },
      "203.0.113.10"
    );

    expect(result).toEqual({
      exactMatch: true,
      warnings: [
        {
          identifier: {
            maskedValue: "**** 6789",
            publicValue: null,
            type: "BANK_ACCOUNT",
          },
          publicPath: "/avin-check/warning/warning-report-1",
          publicSlug: "warning-report-1",
          publishedAt: publishedAt.toISOString(),
          status: "PUBLISHED",
          type: "BANK_WALLET_PHONE",
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("0123456789");
  });

  it("does not confirm a near match or a removed report", async () => {
    const nearMatchDatabase = createSearchDatabase([], []);
    const removedDatabase = createSearchDatabase(
      [
        {
          normalizedValue: "0123456788",
          reportId: "removed-report",
          type: "BANK_ACCOUNT",
        },
      ],
      [createReport({ id: "removed-report", status: "REMOVED" })]
    );

    const nearMatch = await searchPublicRiskIdentifiers(
      nearMatchDatabase,
      { type: "BANK_ACCOUNT", value: "0123456789" },
      "203.0.113.11"
    );
    const removedMatch = await searchPublicRiskIdentifiers(
      removedDatabase,
      { type: "BANK_ACCOUNT", value: "0123456788" },
      "203.0.113.12"
    );

    expect(nearMatch).toEqual({ exactMatch: false, warnings: [] });
    expect(removedMatch).toEqual({ exactMatch: false, warnings: [] });
  });

  it("normalizes profile URLs and only publishes an allowlisted social profile", async () => {
    const facebookIdentifier = normalizeRiskIdentifier(
      "SOCIAL_ACCOUNT",
      "https://Facebook.com/Acme-Store/"
    );
    const unsafeIdentifier = normalizeRiskIdentifier(
      "SOCIAL_ACCOUNT",
      "https://untrusted.example/Acme-Store/"
    );
    const facebookDatabase = createSearchDatabase(
      [
        {
          normalizedValue: facebookIdentifier,
          reportId: "facebook-report",
          type: "SOCIAL_ACCOUNT",
        },
      ],
      [
        createReport({
          id: "facebook-report",
          type: "SOCIAL_GAME_ACCOUNT",
        }),
      ]
    );
    const unsafeDatabase = createSearchDatabase(
      [
        {
          normalizedValue: unsafeIdentifier,
          reportId: "unsafe-report",
          type: "SOCIAL_ACCOUNT",
        },
      ],
      [
        createReport({
          id: "unsafe-report",
          publicSlug: "warning-unsafe-report",
          type: "SOCIAL_GAME_ACCOUNT",
        }),
      ]
    );

    const result = await searchPublicRiskIdentifiers(
      facebookDatabase,
      { type: "SOCIAL_ACCOUNT", value: "https://facebook.com/acme-store" },
      "203.0.113.13"
    );

    expect(result.warnings[0]?.identifier.publicValue).toBe(
      "https://facebook.com/acme-store"
    );

    const unsafeResult = await searchPublicRiskIdentifiers(
      unsafeDatabase,
      { type: "SOCIAL_ACCOUNT", value: unsafeIdentifier },
      "203.0.113.14"
    );
    expect(unsafeResult.warnings[0]?.identifier.publicValue).toBeNull();
    expect(unsafeResult.warnings[0]?.identifier.maskedValue).toBe("ht****re");
  });

  it("rejects malformed or short searches without echoing the submitted value", async () => {
    const database = createSearchDatabase([], []);

    await expect(
      searchPublicRiskIdentifiers(
        database,
        { type: "WEBSITE", value: "not a url" },
        "203.0.113.15"
      )
    ).rejects.toThrow("Giá trị định danh không hợp lệ");
    await expect(
      searchPublicRiskIdentifiers(
        database,
        { type: "PHONE", value: "123" },
        "203.0.113.16"
      )
    ).rejects.toThrow("Giá trị định danh quá ngắn");
    expect(JSON.stringify(database)).not.toContain("not a url");
  });
});

describe("public risk statistics", () => {
  afterEach(() => {
    resetRiskIdentifierLookupRateLimitForTests();
  });

  it("counts only current public reports and distinct identifiers", async () => {
    const database = createStatisticsDatabase(
      [
        createReport(),
        createReport({
          claimedLoss: 75_000,
          id: "report-2",
          publishedAt: new Date("2026-07-15T10:00:00.000Z"),
          status: "CORRECTED",
          updatedAt: new Date("2026-07-16T10:00:00.000Z"),
        }),
      ],
      [
        {
          normalizedValue: "0123456789",
          reportId: "report-1",
          type: "BANK_ACCOUNT",
        },
        {
          normalizedValue: "0123456789",
          reportId: "report-2",
          type: "BANK_ACCOUNT",
        },
        {
          normalizedValue: "https://example.com",
          reportId: "report-2",
          type: "WEBSITE",
        },
      ],
      [
        {
          status: "ACTIVE",
          updatedAt: new Date("2026-08-03T10:00:00.000Z"),
        },
        {
          status: "WITHDRAWN",
          updatedAt: new Date("2026-08-01T10:00:00.000Z"),
        },
        {
          status: "ACTIVE",
          updatedAt: new Date("2026-08-02T10:00:00.000Z"),
        },
      ]
    );

    const result = await getPublicRiskStatistics(database, "203.0.113.20");

    expect(result.currentReports).toBe(2);
    expect(result.publishedRiskIdentifiers).toBe(2);
    expect(result.verifiedClaimedLoss).toBe(200_000);
    expect(result.reportsByPeriod).toEqual([
      { count: 1, period: "2026-07" },
      { count: 1, period: "2026-08" },
    ]);
    expect(result.providersByStatus).toEqual([
      { count: 2, status: "ACTIVE" },
      { count: 0, status: "SUSPENDED_PENDING_REVIEW" },
      { count: 0, status: "WITHDRAWAL_PENDING" },
      { count: 1, status: "WITHDRAWN" },
      { count: 0, status: "REMOVED_FOR_FRAUD" },
    ]);
    expect(result.lastUpdatedAt).toBe("2026-08-03T10:00:00.000Z");
    expect(publicRiskReportStatuses).not.toContain("REMOVED");
  });
});

describe("public risk lookup rate limit", () => {
  afterEach(() => {
    resetRiskIdentifierLookupRateLimitForTests();
  });

  it("limits repeated searches by a hashed client identity", () => {
    for (
      let attempt = 0;
      attempt < RISK_IDENTIFIER_LOOKUPS_PER_MINUTE;
      attempt += 1
    ) {
      assertRiskIdentifierLookupAllowed("203.0.113.30", 1000 + attempt);
    }

    expect(() =>
      assertRiskIdentifierLookupAllowed("203.0.113.30", 2000)
    ).toThrow(/quá nhiều lần/iu);
    expect(() =>
      assertRiskIdentifierLookupAllowed("203.0.113.30", 61_001)
    ).not.toThrow();
  });
});
