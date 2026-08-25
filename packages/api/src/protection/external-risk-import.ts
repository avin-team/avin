import { createHash, randomUUID } from "node:crypto";

import {
  protectionExternalImportRun,
  protectionRiskEvidence,
  protectionRiskEvidenceDerivative,
  protectionRiskIdentifier,
  protectionRiskReport,
  protectionRiskReportHistory,
} from "@avin/db/schema/protection";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";

import type { Context } from "../runtime/context";
import {
  createRiskReportEvidenceKey,
  isRiskReportEvidenceFileNameAllowed,
  PROTECTION_RISK_ORIGINALS_BUCKET,
  PROTECTION_RISK_PUBLIC_BUCKET,
  RISK_REPORT_EVIDENCE_CONTENT_TYPES,
  RISK_REPORT_EVIDENCE_MAX_BYTES,
} from "../runtime/storage";
import {
  getRiskIdentifierPublicValue,
  maskRiskIdentifier,
  normalizeRiskIdentifier,
} from "./risk-report";

export const CHONGSCAM_SOURCE = "chongscam";
export const CHONGSCAM_ORIGIN = "https://chongscam.vn";
export const CHONGSCAM_API_URL = `${CHONGSCAM_ORIGIN}/api/scam-reports`;
export const CHONGSCAM_REPORTS_URL = `${CHONGSCAM_ORIGIN}/reports`;
export const CHONGSCAM_IMPORT_PAGE_SIZE = 100;
export const CHONGSCAM_CRAWL_DELAY_MS = 1000;

const MAX_SOURCE_PAGES = 500;
const MAX_SUMMARY_LENGTH = 10_000;
const SOURCE_USER_AGENT = "Avin-ChongScam-Importer/1.0";

const getImportErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return "Import failed";
  }
  if (error.cause instanceof Error) {
    return `${error.message}: ${error.cause.message}`;
  }
  return error.message;
};

const chongScamEvidenceFileSchema = z.looseObject({
  evidenceType: z.string().trim().max(80).optional(),
  id: z.uuid(),
  name: z.string().trim().min(1).max(255),
  type: z.string().trim().min(1).max(120),
  url: z.string().trim().min(1).max(500),
});

const chongScamReportSchema = z.looseObject({
  bankAccount: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  description: z.string().nullable().optional(),
  evidenceFiles: z.array(chongScamEvidenceFileSchema).default([]),
  evidenceNames: z.array(z.string()).default([]),
  id: z.uuid(),
  identifier: z.string().nullable().optional(),
  lostAmount: z.number().int().nonnegative().nullable().optional(),
  phone: z.string().nullable().optional(),
  platformUrl: z.string().nullable().optional(),
  status: z.string().default("unknown"),
  suspectName: z.string().nullable().optional(),
  title: z.string().default("Cảnh báo từ ChongScam"),
  type: z.string().default("unknown"),
});

