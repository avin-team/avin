import { createHash } from "node:crypto";

import {
  protectionProviderProfile,
  protectionRiskIdentifier,
  protectionRiskReport,
} from "@avin/db/schema/protection";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import type { Context } from "../runtime/context";
import {
  createRiskReportPublicPath,
  createRiskReportPublicSlug,
  getRiskIdentifierPublicValue,
  maskRiskIdentifier,
  normalizeRiskIdentifier,
  publicRiskReportStatuses,
  riskReportIdentifierTypes,
} from "./risk-report";
import type {
  PublicRiskReportStatus,
  RiskReportIdentifierType,
  RiskReportStatus,
} from "./risk-report";

type Database = Context["db"];

export const PUBLIC_RISK_LOOKUP_MAX_RESULTS = 20;
export const RISK_IDENTIFIER_LOOKUPS_PER_MINUTE = 20;
export const RISK_IDENTIFIER_LOOKUP_MIN_LENGTH = 4;

export const publicRiskIdentifierLookupInputSchema = z.object({
  type: z.enum(riskReportIdentifierTypes),
  value: z.string().trim().min(1).max(300),
});

export type PublicRiskIdentifierLookupInput = z.infer<
  typeof publicRiskIdentifierLookupInputSchema
>;

const providerProfileStatuses = [
  "ACTIVE",
  "SUSPENDED_PENDING_REVIEW",
  "WITHDRAWAL_PENDING",
  "WITHDRAWN",
  "REMOVED_FOR_FRAUD",
] as const;

type ProviderProfileStatus = (typeof providerProfileStatuses)[number];

interface SearchRateLimitBucket {
  count: number;
  windowStartedAt: number;
}

const SEARCH_RATE_LIMIT_WINDOW_MS = 60_000;
const searchRateLimitBuckets = new Map<string, SearchRateLimitBucket>();

const lookupRateLimitKey = (ipAddress?: string): string =>
  createHash("sha256")
    .update(ipAddress?.trim() || "unknown")
    .digest("hex");

export const assertRiskIdentifierLookupAllowed = (
  ipAddress: string | undefined,
  now = Date.now()
): void => {
  const key = lookupRateLimitKey(ipAddress);
  const existing = searchRateLimitBuckets.get(key);
  if (
    !existing ||
    now - existing.windowStartedAt >= SEARCH_RATE_LIMIT_WINDOW_MS
  ) {
    searchRateLimitBuckets.set(key, { count: 1, windowStartedAt: now });
    return;
  }

  if (existing.count >= RISK_IDENTIFIER_LOOKUPS_PER_MINUTE) {
    throw new ORPCError("TOO_MANY_REQUESTS", {
      message: "Bạn đã tra cứu quá nhiều lần. Vui lòng thử lại sau một phút.",
    });
  }

  existing.count += 1;
};

export const resetRiskIdentifierLookupRateLimitForTests = (): void => {
  searchRateLimitBuckets.clear();
};

const isCurrentPublicRiskReportStatus = (
  status: RiskReportStatus
): status is PublicRiskReportStatus =>
  (publicRiskReportStatuses as readonly string[]).includes(status);

const normalizeLookupValue = (
  type: RiskReportIdentifierType,
  value: string
): string => {
  let normalizedValue: string;
  try {
    normalizedValue = normalizeRiskIdentifier(type, value);
  } catch {
    throw new ORPCError("BAD_REQUEST", {
      message: "Giá trị định danh không hợp lệ.",
    });
  }

  if (normalizedValue.length < RISK_IDENTIFIER_LOOKUP_MIN_LENGTH) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Giá trị định danh quá ngắn.",
    });
  }

  return normalizedValue;
};

const toSafeMaskedValue = (
  type: RiskReportIdentifierType,
  normalizedValue: string
): string => {
  try {
    return maskRiskIdentifier(type, normalizedValue);
  } catch {
    return "****";
  }
};

const toSafePublicValue = (
  type: RiskReportIdentifierType,
  normalizedValue: string
): string | null => {
  try {
    return getRiskIdentifierPublicValue(type, normalizedValue);
  } catch {
    return null;
  }
};

const loadCurrentRiskReports = (
  database: Database,
  reportIds?: readonly string[]
) => {
  const statusCondition = inArray(
    protectionRiskReport.status,
    publicRiskReportStatuses
  );
  const conditions = reportIds?.length
    ? and(statusCondition, inArray(protectionRiskReport.id, reportIds))
    : statusCondition;

  return database
    .select({
      claimedLoss: protectionRiskReport.claimedLoss,
      id: protectionRiskReport.id,
      publicSlug: protectionRiskReport.publicSlug,
      publishedAt: protectionRiskReport.publishedAt,
      status: protectionRiskReport.status,
      type: protectionRiskReport.type,
      updatedAt: protectionRiskReport.updatedAt,
    })
    .from(protectionRiskReport)
    .where(conditions);
};

