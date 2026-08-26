import { createHash } from "node:crypto";

import {
  protectionRiskIdentifier,
  protectionRiskReport,
} from "@avin/db/schema/protection";
import { ORPCError } from "@orpc/server";
import {
  and,
  countDistinct,
  desc,
  eq,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import type { Context } from "../runtime/context";
import {
  createRiskReportPublicPath,
  createRiskReportPublicTitle,
  createRiskReportPublicSlug,
  getRiskIdentifierPlatform,
  getRiskIdentifierPublicValue,
  isSupportedRiskIdentifierPlatformUrl,
  maskRiskIdentifier,
  normalizeRiskIdentifier,
  publicRiskReportStatuses,
  riskReportPublicSubjectIdentifierRoles,
  riskReportIdentifierTypes,
} from "./risk-report";
import type {
  PublicRiskReportStatus,
  RiskReportIdentifierType,
  RiskReportType,
  RiskReportStatus,
} from "./risk-report";

type Database = Context["db"];

export const PUBLIC_RISK_LOOKUP_MAX_RESULTS = 20;
export const RISK_IDENTIFIER_LOOKUPS_PER_MINUTE = 20;
export const RISK_IDENTIFIER_LOOKUP_MIN_LENGTH = 4;

export const publicRiskLookupKinds = [
  "AUTO",
  "PHONE_OR_BANK",
  "PHONE",
  "BANK_ACCOUNT",
  "WALLET_ACCOUNT",
  "WEBSITE",
  "FACEBOOK",
  "TIKTOK",
  "TELEGRAM",
] as const;

export type PublicRiskLookupKind = (typeof publicRiskLookupKinds)[number];

export const publicRiskIdentifierLookupInputSchema = z.object({
  cursor: z.string().trim().min(1).max(512).optional(),
  kind: z.enum(publicRiskLookupKinds).optional(),
  type: z.enum(riskReportIdentifierTypes).optional(),
  value: z.string().trim().min(1).max(300),
});

export type PublicRiskIdentifierLookupInput = z.infer<
  typeof publicRiskIdentifierLookupInputSchema
>;

interface SearchRateLimitBucket {
  count: number;
  windowStartedAt: number;
}

const SEARCH_RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_SEARCH_RATE_LIMIT_BUCKETS = 10_000;
const searchRateLimitBuckets = new Map<string, SearchRateLimitBucket>();

const lookupRateLimitKey = (ipAddress?: string): string =>
  createHash("sha256")
    .update(ipAddress?.trim() || "unknown")
    .digest("hex");

const pruneExpiredSearchRateLimitBuckets = (now: number): void => {
  for (const [key, bucket] of searchRateLimitBuckets) {
    if (now - bucket.windowStartedAt >= SEARCH_RATE_LIMIT_WINDOW_MS) {
      searchRateLimitBuckets.delete(key);
    }
  }
};

export const assertRiskIdentifierLookupAllowed = (
  ipAddress: string | undefined,
  now = Date.now()
): void => {
  pruneExpiredSearchRateLimitBuckets(now);
  const key = lookupRateLimitKey(ipAddress);
  const existing = searchRateLimitBuckets.get(key);
  if (
    !existing ||
    now - existing.windowStartedAt >= SEARCH_RATE_LIMIT_WINDOW_MS
  ) {
    if (searchRateLimitBuckets.size >= MAX_SEARCH_RATE_LIMIT_BUCKETS) {
      const oldestKey = searchRateLimitBuckets.keys().next().value;
      if (oldestKey) {
        searchRateLimitBuckets.delete(oldestKey);
      }
    }
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
  const compactValue = value.trim().replaceAll(/[\s().+-]/gu, "");
  if (compactValue.length < RISK_IDENTIFIER_LOOKUP_MIN_LENGTH) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Giá trị định danh quá ngắn.",
    });
  }

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

export interface PublicRiskLookupQuery {
  normalizedValue: string;
  type: RiskReportIdentifierType;
}

const platformProfilePrefixes = {
  FACEBOOK: "https://facebook.com/",
  TELEGRAM: "https://t.me/",
  TIKTOK: "https://tiktok.com/@",
} as const;