const chongScamPageSchema = z.looseObject({
  items: z.array(chongScamReportSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const externalRiskImportModeSchema = z.enum([
  "PREVIEW",
  "APPLY",
  "FULL_RECONCILE",
]);

export const externalRiskImportInputSchema = z.object({
  mode: externalRiskImportModeSchema,
});

export const externalRiskApplyInputSchema = z.object({
  mode: z.enum(["APPLY", "FULL_RECONCILE"]),
});

export const externalRiskAdminListInputSchema = z
  .object({
    includeHidden: z.boolean().optional(),
    search: z.string().trim().max(200).optional(),
  })
  .optional();

export const externalRiskAdminIdInputSchema = z.object({ id: z.uuid() });

type Database = Context["db"];
type ExternalStorage = NonNullable<Context["storage"]>;
type ChongScamReport = z.infer<typeof chongScamReportSchema>;
export type ExternalRiskIdentifierSource = Pick<
  ChongScamReport,
  "bankAccount" | "phone" | "type"
>;
type ChongScamEvidenceFile = z.infer<typeof chongScamEvidenceFileSchema>;
type ExternalRiskReport = typeof protectionRiskReport.$inferSelect;
type ExternalRiskIdentifier = typeof protectionRiskIdentifier.$inferSelect;
type ExternalImportRun = typeof protectionExternalImportRun.$inferSelect;
type ExternalRiskImportMode = z.infer<typeof externalRiskImportModeSchema>;
type RiskReportInsert = typeof protectionRiskReport.$inferInsert;
type RiskIdentifierInsert = typeof protectionRiskIdentifier.$inferInsert;
type FetchFunction = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

export interface ExternalImportRunView {
  completedAt: string | null;
  createdAt: string;
  createdCount: number;
  error: string | null;
  evidenceDownloadedCount: number;
  failedCount: number;
  fetchedCount: number;
  fullReconcile: boolean;
  hiddenCount: number;
  id: string;
  mode: string;
  source: string;
  startedAt: string;
  status: string;
  updatedCount: number;
}

export interface ExternalRiskReportView {
  adminHidden: boolean;
  externalSourceId: string;
  id: string;
  primaryIdentifier: string | null;
  publicSlug: string | null;
  sourceCreatedAt: string | null;
  sourceStatus: string;
  sourceTitle: string | null;
  sourceUrl: string | null;
  status: string;
  suspectName: string | null;
  updatedAt: string;
}

interface ImportCounts {
  createdCount: number;
  evidenceDownloadedCount: number;
  failedCount: number;
  fetchedCount: number;
  hiddenCount: number;
  updatedCount: number;
}

interface FetchOptions {
  fetchImpl?: FetchFunction;
  sleep?: (milliseconds: number) => Promise<void>;
}

interface ImportOptions extends FetchOptions {
  actorUserId: string;
  database: Database;
  mode: ExternalRiskImportMode;
  now?: Date;
  storage?: Context["storage"];
}

const defaultSleep = (milliseconds: number): Promise<void> =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
const noSleep = (): Promise<void> => Promise.resolve();

const toIso = (value: Date | null): string | null =>
  value?.toISOString() ?? null;

const trimOrNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed || null;
};

const parseDate = (value: string | undefined): Date | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const createThrottledFetch = ({
  fetchImpl = fetch,
  sleep = defaultSleep,
}: FetchOptions): FetchFunction => {
  let lastRequestAt = 0;

  return async (input, init) => {
    const remainingDelay =
      CHONGSCAM_CRAWL_DELAY_MS - (Date.now() - lastRequestAt);
    if (lastRequestAt > 0 && remainingDelay > 0) {
      await sleep(remainingDelay);
    }

    const response = await fetchImpl(input, {
      ...init,
      headers: {
        "User-Agent": SOURCE_USER_AGENT,
        ...init?.headers,
      },
    });
    lastRequestAt = Date.now();
    return response;
  };
};

const getChongScamPageUrl = (page: number): string => {
  const url = new URL(CHONGSCAM_API_URL);
  url.searchParams.set("pageSize", String(CHONGSCAM_IMPORT_PAGE_SIZE));
  url.searchParams.set("sort", "newest");
  url.searchParams.set("page", String(page));
  return url.toString();
};

const fetchPage = async (
  request: FetchFunction,
  page: number
): Promise<z.infer<typeof chongScamPageSchema>> => {
  const response = await request(getChongScamPageUrl(page));
  if (!response.ok) {
    throw new Error(`ChongScam API returned HTTP ${response.status}`);
  }
  return chongScamPageSchema.parse(await response.json());
};

export const fetchChongScamReports = async (
  options: FetchOptions = {}
): Promise<ChongScamReport[]> => {
  const request = createThrottledFetch(options);
  const firstPage = await fetchPage(request, 1);
  if (firstPage.totalPages > MAX_SOURCE_PAGES) {
    throw new Error("ChongScam returned an unexpectedly large page count");
  }

  const reports = [...firstPage.items];
  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const currentPage = await fetchPage(request, page);
    reports.push(...currentPage.items);
  }
  return reports;
};

const createSourceReportUrl = (sourceId: string): string =>
  `${CHONGSCAM_REPORTS_URL}/${encodeURIComponent(sourceId)}`;

const createPayloadHash = (report: ChongScamReport): string =>
  createHash("sha256").update(JSON.stringify(report)).digest("hex");

const normalizeSourceStatus = (status: string): string =>
  status.trim().toLowerCase() || "unknown";

const isSourceVerified = (status: string): boolean =>
  normalizeSourceStatus(status) === "verified";

const isSourceRemoved = (status: string): boolean =>
  ["deleted", "rejected", "removed", "withdrawn"].includes(
    normalizeSourceStatus(status)
  );

const mapSourceReportType = (
  report: ChongScamReport
): RiskReportInsert["type"] => {
  const sourceType = report.type.trim().toLowerCase();
  if (sourceType === "website" || sourceType === "malicious_website") {
    return "MALICIOUS_WEBSITE";
  }
  if (report.bankAccount || report.phone || sourceType === "bank_account") {
    return "BANK_WALLET_PHONE";
  }
  return "SOCIAL_GAME_ACCOUNT";
};

const inferPlatformUrlType = (
  value: string
): RiskIdentifierInsert["type"] | null => {
  if (!isHttpUrl(value)) {
    return null;
  }
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return /(?:facebook|instagram|tiktok|twitter|x\.com|youtube|telegram)/u.test(
      hostname
    )
      ? "SOCIAL_ACCOUNT"
      : "WEBSITE";
  } catch {
    return null;
  }
};

export const inferExternalRiskIdentifierType = (
  value: string,
  report: ExternalRiskIdentifierSource
): RiskIdentifierInsert["type"] => {
  if (report.phone && value === report.phone) {
    return "PHONE";
  }
  if (report.bankAccount && value === report.bankAccount) {
    return "BANK_ACCOUNT";
  }
  if (isHttpUrl(value)) {
    const sourceType = report.type.trim().toLowerCase();
    return sourceType === "website" || sourceType === "malicious_website"
      ? "WEBSITE"
      : (inferPlatformUrlType(value) ?? "WEBSITE");
  }
  if (/^\+?[0-9 ()-]{6,}$/u.test(value)) {
    return "PHONE";
  }
  return "PLATFORM_ACCOUNT";
};

const inferIdentifierType = (
  value: string,
  report: ChongScamReport
): RiskIdentifierInsert["type"] =>
  inferExternalRiskIdentifierType(value, report);