export const searchPublicRiskIdentifiers = async (
  database: Database,
  input: PublicRiskIdentifierLookupInput,
  ipAddress?: string
) => {
  assertRiskIdentifierLookupAllowed(ipAddress);
  const normalizedValue = normalizeLookupValue(input.type, input.value);
  const identifiers = await database
    .select({
      normalizedValue: protectionRiskIdentifier.normalizedValue,
      reportId: protectionRiskIdentifier.reportId,
      type: protectionRiskIdentifier.type,
    })
    .from(protectionRiskIdentifier)
    .where(
      and(
        eq(protectionRiskIdentifier.type, input.type),
        eq(protectionRiskIdentifier.normalizedValue, normalizedValue)
      )
    )
    .orderBy(desc(protectionRiskIdentifier.createdAt))
    .limit(PUBLIC_RISK_LOOKUP_MAX_RESULTS);

  if (identifiers.length === 0) {
    return { exactMatch: false, warnings: [] };
  }

  const reports = await loadCurrentRiskReports(database, [
    ...new Set(identifiers.map((identifier) => identifier.reportId)),
  ]);
  const reportsById = new Map(reports.map((report) => [report.id, report]));
  const returnedReportIds = new Set<string>();
  const warnings = [];

  for (const identifier of identifiers) {
    const report = reportsById.get(identifier.reportId);
    if (
      !report ||
      !isCurrentPublicRiskReportStatus(report.status) ||
      returnedReportIds.has(report.id)
    ) {
      continue;
    }

    returnedReportIds.add(report.id);
    const publicSlug =
      report.publicSlug ?? createRiskReportPublicSlug(report.id);
    warnings.push({
      identifier: {
        maskedValue: toSafeMaskedValue(
          identifier.type,
          identifier.normalizedValue
        ),
        publicValue: toSafePublicValue(
          identifier.type,
          identifier.normalizedValue
        ),
        type: identifier.type,
      },
      publicPath: createRiskReportPublicPath(publicSlug),
      publicSlug,
      publishedAt: report.publishedAt?.toISOString() ?? null,
      status: report.status,
      type: report.type,
    });
  }

  return { exactMatch: warnings.length > 0, warnings };
};

const toPeriod = (date: Date): string => date.toISOString().slice(0, 7);

const getLatestDate = (dates: readonly Date[]): Date | null => {
  if (dates.length === 0) {
    return null;
  }

  const [firstDate, ...remainingDates] = dates;
  if (!firstDate) {
    return null;
  }

  let latest = firstDate;
  for (const current of remainingDates) {
    if (current > latest) {
      latest = current;
    }
  }
  return latest;
};

export const getPublicRiskStatistics = async (
  database: Database,
  ipAddress?: string
) => {
  assertRiskIdentifierLookupAllowed(ipAddress);
  const reports = await loadCurrentRiskReports(database);
  const [identifiers, providers] = await Promise.all([
    reports.length === 0
      ? Promise.resolve([])
      : database
          .select({
            normalizedValue: protectionRiskIdentifier.normalizedValue,
            type: protectionRiskIdentifier.type,
          })
          .from(protectionRiskIdentifier)
          .where(
            inArray(
              protectionRiskIdentifier.reportId,
              reports.map((report) => report.id)
            )
          ),
    database
      .select({
        status: protectionProviderProfile.status,
        updatedAt: protectionProviderProfile.updatedAt,
      })
      .from(protectionProviderProfile),
  ]);

  const publishedIdentifierKeys = new Set(
    identifiers.map(
      (identifier) => `${identifier.type}:${identifier.normalizedValue}`
    )
  );
  const reportsByPeriod = new Map<string, number>();
  for (const report of reports) {
    if (!report.publishedAt) {
      continue;
    }
    const period = toPeriod(report.publishedAt);
    reportsByPeriod.set(period, (reportsByPeriod.get(period) ?? 0) + 1);
  }

  const providerCounts = new Map<ProviderProfileStatus, number>(
    providerProfileStatuses.map((status) => [status, 0])
  );
  for (const provider of providers) {
    const currentCount = providerCounts.get(provider.status);
    if (currentCount !== undefined) {
      providerCounts.set(provider.status, currentCount + 1);
    }
  }

  const lastUpdatedAt = getLatestDate([
    ...reports.map((report) => report.updatedAt),
    ...providers.map((provider) => provider.updatedAt),
  ]);

  return {
    currentReports: reports.length,
    lastUpdatedAt: lastUpdatedAt?.toISOString() ?? null,
    providersByStatus: providerProfileStatuses.map((status) => ({
      count: providerCounts.get(status) ?? 0,
      status,
    })),
    publishedRiskIdentifiers: publishedIdentifierKeys.size,
    reportsByPeriod: [...reportsByPeriod.entries()]
      .toSorted(([left], [right]) => left.localeCompare(right))
      .map(([period, count]) => ({ count, period })),
    verifiedClaimedLoss: reports.reduce(
      (total, report) => total + (report.claimedLoss ?? 0),
      0
    ),
  };
};