const publicLookupPlatforms = ["FACEBOOK", "TIKTOK", "TELEGRAM"] as const;

const publicSocialLookupTypes: readonly RiskReportIdentifierType[] = [
  "SOCIAL_ACCOUNT",
  "PLATFORM_ACCOUNT",
];

const invalidLookupValue = () =>
  new ORPCError("BAD_REQUEST", {
    message: "Giá trị định danh không hợp lệ.",
  });

const isNumericLookup = (value: string): boolean =>
  /^[+0-9\s().-]+$/u.test(value) &&
  value.replaceAll(/\D/gu, "").length >= RISK_IDENTIFIER_LOOKUP_MIN_LENGTH;

const isUrlLikeLookup = (value: string): boolean =>
  /^https?:\/\//iu.test(value) || /[a-z0-9-]+\.[a-z]{2,}(?:\/|$)/iu.test(value);

const addLookupQuery = (
  queries: PublicRiskLookupQuery[],
  type: RiskReportIdentifierType,
  value: string
): void => {
  const normalizedValue = normalizeLookupValue(type, value);
  if (
    queries.some(
      (query) =>
        query.type === type && query.normalizedValue === normalizedValue
    )
  ) {
    return;
  }
  queries.push({ normalizedValue, type });
};

const tryAddLookupQuery = (
  queries: PublicRiskLookupQuery[],
  type: RiskReportIdentifierType,
  value: string
): boolean => {
  try {
    addLookupQuery(queries, type, value);
    return true;
  } catch {
    return false;
  }
};

const getPlatformHandle = (value: string): string | null => {
  const trimmedValue = value.trim();
  if (!/^@[a-z0-9._-]+$/iu.test(trimmedValue)) {
    return null;
  }
  return trimmedValue.slice(1).toLowerCase();
};

const addPlatformQueries = (
  queries: PublicRiskLookupQuery[],
  platform: keyof typeof platformProfilePrefixes,
  value: string
): void => {
  const handle = getPlatformHandle(value);
  const profileValue = handle
    ? `${platformProfilePrefixes[platform]}${handle}`
    : value;
  const normalizedValue = normalizeLookupValue("SOCIAL_ACCOUNT", profileValue);
  if (getRiskIdentifierPlatform(normalizedValue) !== platform) {
    throw invalidLookupValue();
  }

  for (const type of publicSocialLookupTypes) {
    addLookupQuery(queries, type, normalizedValue);
  }
};

const tryAddPlatformQueries = (
  queries: PublicRiskLookupQuery[],
  platform: keyof typeof platformProfilePrefixes,
  value: string
): boolean => {
  try {
    addPlatformQueries(queries, platform, value);
    return true;
  } catch {
    return false;
  }
};

interface PublicRiskLookupCursor {
  reportId: string;
  sortAt: string;
}

const publicRiskLookupCursorSchema = z.object({
  reportId: z.uuid(),
  sortAt: z.iso.datetime(),
});

const decodePublicRiskLookupCursor = (
  value: string | undefined
): PublicRiskLookupCursor | undefined => {
  if (!value) {
    return undefined;
  }

  try {
    const decoded = publicRiskLookupCursorSchema.parse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf-8"))
    );
    return decoded;
  } catch {
    throw new ORPCError("BAD_REQUEST", {
      message: "Cursor tra cứu không hợp lệ.",
    });
  }
};

const encodePublicRiskLookupCursor = (cursor: PublicRiskLookupCursor): string =>
  Buffer.from(JSON.stringify(cursor), "utf-8").toString("base64url");

const buildNumericLookupQueries = (value: string): PublicRiskLookupQuery[] => {
  const queries: PublicRiskLookupQuery[] = [];
  tryAddLookupQuery(queries, "PHONE", value);
  tryAddLookupQuery(queries, "BANK_ACCOUNT", value.replace(/^\+/u, ""));
  if (queries.length === 0) {
    throw invalidLookupValue();
  }
  return queries;
};

