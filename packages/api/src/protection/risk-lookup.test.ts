import {
  protectionRiskIdentifier,
  protectionRiskReport,
} from "@avin/db/schema/protection";
import { afterEach, describe, expect, it } from "vitest";

import {
  assertRiskIdentifierLookupAllowed,
  buildPublicRiskLookupQueries,
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
) => {
  const visibleReports = reports.filter((report) =>
    ["PUBLISHED", "CORRECTED", "UNDER_VERIFICATION"].includes(
      String(report.status)
    )
  );
  const reportRows = visibleReports.map((report) => ({
    affectedVictimCount: report.affectedVictimCount ?? 1,
    claimedLoss: report.claimedLoss ?? null,
    externalSource: report.externalSource ?? null,
    externalSourceUrl: report.externalSourceUrl ?? null,
    externalTitle: report.externalTitle ?? null,
    id: report.id,
    publicSlug: report.publicSlug ?? null,
    publicSummary: report.publicSummary ?? null,
    publishedAt: report.publishedAt ?? null,
    sortAt: report.publishedAt ?? report.updatedAt,
    status: report.status,
    type: report.type,
    updatedAt: report.updatedAt,
  }));

  return {
    select: () => ({
      from: (table: unknown) => {
        if (table === protectionRiskReport) {
          return {
            innerJoin: () => ({
              where: () =>
                Promise.resolve([{ totalMatches: visibleReports.length }]),
            }),
          };
        }
        if (table === protectionRiskIdentifier) {
          return {
            where: () => ({
              orderBy: () => Promise.resolve(identifiers),
            }),
          };
        }
        throw new Error("Unexpected table in search query");
      },
    }),
    selectDistinct: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            limit: () => Promise.resolve(reportRows),
            orderBy: () => ({ limit: () => Promise.resolve(reportRows) }),
          }),
        }),
      }),
    }),
  } as never;
};