const buildIdentifierRows = (
  reportId: string,
  sourceReport: ChongScamReport
): RiskIdentifierInsert[] => {
  const candidates: { type: RiskIdentifierInsert["type"]; value: string }[] =
    [];
  const addCandidate = (
    type: RiskIdentifierInsert["type"],
    value: string | null | undefined
  ): void => {
    const trimmed = trimOrNull(value);
    if (trimmed) {
      candidates.push({ type, value: trimmed });
    }
  };

  addCandidate("BANK_ACCOUNT", sourceReport.bankAccount);
  addCandidate("PHONE", sourceReport.phone);
  const identifier = trimOrNull(sourceReport.identifier);
  if (identifier) {
    addCandidate(inferIdentifierType(identifier, sourceReport), identifier);
  }
  const platformUrl = trimOrNull(sourceReport.platformUrl);
  if (platformUrl) {
    const platformType = inferPlatformUrlType(platformUrl);
    if (platformType) {
      addCandidate(platformType, platformUrl);
    }
  }

  const rows: RiskIdentifierInsert[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    try {
      const normalizedValue = normalizeRiskIdentifier(
        candidate.type,
        candidate.value
      );
      const key = `${candidate.type}:${normalizedValue}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      rows.push({
        isPrimary: rows.length === 0,
        maskedValue: maskRiskIdentifier(candidate.type, normalizedValue),
        normalizedValue,
        publicValue: getRiskIdentifierPublicValue(
          candidate.type,
          normalizedValue
        ),
        reportId,
        type: candidate.type,
        value: candidate.value,
      });
    } catch {
      // Keep malformed source identifiers in the raw payload, but never let
      // one malformed value abort the rest of an import.
    }
  }
  return rows;
};

const buildPublicSummary = (sourceReport: ChongScamReport): string => {
  const description = trimOrNull(sourceReport.description);
  const sourceNote = `Nguồn: ChongScam (${createSourceReportUrl(sourceReport.id)}).`;
  const summary = [description, sourceNote]
    .filter((part): part is string => Boolean(part))
    .join("\n\n");
  return summary.slice(0, MAX_SUMMARY_LENGTH);
};

const clampClaimedLoss = (value: number | null | undefined): number | null =>
  value !== undefined && value !== null && value <= 2_000_000_000
    ? value
    : null;

const getImportedReportStatus = (
  sourceStatus: string,
  hidden: boolean
): RiskReportInsert["status"] => {
  if (hidden || isSourceRemoved(sourceStatus)) {
    return "REMOVED";
  }
  if (isSourceVerified(sourceStatus)) {
    return "PUBLISHED";
  }
  return "UNDER_REVIEW";
};

const isExistingReportHidden = (existing?: ExternalRiskReport): boolean =>
  existing?.externalAdminHidden ?? false;

const getExistingPublishedAt = (existing?: ExternalRiskReport): Date | null =>
  existing?.publishedAt ?? null;

const getExistingReporterName = (existing?: ExternalRiskReport): string =>
  existing?.reporterName ?? "ChongScam (external import)";

const getImportedPublishedAt = (
  status: RiskReportInsert["status"],
  existingPublishedAt: Date | null | undefined,
  now: Date
): Date | null => {
  if (existingPublishedAt) {
    return existingPublishedAt;
  }
  return status === "PUBLISHED" ? now : null;
};

const buildExistingReportValues = ({
  existing,
  now,
  sourceCreatedAt,
  sourceReport,
}: {
  existing?: ExternalRiskReport;
  now: Date;
  sourceCreatedAt: Date | null;
  sourceReport: ChongScamReport;
}): Pick<
  RiskReportInsert,
  | "affectedVictimCount"
  | "createdAt"
  | "id"
  | "policyVersionId"
  | "publicSlug"
  | "reporterEmail"
  | "reporterName"
  | "reporterRelationship"
  | "reviewedAt"
  | "submittedAt"
> => ({
  affectedVictimCount: existing?.affectedVictimCount ?? 1,
  createdAt: existing?.createdAt ?? sourceCreatedAt ?? now,
  id: existing?.id,
  policyVersionId: existing?.policyVersionId ?? null,
  publicSlug: existing?.publicSlug ?? `chongscam-${sourceReport.id}`,
  reporterEmail:
    existing?.reporterEmail ??
    `external-import+${sourceReport.id}@avin.invalid`,
  reporterName: getExistingReporterName(existing),
  reporterRelationship:
    existing?.reporterRelationship ?? "NO_PROVIDER_RELATIONSHIP",
  reviewedAt: existing?.reviewedAt ?? now,
  submittedAt: existing?.submittedAt ?? now,
});

const buildExternalReportValues = ({
  existing,
  importRunId,
  now,
  sourceReport,
}: {
  existing?: ExternalRiskReport;
  importRunId: string;
  now: Date;
  sourceReport: ChongScamReport;
}): RiskReportInsert => {
  const sourceStatus = normalizeSourceStatus(sourceReport.status);
  const hidden = isExistingReportHidden(existing);
  const status = getImportedReportStatus(sourceStatus, hidden);
  const sourceCreatedAt = parseDate(sourceReport.createdAt);
  const publishedAt = getImportedPublishedAt(
    status,
    getExistingPublishedAt(existing),
    now
  );
  const existingValues = buildExistingReportValues({
    existing,
    now,
    sourceCreatedAt,
    sourceReport,
  });

  return {
    ...existingValues,
    claimedLoss: clampClaimedLoss(sourceReport.lostAmount),
    externalAdminHidden: hidden,
    externalBankName: trimOrNull(sourceReport.bankName),
    externalImportRunId: importRunId,
    externalLastSyncedAt: now,
    externalPayloadHash: createPayloadHash(sourceReport),
    externalPlatformUrl: trimOrNull(sourceReport.platformUrl),
    externalRawPayload: sourceReport,
    externalSource: CHONGSCAM_SOURCE,
    externalSourceCreatedAt: sourceCreatedAt,
    externalSourceId: sourceReport.id,
    externalSourceStatus: sourceStatus,
    externalSourceUrl: createSourceReportUrl(sourceReport.id),
    externalSuspectName: trimOrNull(sourceReport.suspectName),
    externalTitle: trimOrNull(sourceReport.title),
    narrative:
      trimOrNull(sourceReport.description) ??
      "Bản ghi được nhập từ nguồn dữ liệu ChongScam.",
    platform: trimOrNull(sourceReport.type),
    publicSummary: buildPublicSummary(sourceReport),
    publishedAt,
    reporterPhone: null,
    reporterUserId: null,
    reporterZalo: null,
    reviewReason: `Imported from ChongScam; source status: ${sourceStatus}`,
    reviewedByUserId: null,
    status,
    type: mapSourceReportType(sourceReport),
    underVerificationApproved: false,
    updatedAt: now,
    urgency: "NORMAL",
    violationType: null,
    withdrawalReason: null,
    withdrawalRequestedAt: null,
    withdrawalStatus: "NONE",
  };
};

const normalizeContentType = (value: string | null): string =>
  value?.split(";", 1)[0]?.trim().toLowerCase() ?? "";

const getAllowedEvidenceContentType = (
  declaredType: string,
  responseType: string | null
): (typeof RISK_REPORT_EVIDENCE_CONTENT_TYPES)[number] => {
  const normalizedDeclaredType = normalizeContentType(declaredType);
  const normalizedResponseType = normalizeContentType(responseType);
  if (
    normalizedResponseType &&
    !RISK_REPORT_EVIDENCE_CONTENT_TYPES.includes(
      normalizedResponseType as (typeof RISK_REPORT_EVIDENCE_CONTENT_TYPES)[number]
    )
  ) {
    throw new Error(
      `Unsupported evidence response content type: ${normalizedResponseType}`
    );
  }
  const contentType = normalizedResponseType || normalizedDeclaredType;
  if (
    !RISK_REPORT_EVIDENCE_CONTENT_TYPES.includes(
      contentType as (typeof RISK_REPORT_EVIDENCE_CONTENT_TYPES)[number]
    )
  ) {
    throw new Error(`Unsupported evidence content type: ${contentType}`);
  }
  return contentType as (typeof RISK_REPORT_EVIDENCE_CONTENT_TYPES)[number];
};

const normalizeEvidenceUrl = (
  value: string,
  sourceReportId: string
): string => {
  const url = new URL(value, CHONGSCAM_ORIGIN);
  const sourcePath = url.pathname.startsWith("/api/")
    ? url.pathname.slice("/api".length)
    : url.pathname;
  const expectedPathPrefix = `/scam-reports/${encodeURIComponent(sourceReportId)}/evidence/`;
  if (
    url.origin !== CHONGSCAM_ORIGIN ||
    !sourcePath.startsWith(expectedPathPrefix)
  ) {
    throw new Error("Evidence URL is outside the authorized source report");
  }
  url.pathname = `/api${sourcePath}`;
  return url.toString();
};

const sanitizeFileName = (fileName: string, contentType: string): string => {
  const sanitized = fileName
    .trim()
    .replaceAll(/[^a-zA-Z0-9._-]+/gu, "_")
    .slice(0, 240);
  const fallbackExtensions: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "text/plain": "txt",
    "video/mp4": "mp4",
    "video/webm": "webm",
  };
  const fallbackExtension = fallbackExtensions[contentType] ?? "bin";
  const candidate = sanitized || `evidence.${fallbackExtension}`;
  return isRiskReportEvidenceFileNameAllowed(candidate, contentType)
    ? candidate
    : `evidence.${fallbackExtension}`;
};

const downloadEvidence = async ({
  file,
  reportId,
  request,
  storage,
  sourceReportId,
}: {
  file: ChongScamEvidenceFile;
  reportId: string;
  request: FetchFunction;
  storage: ExternalStorage;
  sourceReportId: string;
}): Promise<{
  contentType: (typeof RISK_REPORT_EVIDENCE_CONTENT_TYPES)[number];
  fileName: string;
  id: string;
  originalStorageKey: string;
  sha256: string;
  sizeBytes: number;
}> => {
  const sourceUrl = normalizeEvidenceUrl(file.url, sourceReportId);
  const response = await request(sourceUrl);
  if (!response.ok) {
    throw new Error(`Evidence returned HTTP ${response.status}`);
  }
  const contentType = getAllowedEvidenceContentType(
    file.type,
    response.headers.get("content-type")
  );
  const contentLength = Number(response.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > RISK_REPORT_EVIDENCE_MAX_BYTES
  ) {
    throw new Error("Evidence file exceeds the configured size limit");
  }
  const body = new Uint8Array(await response.arrayBuffer());
  if (
    body.byteLength === 0 ||
    body.byteLength > RISK_REPORT_EVIDENCE_MAX_BYTES
  ) {
    throw new Error(
      "Evidence file is empty or exceeds the configured size limit"
    );
  }

  const id = randomUUID();
  const originalStorageKey = createRiskReportEvidenceKey(
    reportId,
    contentType,
    id
  );
  if (!storage.putObject) {
    throw new Error("Private evidence storage upload is not configured");
  }
  await storage.putObject({
    body,
    bucket: PROTECTION_RISK_ORIGINALS_BUCKET,
    cacheControl: "private, max-age=0",
    contentLength: body.byteLength,
    contentType,
    key: originalStorageKey,
  });

  return {
    contentType,
    fileName: sanitizeFileName(file.name, contentType),
    id,
    originalStorageKey,
    sha256: createHash("sha256").update(body).digest("hex"),
    sizeBytes: body.byteLength,
  };
};

const toRunView = (run: ExternalImportRun): ExternalImportRunView => ({
  completedAt: toIso(run.completedAt),
  createdAt: run.createdAt.toISOString(),
  createdCount: run.createdCount,
  error: run.error,
  evidenceDownloadedCount: run.evidenceDownloadedCount,
  failedCount: run.failedCount,
  fetchedCount: run.fetchedCount,
  fullReconcile: run.fullReconcile,
  hiddenCount: run.hiddenCount,
  id: run.id,
  mode: run.mode,
  source: run.source,
  startedAt: run.startedAt.toISOString(),
  status: run.status,
  updatedCount: run.updatedCount,
});

const findExternalReports = (database: Database) =>
  database
    .select()
    .from(protectionRiskReport)
    .where(eq(protectionRiskReport.externalSource, CHONGSCAM_SOURCE));

const assertNoActiveImport = async (database: Database): Promise<void> => {
  const [activeRun] = await database
    .select({ id: protectionExternalImportRun.id })
    .from(protectionExternalImportRun)
    .where(
      and(
        eq(protectionExternalImportRun.source, CHONGSCAM_SOURCE),
        eq(protectionExternalImportRun.status, "RUNNING")
      )
    )
    .limit(1);
  if (activeRun) {
    throw new ORPCError("CONFLICT", {
      message: "Một lần đồng bộ ChongScam khác đang chạy.",
    });
  }
};

const createRun = async ({
  actorUserId,
  database,
  fullReconcile,
  mode,
  now,
}: {
  actorUserId: string;
  database: Database;
  fullReconcile: boolean;
  mode: ExternalRiskImportMode;
  now: Date;
}): Promise<ExternalImportRun> => {
  const [run] = await database
    .insert(protectionExternalImportRun)
    .values({
      actorUserId,
      createdAt: now,
      fullReconcile,
      mode,
      source: CHONGSCAM_SOURCE,
      startedAt: now,
      status: "RUNNING",
    })
    .returning();
  if (!run) {
    throw new ORPCError("CONFLICT", {
      message: "Không thể khởi tạo phiên đồng bộ ChongScam.",
    });
  }
  return run;
};

const updateRun = async (
  database: Database,
  runId: string,
  values: Partial<typeof protectionExternalImportRun.$inferInsert>
): Promise<ExternalImportRun> => {
  const [run] = await database
    .update(protectionExternalImportRun)
    .set(values)
    .where(eq(protectionExternalImportRun.id, runId))
    .returning();
  if (!run) {
    throw new ORPCError("NOT_FOUND", { message: "Import run not found" });
  }
  return run;
};

const removeExternalMaterials = async ({
  database,
  reportId,
  storage,
}: {
  database: Database;
  reportId: string;
  storage?: Context["storage"];
}): Promise<void> => {
  const evidence = await database
    .select({
      derivativeStorageKey: protectionRiskEvidenceDerivative.storageKey,
      originalStorageKey: protectionRiskEvidence.originalStorageKey,
    })
    .from(protectionRiskEvidence)
    .leftJoin(
      protectionRiskEvidenceDerivative,
      eq(protectionRiskEvidenceDerivative.evidenceId, protectionRiskEvidence.id)
    )
    .where(eq(protectionRiskEvidence.reportId, reportId));
  if (storage) {
    for (const item of evidence) {
      try {
        await storage.deleteObject(
          item.originalStorageKey,
          PROTECTION_RISK_ORIGINALS_BUCKET
        );
      } catch {
        // A missing object must not prevent the database projection from being
        // refreshed on the next manual sync.
      }
      if (item.derivativeStorageKey) {
        try {
          await storage.deleteObject(
            item.derivativeStorageKey,
            PROTECTION_RISK_PUBLIC_BUCKET
          );
        } catch {
          // A missing object must not prevent the database projection from being
          // refreshed on the next manual sync.
        }
      }
    }
  }
  await database
    .delete(protectionRiskIdentifier)
    .where(eq(protectionRiskIdentifier.reportId, reportId));
  await database
    .delete(protectionRiskEvidence)
    .where(eq(protectionRiskEvidence.reportId, reportId));
};

const hasMissingExternalEvidence = async ({
  database,
  reportId,
  sourceEvidenceIds,
}: {
  database: Database;
  reportId: string;
  sourceEvidenceIds: readonly string[];
}): Promise<boolean> => {
  const existingEvidence = await database
    .select({ externalEvidenceId: protectionRiskEvidence.externalEvidenceId })
    .from(protectionRiskEvidence)
    .where(eq(protectionRiskEvidence.reportId, reportId));
  const existingEvidenceIds = new Set<string>();
  for (const evidence of existingEvidence) {
    if (evidence.externalEvidenceId) {
      existingEvidenceIds.add(evidence.externalEvidenceId);
    }
  }
  const sourceEvidenceIdSet = new Set(sourceEvidenceIds);
  if (existingEvidenceIds.size !== sourceEvidenceIdSet.size) {
    return true;
  }
  for (const sourceEvidenceId of sourceEvidenceIdSet) {
    if (!existingEvidenceIds.has(sourceEvidenceId)) {
      return true;
    }
  }
  return false;
};

const upsertExternalReport = async ({
  database,
  importRunId,
  now,
  request,
  sourceReport,
  storage,
}: {
  database: Database;
  importRunId: string;
  now: Date;
  request: FetchFunction;
  sourceReport: ChongScamReport;
  storage?: Context["storage"];
}): Promise<{
  created: boolean;
  evidenceDownloadedCount: number;
  updated: boolean;
}> => {
  const [existing] = await database
    .select()
    .from(protectionRiskReport)
    .where(
      and(
        eq(protectionRiskReport.externalSource, CHONGSCAM_SOURCE),
        eq(protectionRiskReport.externalSourceId, sourceReport.id)
      )
    )
    .limit(1);
  const payloadHash = createPayloadHash(sourceReport);
  const evidenceNeedsSync =
    existing?.externalPayloadHash === payloadHash
      ? await hasMissingExternalEvidence({
          database,
          reportId: existing.id,
          sourceEvidenceIds: sourceReport.evidenceFiles.map(
            (sourceEvidence) => sourceEvidence.id
          ),
        })
      : false;
  const changed =
    !existing ||
    existing.externalPayloadHash !== payloadHash ||
    evidenceNeedsSync;
  if (!changed) {
    await database
      .update(protectionRiskReport)
      .set({ externalImportRunId: importRunId, externalLastSyncedAt: now })
      .where(eq(protectionRiskReport.id, existing.id));
    return { created: false, evidenceDownloadedCount: 0, updated: false };
  }

  const values = buildExternalReportValues({
    existing,
    importRunId,
    now,
    sourceReport,
  });
  let report: ExternalRiskReport | undefined;
  if (existing) {
    [report] = await database
      .update(protectionRiskReport)
      .set(values)
      .where(eq(protectionRiskReport.id, existing.id))
      .returning();
  } else {
    [report] = await database
      .insert(protectionRiskReport)
      .values(values)
      .returning();
  }
  if (!report) {
    throw new Error("Could not save imported risk report");
  }

  await removeExternalMaterials({ database, reportId: report.id, storage });
  const identifierRows = buildIdentifierRows(report.id, sourceReport);
  if (identifierRows.length > 0) {
    await database.insert(protectionRiskIdentifier).values(identifierRows);
  }

  let evidenceDownloadedCount = 0;
  const evidenceErrors: string[] = [];
  if (sourceReport.evidenceFiles.length > 0 && storage?.putObject) {
    for (const sourceEvidence of sourceReport.evidenceFiles) {
      try {
        const downloaded = await downloadEvidence({
          file: sourceEvidence,
          reportId: report.id,
          request,
          sourceReportId: sourceReport.id,
          storage,
        });
        await database.insert(protectionRiskEvidence).values({
          contentType: downloaded.contentType,
          externalEvidenceId: sourceEvidence.id,
          fileName: downloaded.fileName,
          id: downloaded.id,
          immutableAt: now,
          kind:
            sourceEvidence.evidenceType?.toLowerCase() === "bill"
              ? "PAYMENT_PROOF"
              : "SCREENSHOT",
          originalStorageKey: downloaded.originalStorageKey,
          reportId: report.id,
          scanReason:
            "Imported source file; malware and PII scan has not been run.",
          scanStatus: "PENDING",
          sha256: downloaded.sha256,
          sizeBytes: downloaded.sizeBytes,
        });
        evidenceDownloadedCount += 1;
      } catch (error) {
        evidenceErrors.push(
          `${sourceEvidence.name}: ${
            error instanceof Error ? error.message : "download failed"
          }`
        );
      }
    }
  } else if (sourceReport.evidenceFiles.length > 0) {
    evidenceErrors.push("Private storage upload is not configured");
  }

  await database.insert(protectionRiskReportHistory).values({
    actorUserId: null,
    createdAt: now,
    isPublic: report.status === "PUBLISHED",
    reason: evidenceErrors.length
      ? `Imported from ChongScam. Evidence errors: ${evidenceErrors.join("; ")}`
      : "Imported from ChongScam; current source payload overwrote the previous projection.",
    reportId: report.id,
    status: report.status,
  });

  if (evidenceErrors.length > 0) {
    throw new Error(evidenceErrors.join("; "));
  }
  return {
    created: !existing,
    evidenceDownloadedCount,
    updated: Boolean(existing),
  };
};

const hideMissingReports = async ({
  database,
  importRunId,
  now,
  sourceIds,
}: {
  database: Database;
  importRunId: string;
  now: Date;
  sourceIds: Set<string>;
}): Promise<number> => {
  const existingReports = await findExternalReports(database);
  let hiddenCount = 0;
  for (const report of existingReports) {
    if (!report.externalSourceId || sourceIds.has(report.externalSourceId)) {
      continue;
    }
    if (report.status !== "REMOVED") {
      hiddenCount += 1;
    }
    await database
      .update(protectionRiskReport)
      .set({
        externalImportRunId: importRunId,
        externalLastSyncedAt: now,
        externalSourceStatus: "removed",
        status: "REMOVED",
        updatedAt: now,
      })
      .where(eq(protectionRiskReport.id, report.id));
  }
  return hiddenCount;
};

export const runExternalRiskImport = async ({
  actorUserId,
  database,
  fetchImpl,
  mode,
  now = new Date(),
  sleep,
  storage,
}: ImportOptions): Promise<ExternalImportRunView> => {
  await assertNoActiveImport(database);
  const fullReconcile = mode === "FULL_RECONCILE";
  const run = await createRun({
    actorUserId,
    database,
    fullReconcile,
    mode,
    now,
  });
  const request = createThrottledFetch({ fetchImpl, sleep });

  try {
    const sourceReports = await fetchChongScamReports({
      fetchImpl: request,
      sleep: noSleep,
    });
    const existingReports = await findExternalReports(database);
    const existingBySourceId = new Map<string, ExternalRiskReport>();
    for (const report of existingReports) {
      if (report.externalSourceId) {
        existingBySourceId.set(report.externalSourceId, report);
      }
    }
    const sourceIds = new Set(sourceReports.map((report) => report.id));
    const counts: ImportCounts = {
      createdCount: 0,
      evidenceDownloadedCount: 0,
      failedCount: 0,
      fetchedCount: sourceReports.length,
      hiddenCount: 0,
      updatedCount: 0,
    };
    let firstItemError: string | null = null;

    if (mode === "PREVIEW") {
      for (const sourceReport of sourceReports) {
        const existing = existingBySourceId.get(sourceReport.id);
        if (!existing) {
          counts.createdCount += 1;
        } else if (
          existing.externalPayloadHash !== createPayloadHash(sourceReport)
        ) {
          counts.updatedCount += 1;
        }
      }
      if (fullReconcile) {
        counts.hiddenCount = existingReports.filter(
          (report) =>
            report.externalSourceId && !sourceIds.has(report.externalSourceId)
        ).length;
      }
    } else {
      for (const sourceReport of sourceReports) {
        try {
          const result = await upsertExternalReport({
            database,
            importRunId: run.id,
            now,
            request,
            sourceReport,
            storage,
          });
          if (result.created) {
            counts.createdCount += 1;
          } else if (result.updated) {
            counts.updatedCount += 1;
          }
          counts.evidenceDownloadedCount += result.evidenceDownloadedCount;
        } catch (error) {
          counts.failedCount += 1;
          firstItemError ??= getImportErrorMessage(error);
        }
      }
      if (fullReconcile) {
        counts.hiddenCount = await hideMissingReports({
          database,
          importRunId: run.id,
          now,
          sourceIds,
        });
      }
    }

    const completedRun = await updateRun(database, run.id, {
      ...counts,
      completedAt: new Date(),
      error: firstItemError,
      status: "COMPLETED",
    });
    return toRunView(completedRun);
  } catch (error) {
    const failedRun = await updateRun(database, run.id, {
      completedAt: new Date(),
      error: getImportErrorMessage(error),
      status: "FAILED",
    });
    throw new ORPCError("BAD_GATEWAY", {
      message: failedRun.error ?? "Không thể đồng bộ dữ liệu ChongScam.",
    });
  }
};

export const listExternalImportRuns = async (
  database: Database
): Promise<ExternalImportRunView[]> => {
  const runs = await database
    .select()
    .from(protectionExternalImportRun)
    .where(eq(protectionExternalImportRun.source, CHONGSCAM_SOURCE))
    .orderBy(desc(protectionExternalImportRun.createdAt))
    .limit(20);
  return runs.map(toRunView);
};

export const listExternalRiskReports = async (
  database: Database,
  input?: z.infer<typeof externalRiskAdminListInputSchema>
): Promise<ExternalRiskReportView[]> => {
  const reports = await database
    .select()
    .from(protectionRiskReport)
    .where(
      and(
        eq(protectionRiskReport.externalSource, CHONGSCAM_SOURCE),
        input?.includeHidden
          ? undefined
          : eq(protectionRiskReport.externalAdminHidden, false)
      )
    )
    .orderBy(desc(protectionRiskReport.updatedAt));
  const identifiers = reports.length
    ? await database
        .select()
        .from(protectionRiskIdentifier)
        .where(
          inArray(
            protectionRiskIdentifier.reportId,
            reports.map((report) => report.id)
          )
        )
    : [];
  const identifiersByReportId = new Map<string, ExternalRiskIdentifier[]>();
  const primaryIdentifiersByReportId = new Map<string, string>();
  for (const identifier of identifiers) {
    const reportIdentifiers = identifiersByReportId.get(identifier.reportId);
    if (reportIdentifiers) {
      reportIdentifiers.push(identifier);
    } else {
      identifiersByReportId.set(identifier.reportId, [identifier]);
    }
    if (identifier.isPrimary) {
      primaryIdentifiersByReportId.set(
        identifier.reportId,
        identifier.maskedValue
      );
    }
  }
  const search = input?.search?.toLowerCase();
  const views: ExternalRiskReportView[] = [];
  for (const report of reports) {
    const reportIdentifiers = identifiersByReportId.get(report.id) ?? [];
    if (search) {
      const searchValues = [
        report.externalSourceId,
        report.externalTitle,
        report.externalSuspectName,
        report.externalSourceStatus,
      ];
      for (const identifier of reportIdentifiers) {
        searchValues.push(identifier.value);
      }
      const matchesSearch = searchValues.some((value) =>
        value?.toLowerCase().includes(search)
      );
      if (!matchesSearch) {
        continue;
      }
    }
    views.push({
      adminHidden: report.externalAdminHidden,
      externalSourceId: report.externalSourceId ?? "",
      id: report.id,
      primaryIdentifier: primaryIdentifiersByReportId.get(report.id) ?? null,
      publicSlug: report.publicSlug,
      sourceCreatedAt: toIso(report.externalSourceCreatedAt),
      sourceStatus: report.externalSourceStatus ?? "unknown",
      sourceTitle: report.externalTitle,
      sourceUrl: report.externalSourceUrl,
      status: report.status,
      suspectName: report.externalSuspectName,
      updatedAt: report.updatedAt.toISOString(),
    });
  }
  return views;
};

export const hideExternalRiskReport = async ({
  database,
  id,
  reviewerUserId,
  now = new Date(),
}: {
  database: Database;
  id: string;
  now?: Date;
  reviewerUserId: string;
}): Promise<ExternalRiskReportView> => {
  const [report] = await database
    .select()
    .from(protectionRiskReport)
    .where(
      and(
        eq(protectionRiskReport.id, id),
        eq(protectionRiskReport.externalSource, CHONGSCAM_SOURCE)
      )
    )
    .limit(1);
  if (!report) {
    throw new ORPCError("NOT_FOUND", { message: "Imported report not found" });
  }
  await database
    .update(protectionRiskReport)
    .set({
      externalAdminHidden: true,
      reviewReason: "Hidden by Avin Admin",
      reviewedAt: now,
      reviewedByUserId: reviewerUserId,
      status: "REMOVED",
      updatedAt: now,
    })
    .where(eq(protectionRiskReport.id, id));
  const updatedReports = await listExternalRiskReports(database, {
    includeHidden: true,
  });
  const updated = updatedReports.find((item) => item.id === id);
  if (!updated) {
    throw new ORPCError("CONFLICT", {
      message: "Imported report update failed",
    });
  }
  return updated;
};

export const restoreExternalRiskReport = async ({
  database,
  id,
  reviewerUserId,
  now = new Date(),
}: {
  database: Database;
  id: string;
  now?: Date;
  reviewerUserId: string;
}): Promise<ExternalRiskReportView> => {
  const [report] = await database
    .select()
    .from(protectionRiskReport)
    .where(
      and(
        eq(protectionRiskReport.id, id),
        eq(protectionRiskReport.externalSource, CHONGSCAM_SOURCE)
      )
    )
    .limit(1);
  if (!report) {
    throw new ORPCError("NOT_FOUND", { message: "Imported report not found" });
  }
  const nextStatus: RiskReportInsert["status"] = isSourceVerified(
    report.externalSourceStatus ?? ""
  )
    ? "PUBLISHED"
    : "UNDER_REVIEW";
  await database
    .update(protectionRiskReport)
    .set({
      externalAdminHidden: false,
      reviewReason: "Restored by Avin Admin",
      reviewedAt: now,
      reviewedByUserId: reviewerUserId,
      status: nextStatus,
      updatedAt: now,
    })
    .where(eq(protectionRiskReport.id, id));
  const updatedReports = await listExternalRiskReports(database, {
    includeHidden: true,
  });
  const updated = updatedReports.find((item) => item.id === id);
  if (!updated) {
    throw new ORPCError("CONFLICT", {
      message: "Imported report update failed",
    });
  }
  return updated;
};

export const isExternalRiskReport = (report: {
  externalSource: string | null;
}): boolean => report.externalSource === CHONGSCAM_SOURCE;

export const publicExternalRiskFilter = or(
  isNull(protectionRiskReport.externalSource),
  and(
    eq(protectionRiskReport.externalAdminHidden, false),
    eq(protectionRiskReport.status, "PUBLISHED")
  )
);