const buildAutoLookupQueries = (value: string): PublicRiskLookupQuery[] => {
  const queries: PublicRiskLookupQuery[] = [];
  if (getPlatformHandle(value)) {
    for (const platform of publicLookupPlatforms) {
      tryAddPlatformQueries(queries, platform, value);
    }
    for (const identifierType of publicSocialLookupTypes) {
      addLookupQuery(queries, identifierType, value);
    }
    if (queries.length === 0) {
      throw invalidLookupValue();
    }
    return queries;
  }

  if (!isUrlLikeLookup(value)) {
    throw invalidLookupValue();
  }

  const platform = getRiskIdentifierPlatform(value);
  if (platform) {
    addPlatformQueries(queries, platform, value);
  } else if (isSupportedRiskIdentifierPlatformUrl(value)) {
    throw invalidLookupValue();
  } else {
    addLookupQuery(queries, "WEBSITE", value);
  }
  return queries;
};

export const buildPublicRiskLookupQueries = ({
  kind,
  type,
  value,
}: {
  kind: PublicRiskLookupKind;
  type?: RiskReportIdentifierType;
  value: string;
}): PublicRiskLookupQuery[] => {
  const trimmedValue = value.trim();
  const queries: PublicRiskLookupQuery[] = [];

  if (type === "SOCIAL_ACCOUNT" || type === "PLATFORM_ACCOUNT") {
    addLookupQuery(queries, type, trimmedValue);
    return queries;
  }

  const selectedKind: PublicRiskLookupKind = type ?? kind;

  if (selectedKind === "PHONE_OR_BANK" || selectedKind === "AUTO") {
    if (isNumericLookup(trimmedValue)) {
      return buildNumericLookupQueries(trimmedValue);
    }
    if (selectedKind === "PHONE_OR_BANK") {
      throw invalidLookupValue();
    }
  }

  if (selectedKind === "AUTO") {
    return buildAutoLookupQueries(trimmedValue);
  }

  if (selectedKind === "PHONE") {
    addLookupQuery(queries, "PHONE", trimmedValue);
    return queries;
  }
  if (selectedKind === "BANK_ACCOUNT") {
    addLookupQuery(queries, "BANK_ACCOUNT", trimmedValue);
    return queries;
  }
  if (selectedKind === "WALLET_ACCOUNT") {
    addLookupQuery(queries, "WALLET_ACCOUNT", trimmedValue);
    return queries;
  }
  if (selectedKind === "WEBSITE") {
    addLookupQuery(queries, "WEBSITE", trimmedValue);
    return queries;
  }

  if (
    selectedKind === "FACEBOOK" ||
    selectedKind === "TIKTOK" ||
    selectedKind === "TELEGRAM"
  ) {
    addPlatformQueries(queries, selectedKind, trimmedValue);
    return queries;
  }

  throw invalidLookupValue();
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
  const statusCondition = and(
    inArray(protectionRiskReport.status, publicRiskReportStatuses),
    isNull(protectionRiskReport.externalSource)
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

interface PublicRiskLookupReportRow {
  claimedLoss: number | null;
  externalSource: string | null;
  externalSourceUrl: string | null;
  externalTitle: string | null;
  id: string;
  publicSlug: string | null;
  publicNarrative: string | null;
  publicSummary: string | null;
  publishedAt: Date | null;
  sortAt: unknown;
  status: RiskReportStatus;
  type: RiskReportType;
  updatedAt: Date;
}

interface PublicRiskLookupIdentifierRow {
  normalizedValue: string;
  reportId: string;
  type: RiskReportIdentifierType;
}

export interface PublicRiskLookupWarning {
  claimedLoss: number | null;
  externalSource: { name: string; title: string | null; url: string | null };
  identifier: {
    maskedValue: string;
    publicValue: string | null;
    type: RiskReportIdentifierType;
  };
  publicPath: string;
  publicTitle: string;
  publicSlug: string;
  publicNarrative: string | null;
  publicSummary: string | null;
  publishedAt: string | null;
  status: PublicRiskReportStatus;
  type: string;
}

export interface PublicRiskLookupGroup {
  groupId: string;
  hasPublicWarning: boolean;
  identifier: PublicRiskLookupWarning["identifier"];
  latestPublishedAt: string | null;
  reportCount: number;
  sourceCount: number;
  status: PublicRiskReportStatus;
  warnings: PublicRiskLookupWarning[];
}

const createPublicRiskLookupGroupId = (
  type: RiskReportIdentifierType,
  normalizedValue: string
): string =>
  createHash("sha256").update(`${type}:${normalizedValue}`).digest("hex");

const sortPublicRiskLookupGroups = (
  groups: PublicRiskLookupGroup[]
): PublicRiskLookupGroup[] =>
  groups.toSorted((left, right) => {
    if (left.hasPublicWarning !== right.hasPublicWarning) {
      return left.hasPublicWarning ? -1 : 1;
    }
    if (left.reportCount !== right.reportCount) {
      return right.reportCount - left.reportCount;
    }
    return (right.latestPublishedAt ?? "").localeCompare(
      left.latestPublishedAt ?? ""
    );
  });

const buildPublicRiskLookupGroups = ({
  identifiers,
  reportRows,
}: {
  identifiers: readonly PublicRiskLookupIdentifierRow[];
  reportRows: readonly PublicRiskLookupReportRow[];
}): PublicRiskLookupGroup[] => {
  const reportsById = new Map(reportRows.map((report) => [report.id, report]));
  const groupsByIdentifier = new Map<
    string,
    {
      groupId: string;
      identifier: PublicRiskLookupWarning["identifier"];
      warnings: PublicRiskLookupWarning[];
    }
  >();
  const seenReportIdentifiers = new Set<string>();

  for (const identifier of identifiers) {
    const report = reportsById.get(identifier.reportId);
    if (!report || !isCurrentPublicRiskReportStatus(report.status)) {
      continue;
    }

    const identifierKey = `${identifier.type}:${identifier.normalizedValue}`;
    const reportIdentifierKey = `${identifierKey}:${report.id}`;
    if (seenReportIdentifiers.has(reportIdentifierKey)) {
      continue;
    }
    seenReportIdentifiers.add(reportIdentifierKey);
    const group = groupsByIdentifier.get(identifierKey) ?? {
      groupId: createPublicRiskLookupGroupId(
        identifier.type,
        identifier.normalizedValue
      ),
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
      warnings: [],
    };
    const publicSlug =
      report.publicSlug ?? createRiskReportPublicSlug(report.id);
    group.warnings.push({
      claimedLoss: report.claimedLoss,
      externalSource: {
        name: report.externalSource ?? "Avin",
        title: report.externalTitle,
        url: report.externalSourceUrl,
      },
      identifier: group.identifier,
      publicNarrative: report.publicNarrative ?? report.publicSummary,
      publicPath: createRiskReportPublicPath(publicSlug),
      publicSlug,
      publicSummary: report.publicSummary,
      publicTitle:
        report.externalTitle ??
        createRiskReportPublicTitle({
          identifiers: [
            {
              maskedValue: group.identifier.maskedValue,
              publicValue: group.identifier.publicValue,
              role: "ACCUSED_COUNTERPARTY",
              type: identifier.type,
            },
          ],
          type: report.type,
        }),
      publishedAt: report.publishedAt?.toISOString() ?? null,
      status: report.status,
      type: report.type,
    });
    groupsByIdentifier.set(identifierKey, group);
  }

  const groups: PublicRiskLookupGroup[] = [];
  for (const group of groupsByIdentifier.values()) {
    const warnings = group.warnings.toSorted((left, right) =>
      (right.publishedAt ?? "").localeCompare(left.publishedAt ?? "")
    );
    const sourceNames = new Set(
      warnings.map((warning) => warning.externalSource.name)
    );
    const hasPublicWarning = warnings.some(
      (warning) =>
        warning.status === "PUBLISHED" || warning.status === "CORRECTED"
    );
    groups.push({
      groupId: group.groupId,
      hasPublicWarning,
      identifier: group.identifier,
      latestPublishedAt: warnings[0]?.publishedAt ?? null,
      reportCount: warnings.length,
      sourceCount: sourceNames.size,
      status: warnings[0]?.status ?? "PUBLISHED",
      warnings,
    });
  }

  return sortPublicRiskLookupGroups(groups);
};

export const searchPublicRiskIdentifiers = async (
  database: Database,
  input: PublicRiskIdentifierLookupInput,
  ipAddress?: string
) => {
  assertRiskIdentifierLookupAllowed(ipAddress);
  const queries = buildPublicRiskLookupQueries({
    kind: input.kind ?? "AUTO",
    type: input.type,
    value: input.value,
  });
  const cursor = decodePublicRiskLookupCursor(input.cursor);
  const lookupCondition = or(
    ...queries.map((query) =>
      and(
        eq(protectionRiskIdentifier.type, query.type),
        eq(protectionRiskIdentifier.normalizedValue, query.normalizedValue)
      )
    )
  );
  const publicSubjectIdentifierCondition = inArray(
    protectionRiskIdentifier.role,
    riskReportPublicSubjectIdentifierRoles
  );
  const publicStatusCondition = and(
    inArray(protectionRiskReport.status, publicRiskReportStatuses),
    isNull(protectionRiskReport.externalSource)
  );
  const sortAtExpression = sql`coalesce(${protectionRiskReport.publishedAt}, ${protectionRiskReport.updatedAt})`;
  const cursorCondition = cursor
    ? sql`(
        ${sortAtExpression} < ${new Date(cursor.sortAt)}
        or (
          ${sortAtExpression} = ${new Date(cursor.sortAt)}
          and ${protectionRiskReport.id} < ${cursor.reportId}
        )
      )`
    : undefined;
  const whereCondition = and(
    publicStatusCondition,
    publicSubjectIdentifierCondition,
    lookupCondition,
    cursorCondition
  );

  const totalQueryPromise = database
    .select({ totalMatches: countDistinct(protectionRiskReport.id) })
    .from(protectionRiskReport)
    .innerJoin(
      protectionRiskIdentifier,
      eq(protectionRiskIdentifier.reportId, protectionRiskReport.id)
    )
    .where(
      and(
        publicStatusCondition,
        publicSubjectIdentifierCondition,
        lookupCondition
      )
    );

  const reportRows = await database
    .selectDistinct({
      claimedLoss: protectionRiskReport.claimedLoss,
      externalSource: protectionRiskReport.externalSource,
      externalSourceUrl: protectionRiskReport.externalSourceUrl,
      externalTitle: protectionRiskReport.externalTitle,
      id: protectionRiskReport.id,
      publicNarrative: protectionRiskReport.publicNarrative,
      publicSlug: protectionRiskReport.publicSlug,
      publicSummary: protectionRiskReport.publicSummary,
      publishedAt: protectionRiskReport.publishedAt,
      sortAt: sortAtExpression,
      status: protectionRiskReport.status,
      type: protectionRiskReport.type,
      updatedAt: protectionRiskReport.updatedAt,
    })
    .from(protectionRiskReport)
    .innerJoin(
      protectionRiskIdentifier,
      eq(protectionRiskIdentifier.reportId, protectionRiskReport.id)
    )
    .where(whereCondition)
    .orderBy(desc(sortAtExpression), desc(protectionRiskReport.id))
    .limit(PUBLIC_RISK_LOOKUP_MAX_RESULTS + 1);

  const hasMore = reportRows.length > PUBLIC_RISK_LOOKUP_MAX_RESULTS;
  const visibleReportRows = reportRows.slice(0, PUBLIC_RISK_LOOKUP_MAX_RESULTS);
  if (visibleReportRows.length === 0) {
    const [totalResult] = await totalQueryPromise;
    return {
      exactMatch: false,
      groups: [],
      hasMore: false,
      nextCursor: null,
      totalReports: Number(totalResult?.totalMatches ?? 0),
      warnings: [],
    };
  }

  const reportIds = visibleReportRows.map((report) => report.id);
  const [[totalResult], identifiers] = await Promise.all([
    totalQueryPromise,
    database
      .select({
        normalizedValue: protectionRiskIdentifier.normalizedValue,
        reportId: protectionRiskIdentifier.reportId,
        type: protectionRiskIdentifier.type,
      })
      .from(protectionRiskIdentifier)
      .where(
        and(
          inArray(protectionRiskIdentifier.reportId, reportIds),
          publicSubjectIdentifierCondition,
          lookupCondition
        )
      )
      .orderBy(desc(protectionRiskIdentifier.createdAt)),
  ]);

  const groups = buildPublicRiskLookupGroups({
    identifiers,
    reportRows: visibleReportRows,
  });

  const lastReport = visibleReportRows.at(-1);
  const lastSortAt = lastReport?.sortAt;
  const nextCursor =
    hasMore && lastReport && lastSortAt
      ? encodePublicRiskLookupCursor({
          reportId: lastReport.id,
          sortAt:
            lastSortAt instanceof Date
              ? lastSortAt.toISOString()
              : new Date(String(lastSortAt)).toISOString(),
        })
      : null;

  return {
    exactMatch: groups.length > 0,
    groups,
    hasMore,
    nextCursor,
    totalReports: Number(totalResult?.totalMatches ?? 0),
    warnings: groups.flatMap((group) => group.warnings),
  };
};

const toDayPeriod = (date: Date): string => date.toISOString().slice(0, 10);

const toMonthPeriod = (date: Date): string => date.toISOString().slice(0, 7);

const toYearPeriod = (date: Date): string => date.toISOString().slice(0, 4);

export interface PublicRiskActivityPeriod {
  claimedLoss: number;
  period: string;
  reports: number;
}

const addReportToActivityPeriod = (
  periods: Map<string, PublicRiskActivityPeriod>,
  period: string,
  report: {
    claimedLoss: number | null;
  }
): void => {
  const current = periods.get(period) ?? {
    claimedLoss: 0,
    period,
    reports: 0,
  };

  current.claimedLoss += report.claimedLoss ?? 0;
  current.reports += 1;
  periods.set(period, current);
};

const sortActivityPeriods = (
  periods: Map<string, PublicRiskActivityPeriod>
): PublicRiskActivityPeriod[] =>
  [...periods.values()].toSorted((left, right) =>
    right.period.localeCompare(left.period)
  );

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
  const identifiers =
    reports.length === 0
      ? []
      : await database
          .select({
            normalizedValue: protectionRiskIdentifier.normalizedValue,
            type: protectionRiskIdentifier.type,
          })
          .from(protectionRiskIdentifier)
          .where(
            and(
              inArray(
                protectionRiskIdentifier.reportId,
                reports.map((report) => report.id)
              ),
              inArray(
                protectionRiskIdentifier.role,
                riskReportPublicSubjectIdentifierRoles
              )
            )
          );

  const publishedIdentifierKeys = new Set(
    identifiers.map(
      (identifier) => `${identifier.type}:${identifier.normalizedValue}`
    )
  );
  const activityByDay = new Map<string, PublicRiskActivityPeriod>();
  const activityByMonth = new Map<string, PublicRiskActivityPeriod>();
  const activityByYear = new Map<string, PublicRiskActivityPeriod>();
  for (const report of reports) {
    if (!report.publishedAt) {
      continue;
    }
    addReportToActivityPeriod(
      activityByDay,
      toDayPeriod(report.publishedAt),
      report
    );
    addReportToActivityPeriod(
      activityByMonth,
      toMonthPeriod(report.publishedAt),
      report
    );
    addReportToActivityPeriod(
      activityByYear,
      toYearPeriod(report.publishedAt),
      report
    );
  }

  const lastUpdatedAt = getLatestDate(
    reports.map((report) => report.updatedAt)
  );

  return {
    activity: {
      day: sortActivityPeriods(activityByDay),
      month: sortActivityPeriods(activityByMonth),
      year: sortActivityPeriods(activityByYear),
    },
    currentReports: reports.length,
    lastUpdatedAt: lastUpdatedAt?.toISOString() ?? null,
    publishedRiskIdentifiers: publishedIdentifierKeys.size,
    reportedClaimedLoss: reports.reduce(
      (total, report) => total + (report.claimedLoss ?? 0),
      0
    ),
    reportsByPeriod: sortActivityPeriods(activityByMonth)
      .toReversed()
      .map(({ period, reports: count }) => ({ count, period })),
  };
};