const createStatisticsDatabase = (
  reports: readonly Record<string, unknown>[],
  identifiers: readonly Record<string, unknown>[]
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

    expect(result).toMatchObject({
      exactMatch: true,
      groups: [
        {
          hasPublicWarning: true,
          identifier: {
            maskedValue: "**** 6789",
            publicValue: null,
            type: "BANK_ACCOUNT",
          },
          latestPublishedAt: publishedAt.toISOString(),
          reportCount: 1,
          sourceCount: 1,
          status: "PUBLISHED",
        },
      ],
      hasMore: false,
      nextCursor: null,
      totalReports: 1,
    });
    expect(result.warnings[0]).toMatchObject({
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
    });
    expect(JSON.stringify(result)).not.toContain("0123456789");
  });

  it("expands automatic lookup into exact candidates without fuzzy matching", () => {
    expect(
      buildPublicRiskLookupQueries({
        kind: "AUTO",
        value: " +84 912-345-678 ",
      })
    ).toEqual([
      { normalizedValue: "0912345678", type: "PHONE" },
      { normalizedValue: "84912345678", type: "BANK_ACCOUNT" },
    ]);

    expect(
      buildPublicRiskLookupQueries({ kind: "AUTO", value: "123456789" })
    ).toEqual([{ normalizedValue: "123456789", type: "BANK_ACCOUNT" }]);

    expect(
      buildPublicRiskLookupQueries({ kind: "AUTO", value: "@AcmeStore" })
    ).toEqual([
      {
        normalizedValue: "https://facebook.com/acmestore",
        type: "SOCIAL_ACCOUNT",
      },
      {
        normalizedValue: "https://facebook.com/acmestore",
        type: "PLATFORM_ACCOUNT",
      },
      {
        normalizedValue: "https://tiktok.com/@acmestore",
        type: "SOCIAL_ACCOUNT",
      },
      {
        normalizedValue: "https://tiktok.com/@acmestore",
        type: "PLATFORM_ACCOUNT",
      },
      {
        normalizedValue: "https://t.me/acmestore",
        type: "SOCIAL_ACCOUNT",
      },
      {
        normalizedValue: "https://t.me/acmestore",
        type: "PLATFORM_ACCOUNT",
      },
      { normalizedValue: "@acmestore", type: "SOCIAL_ACCOUNT" },
      { normalizedValue: "@acmestore", type: "PLATFORM_ACCOUNT" },
    ]);

    const shortHandleQueries = buildPublicRiskLookupQueries({
      kind: "AUTO",
      value: "@abc",
    });
    expect(shortHandleQueries).toContainEqual({
      normalizedValue: "https://tiktok.com/@abc",
      type: "SOCIAL_ACCOUNT",
    });
    expect(shortHandleQueries).not.toContainEqual({
      normalizedValue: "https://t.me/abc",
      type: "SOCIAL_ACCOUNT",
    });

    expect(
      buildPublicRiskLookupQueries({
        kind: "AUTO",
        type: "SOCIAL_ACCOUNT",
        value: "https://facebook.com/acme",
      })
    ).toEqual([
      {
        normalizedValue: "https://facebook.com/acme",
        type: "SOCIAL_ACCOUNT",
      },
    ]);

    expect(
      buildPublicRiskLookupQueries({
        kind: "AUTO",
        value: "example.com/path?tracking=secret",
      })
    ).toEqual([{ normalizedValue: "https://example.com", type: "WEBSITE" }]);
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

    expect(nearMatch).toMatchObject({
      exactMatch: false,
      groups: [],
      hasMore: false,
      nextCursor: null,
      totalReports: 0,
      warnings: [],
    });
    expect(removedMatch).toMatchObject({
      exactMatch: false,
      groups: [],
      hasMore: false,
      nextCursor: null,
      totalReports: 0,
      warnings: [],
    });
  });

  it("groups every exact account report while retaining source and status provenance", async () => {
    const database = createSearchDatabase(
      [
        {
          normalizedValue: "123456789",
          reportId: "report-1",
          type: "BANK_ACCOUNT",
        },
        {
          normalizedValue: "123456789",
          reportId: "report-2",
          type: "BANK_ACCOUNT",
        },
        {
          normalizedValue: "123456789",
          reportId: "report-3",
          type: "BANK_ACCOUNT",
        },
      ],
      [
        createReport({
          externalSource: "Avin",
          externalTitle: "Báo cáo nội bộ",
          id: "report-1",
        }),
        createReport({
          externalSource: "Cộng đồng",
          externalTitle: "Nguồn cộng đồng",
          id: "report-2",
          publishedAt: new Date("2026-08-03T10:00:00.000Z"),
          status: "CORRECTED",
        }),
        createReport({
          externalSource: "Telegram public feed",
          externalTitle: "Nguồn đang xác minh",
          id: "report-3",
          publishedAt: null,
          status: "UNDER_VERIFICATION",
          updatedAt: new Date("2026-08-04T10:00:00.000Z"),
        }),
      ]
    );

    const result = await searchPublicRiskIdentifiers(
      database,
      { kind: "BANK_ACCOUNT", value: "123456789" },
      "203.0.113.17"
    );

    expect(result).toMatchObject({
      exactMatch: true,
      groups: [
        {
          hasPublicWarning: true,
          reportCount: 3,
          sourceCount: 3,
          status: "CORRECTED",
        },
      ],
      totalReports: 3,
    });
    expect(result.groups[0]?.warnings.map((warning) => warning.status)).toEqual(
      ["CORRECTED", "PUBLISHED", "UNDER_VERIFICATION"]
    );
    expect(
      result.groups[0]?.warnings.map((warning) => warning.externalSource.name)
    ).toEqual(["Cộng đồng", "Avin", "Telegram public feed"]);
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

  it("rejects unsupported social content links during automatic detection", () => {
    expect(() =>
      buildPublicRiskLookupQueries({
        kind: "AUTO",
        value: "https://facebook.com/share/p/secret",
      })
    ).toThrow("Giá trị định danh không hợp lệ");
    expect(() =>
      buildPublicRiskLookupQueries({
        kind: "AUTO",
        value: "https://vm.tiktok.com/ZM123/",
      })
    ).toThrow("Giá trị định danh không hợp lệ");
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
    expect(result.lastUpdatedAt).toBe("2026-08-02T10:00:00.000Z");
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
