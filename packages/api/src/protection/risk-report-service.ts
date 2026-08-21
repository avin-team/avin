import {
  protectionRiskEvidence,
  protectionRiskEvidenceDerivative,
  protectionRiskIdentifier,
  protectionRiskReport,
  protectionRiskReportEmailDelivery,
  protectionRiskReportHistory,
  protectionSupportReview,
} from "@avin/db/schema/protection";
import { env } from "@avin/env/server";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";

import {
  createNotificationEvent,
  listNotificationRecipientsByRole,
} from "../notifications/notification";
import type { NotificationEventType } from "../notifications/notification-logic";
import type { Context } from "../runtime/context";
import {
  createPublicMediaUrl,
  isRiskReportDerivativeKey,
  isRiskReportEvidenceFileNameAllowed,
  isRiskReportEvidenceKey,
  PROTECTION_RISK_ORIGINALS_BUCKET,
  RISK_REPORT_EVIDENCE_CONTENT_TYPES,
  RISK_REPORT_EVIDENCE_MAX_BYTES,
  RISK_REPORT_EVIDENCE_MAX_COUNT,
} from "../runtime/storage";
import { getProtectionLaunchConfiguration } from "./configuration";
import { assertProtectionOperationAllowed } from "./launch-gates";
import type { ProtectionLaunchConfiguration } from "./launch-gates";
import {
  assertRiskReportSubmission,
  assertRiskReportTransition,
  createRiskReportEmailSubject,
  createRiskReportPublicPath as createPublicWarningPath,
  createRiskReportPublicSlug,
  getRiskIdentifierPublicValue,
  getRiskReportIdentifierTypes,
  isRiskReportUnderVerificationEligible,
  isPublicRiskReportStatus,
  maskRiskIdentifier,
  normalizeRiskIdentifier,
} from "./risk-report";
import type {
  RiskReportDecisionStatus,
  RiskReportDraftInput,
  RiskReportEvidenceInput,
  RiskReportIdentifierInput,
  RiskReportStatus,
  RiskReportSubmissionEvidence,
} from "./risk-report";

type Database = Context["db"];
type RiskReport = typeof protectionRiskReport.$inferSelect;
type RiskIdentifier = typeof protectionRiskIdentifier.$inferSelect;
type RiskEvidence = typeof protectionRiskEvidence.$inferSelect;
type RiskDerivative = typeof protectionRiskEvidenceDerivative.$inferSelect;
type RiskHistory = typeof protectionRiskReportHistory.$inferSelect;
type SupportReviewPublicOutcome =
  typeof protectionSupportReview.$inferSelect.publicOutcome;

const RISK_EMAIL_SOURCE_TYPE = "PROTECTION_RISK_REPORT";

const riskReportNotificationEvents: Partial<
  Record<RiskReportStatus, NotificationEventType>
> = {
  CHANGES_REQUESTED: "protection_risk_report.changes_requested",
  CORRECTED: "protection_risk_report.corrected",
  PUBLISHED: "protection_risk_report.published",
  REJECTED: "protection_risk_report.rejected",
  REMOVED: "protection_risk_report.removed",
  SUBMITTED: "protection_risk_report.submitted",
  UNDER_VERIFICATION: "protection_risk_report.under_verification",
};

const toIso = (value: Date | null): string | null =>
  value?.toISOString() ?? null;

const isRiskEvidenceContentType = (
  value: string
): value is (typeof RISK_REPORT_EVIDENCE_CONTENT_TYPES)[number] =>
  RISK_REPORT_EVIDENCE_CONTENT_TYPES.includes(
    value as (typeof RISK_REPORT_EVIDENCE_CONTENT_TYPES)[number]
  );

const throwBadRequest = (message: string): never => {
  throw new ORPCError("BAD_REQUEST", { message });
};

const findOwnedReport = async (
  database: Database,
  reporterUserId: string,
  reportId: string
): Promise<{ report: RiskReport }> => {
  const [report] = await database
    .select()
    .from(protectionRiskReport)
    .where(
      and(
        eq(protectionRiskReport.id, reportId),
        eq(protectionRiskReport.reporterUserId, reporterUserId)
      )
    )
    .limit(1);

  if (!report) {
    throw new ORPCError("NOT_FOUND", { message: "Risk report not found" });
  }

  return { report };
};

const toPrivateIdentifierView = (identifier: RiskIdentifier) => ({
  id: identifier.id,
  isPrimary: identifier.isPrimary,
  maskedValue: identifier.maskedValue,
  normalizedValue: identifier.normalizedValue,
  publicValue: identifier.publicValue,
  type: identifier.type,
  value: identifier.value,
});

const toPrivateEvidenceView = (
  evidence: RiskEvidence,
  derivative?: RiskDerivative | null
) => ({
  contentType: evidence.contentType,
  derivative: derivative
    ? {
        contentType: derivative.contentType,
        id: derivative.id,
        metadataRemoved: derivative.metadataRemoved,
        sizeBytes: derivative.sizeBytes,
        storageKey: derivative.storageKey,
        unrelatedPiiRedacted: derivative.unrelatedPiiRedacted,
        watermarkApplied: derivative.watermarkApplied,
      }
    : null,
  fileName: evidence.fileName,
  id: evidence.id,
  immutableAt: evidence.immutableAt.toISOString(),
  kind: evidence.kind,
  originalStorageKey: evidence.originalStorageKey,
  scanReason: evidence.scanReason,
  scanStatus: evidence.scanStatus,
  sha256: evidence.sha256,
  sizeBytes: evidence.sizeBytes,
});

const toDraftView = (
  report: RiskReport,
  identifiers: RiskIdentifier[],
  evidence: RiskEvidence[]
) => ({
  affectedVictimCount: report.affectedVictimCount,
  claimedLoss: report.claimedLoss,
  createdAt: report.createdAt.toISOString(),
  evidence: evidence.map((item) => toPrivateEvidenceView(item)),
  id: report.id,
  identifiers: identifiers.map(toPrivateIdentifierView),
  narrative: report.narrative,
  platform: report.platform,
  reporterName: report.reporterName,
  reporterPhone: report.reporterPhone,
  reporterZalo: report.reporterZalo,
  reviewReason: report.reviewReason,
  status: report.status,
  submittedAt: toIso(report.submittedAt),
  type: report.type,
  underVerificationApproved: report.underVerificationApproved,
  updatedAt: report.updatedAt.toISOString(),
  urgency: report.urgency,
  violationType: report.violationType,
});

const loadReportMaterials = async (
  database: Database,
  reportId: string
): Promise<{
  derivatives: RiskDerivative[];
  evidence: RiskEvidence[];
  history: RiskHistory[];
  identifiers: RiskIdentifier[];
}> => {
  const [identifiers, evidence, history] = await Promise.all([
    database
      .select()
      .from(protectionRiskIdentifier)
      .where(eq(protectionRiskIdentifier.reportId, reportId)),
    database
      .select()
      .from(protectionRiskEvidence)
      .where(eq(protectionRiskEvidence.reportId, reportId)),
    database
      .select()
      .from(protectionRiskReportHistory)
      .where(eq(protectionRiskReportHistory.reportId, reportId))
      .orderBy(desc(protectionRiskReportHistory.createdAt)),
  ]);

  const derivatives = evidence.length
    ? await database
        .select()
        .from(protectionRiskEvidenceDerivative)
        .where(
          inArray(
            protectionRiskEvidenceDerivative.evidenceId,
            evidence.map((item) => item.id)
          )
        )
    : [];

  return { derivatives, evidence, history, identifiers };
};

type ReportMaterials = Awaited<ReturnType<typeof loadReportMaterials>>;

const enqueueRiskEmail = async ({
  database,
  eventType,
  htmlBody,
  now,
  recipientEmail,
  reportId,
  sourceId,
  sourceType,
  subject,
  textBody,
}: {
  database: Database;
  eventType: string;
  htmlBody: string;
  now: Date;
  recipientEmail: string;
  reportId?: string | null;
  sourceId: string;
  sourceType: string;
  subject: string;
  textBody: string;
}): Promise<void> => {
  await database
    .insert(protectionRiskReportEmailDelivery)
    .values({
      createdAt: now,
      eventType,
      firstAttemptAt: null,
      htmlBody,
      nextAttemptAt: now,
      recipientEmail,
      reportId: reportId ?? null,
      retryWindowStartedAt: now,
      sourceId,
      sourceType,
      subject,
      textBody,
      updatedAt: now,
    })
    .onConflictDoNothing({
      target: [
        protectionRiskReportEmailDelivery.sourceType,
        protectionRiskReportEmailDelivery.sourceId,
        protectionRiskReportEmailDelivery.eventType,
        protectionRiskReportEmailDelivery.recipientEmail,
      ],
    });
};

const escapeHtml = (value: string): string =>
  value.replaceAll(
    /[&<>"']/gu,
    (character) =>
      ({
        '"': "&quot;",
        "&": "&amp;",
        "'": "&#39;",
        "<": "&lt;",
        ">": "&gt;",
      })[character] ?? character
  );

const enqueueRiskReportStatusEmail = async (
  database: Database,
  report: RiskReport,
  status: RiskReportStatus,
  reason: string | null | undefined,
  now: Date
): Promise<void> => {
  const subject = createRiskReportEmailSubject(status);
  const safeReason = reason?.trim() ?? "";
  const textBody = [
    `Báo cáo Avin Check của bạn ${status.toLowerCase()}.`,
    safeReason ? `Ghi chú: ${safeReason}` : "",
    "Bạn có thể mở mục Báo cáo của tôi trong Avin Check để theo dõi trạng thái.",
  ]
    .filter(Boolean)
    .join("\n\n");
  await enqueueRiskEmail({
    database,
    eventType: `report.${status.toLowerCase()}`,
    htmlBody: `<p>${escapeHtml(textBody).replaceAll("\n\n", "</p><p>")}</p>`,
    now,
    recipientEmail: report.reporterEmail,
    reportId: report.id,
    sourceId: `${report.id}:${status}`,
    sourceType: RISK_EMAIL_SOURCE_TYPE,
    subject,
    textBody,
  });
};

const notifyRiskModerators = async (
  database: Database,
  report: RiskReport,
  status: RiskReportStatus,
  now: Date
): Promise<void> => {
  const eventType = riskReportNotificationEvents[status];
  if (!eventType) {
    return;
  }

  const recipients = await listNotificationRecipientsByRole(database, {
    role: "ADMIN",
    targetPath: `/avin-check/risk-reports/${report.id}`,
  });
  await createNotificationEvent(database, {
    body: `Risk report ${report.id} is ${status.toLowerCase()}.`,
    context: { status, type: report.type },
    eventType,
    now,
    recipients,
    sourceId: report.id,
    sourceType: "PROTECTION_RISK_REPORT",
    title: "Avin Check risk report update",
  });
};

const notifyRiskReporter = async (
  database: Database,
  report: RiskReport,
  status: RiskReportStatus,
  now: Date
): Promise<void> => {
  const eventType = riskReportNotificationEvents[status];
  if (!eventType) {
    return;
  }

  await createNotificationEvent(database, {
    body: `Báo cáo Avin Check của bạn đang ở trạng thái ${status.toLowerCase()}.`,
    context: { status, type: report.type },
    eventType,
    now,
    recipients: [
      { targetPath: "/avin-check/reports", userId: report.reporterUserId },
    ],
    sourceId: report.id,
    sourceType: "PROTECTION_RISK_REPORT",
    title: "Avin Check: cập nhật báo cáo",
  });
};

const buildIdentifierRows = (
  reportId: string,
  identifiers: readonly RiskReportIdentifierInput[]
) =>
  identifiers.map((identifier, index) => {
    const normalizedValue = normalizeRiskIdentifier(
      identifier.type,
      identifier.value
    );
    const publicValue = getRiskIdentifierPublicValue(
      identifier.type,
      normalizedValue
    );
    return {
      isPrimary: index === 0,
      maskedValue: maskRiskIdentifier(identifier.type, normalizedValue),
      normalizedValue,
      publicValue,
      reportId,
      type: identifier.type,
      value: identifier.value.trim(),
    };
  });

const buildRiskReportDraftUpdates = (
  input: RiskReportDraftInput,
  now: Date
): Partial<typeof protectionRiskReport.$inferInsert> => {
  const updates: Partial<typeof protectionRiskReport.$inferInsert> = {
    updatedAt: now,
  };
  if (input.affectedVictimCount !== undefined) {
    updates.affectedVictimCount = input.affectedVictimCount;
  }
  if (input.claimedLoss !== undefined) {
    updates.claimedLoss = input.claimedLoss;
  }
  if (input.narrative !== undefined) {
    updates.narrative = input.narrative;
  }
  if (input.platform !== undefined) {
    updates.platform = input.platform;
  }
  if (input.reporterPhone !== undefined) {
    updates.reporterPhone = input.reporterPhone;
  }
  if (input.reporterZalo !== undefined) {
    updates.reporterZalo = input.reporterZalo;
  }
  if (input.urgency !== undefined) {
    updates.urgency = input.urgency;
  }
  if (input.violationType !== undefined) {
    updates.violationType = input.violationType;
  }
  return updates;
};

const buildRiskReportDraftValues = (
  input: RiskReportDraftInput,
  now: Date,
  reporterUserId: string,
  reporterEmail: string,
  reporterName: string
): typeof protectionRiskReport.$inferInsert => ({
  affectedVictimCount: input.affectedVictimCount,
  claimedLoss: input.claimedLoss,
  createdAt: now,
  narrative: input.narrative,
  platform: input.platform,
  reporterEmail,
  reporterName,
  reporterPhone: input.reporterPhone,
  reporterUserId,
  reporterZalo: input.reporterZalo,
  type: input.type,
  updatedAt: now,
  urgency: input.urgency,
  violationType: input.violationType,
});

export const saveRiskReportDraft = async ({
  database,
  input,
  now = new Date(),
  reporterEmail,
  reporterName,
  reporterUserId,
}: {
  database: Database;
  input: RiskReportDraftInput;
  now?: Date;
  reporterEmail: string;
  reporterName: string;
  reporterUserId: string;
}) => {
  let report: RiskReport | undefined;

  if (input.reportId) {
    [report] = await database
      .select()
      .from(protectionRiskReport)
      .where(
        and(
          eq(protectionRiskReport.id, input.reportId),
          eq(protectionRiskReport.reporterUserId, reporterUserId)
        )
      )
      .limit(1);
    if (!report) {
      throw new ORPCError("NOT_FOUND", { message: "Risk report not found" });
    }
    if (report.type !== input.type) {
      throwBadRequest(
        "A report type cannot be changed after the draft is created"
      );
    }
    if (report.status !== "DRAFT" && report.status !== "CHANGES_REQUESTED") {
      throw new ORPCError("CONFLICT", {
        message: "Only a draft or a report requesting changes can be edited.",
      });
    }
  }

  if (report) {
    const updates = buildRiskReportDraftUpdates(input, now);
    [report] = await database
      .update(protectionRiskReport)
      .set(updates)
      .where(eq(protectionRiskReport.id, report.id))
      .returning();
  } else {
    [report] = await database
      .insert(protectionRiskReport)
      .values(
        buildRiskReportDraftValues(
          input,
          now,
          reporterUserId,
          reporterEmail,
          reporterName
        )
      )
      .returning();
  }

  if (!report) {
    throw new ORPCError("CONFLICT", {
      message: "Risk draft could not be saved",
    });
  }

  if (input.identifiers !== undefined) {
    const allowedTypes = new Set(getRiskReportIdentifierTypes(input.type));
    for (const identifier of input.identifiers) {
      if (!allowedTypes.has(identifier.type)) {
        throwBadRequest("The identifier does not match this report type");
      }
    }
    await database
      .delete(protectionRiskIdentifier)
      .where(eq(protectionRiskIdentifier.reportId, report.id));
    const rows = buildIdentifierRows(report.id, input.identifiers);
    if (rows.length > 0) {
      await database.insert(protectionRiskIdentifier).values(rows);
    }
  }

  const materials = await loadReportMaterials(database, report.id);
  return toDraftView(report, materials.identifiers, materials.evidence);
};

export const getRiskReportMine = async ({
  database,
  reportId,
  reporterUserId,
}: {
  database: Database;
  reportId?: string;
  reporterUserId: string;
}) => {
  const reports = await database
    .select()
    .from(protectionRiskReport)
    .where(
      reportId
        ? and(
            eq(protectionRiskReport.id, reportId),
            eq(protectionRiskReport.reporterUserId, reporterUserId)
          )
        : eq(protectionRiskReport.reporterUserId, reporterUserId)
    )
    .orderBy(desc(protectionRiskReport.updatedAt));

  if (reportId && reports.length === 0) {
    throw new ORPCError("NOT_FOUND", { message: "Risk report not found" });
  }

  return Promise.all(
    reports.map(async (report) => {
      const materials = await loadReportMaterials(database, report.id);
      return toDraftView(report, materials.identifiers, materials.evidence);
    })
  );
};

export const addRiskReportEvidence = async (
  database: Database,
  input: RiskReportEvidenceInput,
  reporterUserId: string,
  now = new Date()
) => {
  const { report } = await findOwnedReport(
    database,
    reporterUserId,
    input.reportId
  );
  if (report.status !== "DRAFT" && report.status !== "CHANGES_REQUESTED") {
    throw new ORPCError("CONFLICT", {
      message: "Evidence can only be added to an editable report.",
    });
  }
  if (!isRiskEvidenceContentType(input.contentType)) {
    throwBadRequest("This evidence file type is not supported");
  }
  if (input.sizeBytes > RISK_REPORT_EVIDENCE_MAX_BYTES) {
    throwBadRequest("This evidence file is too large");
  }
  if (!isRiskReportEvidenceKey(input.originalStorageKey, input.reportId)) {
    throwBadRequest("The evidence storage key is not valid for this report");
  }
  if (!isRiskReportEvidenceFileNameAllowed(input.fileName, input.contentType)) {
    throwBadRequest("The evidence file name does not match its content type");
  }

  const existing = await database
    .select({ id: protectionRiskEvidence.id })
    .from(protectionRiskEvidence)
    .where(eq(protectionRiskEvidence.reportId, input.reportId));
  if (existing.length >= RISK_REPORT_EVIDENCE_MAX_COUNT) {
    throwBadRequest(
      `A report can contain at most ${RISK_REPORT_EVIDENCE_MAX_COUNT} evidence files`
    );
  }

  const [evidence] = await database
    .insert(protectionRiskEvidence)
    .values({
      contentType: input.contentType,
      createdAt: now,
      fileName: input.fileName,
      immutableAt: now,
      kind: input.kind,
      originalStorageKey: input.originalStorageKey,
      reportId: input.reportId,
      scanReason: "Validated by the Avin Check upload allowlist",
      scanStatus: "CLEAN",
      sha256: input.sha256,
      sizeBytes: input.sizeBytes,
    })
    .returning();
  if (!evidence) {
    throw new ORPCError("CONFLICT", {
      message: "Evidence could not be registered",
    });
  }
  return toPrivateEvidenceView(evidence);
};

export const assertRiskReportEvidenceUploadAccess = async ({
  database,
  files,
  reportId,
  reporterUserId,
}: {
  database: Database;
  files: readonly { size?: number; type: string }[];
  reportId: string;
  reporterUserId: string;
}): Promise<void> => {
  const { report } = await findOwnedReport(database, reporterUserId, reportId);
  if (report.status !== "DRAFT" && report.status !== "CHANGES_REQUESTED") {
    throw new ORPCError("CONFLICT", {
      message: "Evidence can only be uploaded to an editable report.",
    });
  }
  const existing = await database
    .select({ id: protectionRiskEvidence.id })
    .from(protectionRiskEvidence)
    .where(eq(protectionRiskEvidence.reportId, reportId));
  if (existing.length + files.length > RISK_REPORT_EVIDENCE_MAX_COUNT) {
    throw new ORPCError("BAD_REQUEST", {
      message: `A report can contain at most ${RISK_REPORT_EVIDENCE_MAX_COUNT} evidence files`,
    });
  }
  for (const file of files) {
    if (
      !isRiskEvidenceContentType(file.type) ||
      (file.size !== undefined && file.size > RISK_REPORT_EVIDENCE_MAX_BYTES)
    ) {
      throw new ORPCError("BAD_REQUEST", {
        message: "This evidence file type or size is not supported",
      });
    }
  }
};

export const submitRiskReport = async ({
  database,
  input,
  now = new Date(),
  reporterUserId,
}: {
  database: Database;
  input: { reportId: string };
  now?: Date;
  reporterUserId: string;
}) => {
  const { report } = await findOwnedReport(
    database,
    reporterUserId,
    input.reportId
  );
  const materials = await loadReportMaterials(database, report.id);
  try {
    assertRiskReportSubmission({
      claimedLoss: report.claimedLoss,
      evidence: materials.evidence as RiskReportSubmissionEvidence[],
      identifiers: materials.identifiers,
      narrative: report.narrative,
      platform: report.platform,
      type: report.type,
      violationType: report.violationType,
    });
    assertRiskReportTransition(report.status, "SUBMITTED");
  } catch (error) {
    throwBadRequest(
      error instanceof Error ? error.message : "Report is incomplete"
    );
  }

  const [updated] = await database
    .update(protectionRiskReport)
    .set({ status: "SUBMITTED", submittedAt: now, updatedAt: now })
    .where(eq(protectionRiskReport.id, report.id))
    .returning();
  if (!updated) {
    throw new ORPCError("CONFLICT", {
      message: "Risk report could not be submitted",
    });
  }

  await database.insert(protectionRiskReportHistory).values({
    createdAt: now,
    reason: null,
    reportId: report.id,
    status: "SUBMITTED",
  });
  await notifyRiskModerators(database, updated, "SUBMITTED", now);
  await notifyRiskReporter(database, updated, "SUBMITTED", now);
  await enqueueRiskReportStatusEmail(database, updated, "SUBMITTED", null, now);
  return toDraftView(updated, materials.identifiers, materials.evidence);
};

export const listRiskReportsForAdmin = async (
  database: Database,
  input?: { search?: string; status?: RiskReportStatus }
) => {
  const reports = await database
    .select()
    .from(protectionRiskReport)
    .orderBy(desc(protectionRiskReport.updatedAt));
  const search = input?.search?.trim().toLowerCase();
  const filtered = input?.status
    ? reports.filter((report) => report.status === input.status)
    : reports;

  const result = [];
  for (const report of filtered) {
    const identifiers = await database
      .select()
      .from(protectionRiskIdentifier)
      .where(eq(protectionRiskIdentifier.reportId, report.id));
    if (
      search &&
      ![
        report.id,
        report.reporterEmail,
        report.reporterName ?? "",
        ...identifiers.map((identifier) => identifier.value),
      ].some((value) => value.toLowerCase().includes(search))
    ) {
      continue;
    }
    result.push({
      affectedVictimCount: report.affectedVictimCount,
      claimedLoss: report.claimedLoss,
      id: report.id,
      platform: report.platform,
      primaryIdentifier:
        identifiers.find((item) => item.isPrimary)?.maskedValue ?? null,
      reporterEmail: report.reporterEmail,
      reporterName: report.reporterName,
      status: report.status,
      submittedAt: toIso(report.submittedAt),
      type: report.type,
      updatedAt: report.updatedAt.toISOString(),
      urgency: report.urgency,
      violationType: report.violationType,
    });
  }
  return result;
};

export const getRiskReportForAdmin = async (
  database: Database,
  reportId: string
) => {
  const [report] = await database
    .select()
    .from(protectionRiskReport)
    .where(eq(protectionRiskReport.id, reportId))
    .limit(1);
  if (!report) {
    throw new ORPCError("NOT_FOUND", { message: "Risk report not found" });
  }
  const materials = await loadReportMaterials(database, report.id);
  const derivativesByEvidenceId = new Map(
    materials.derivatives.map((item) => [item.evidenceId, item])
  );
  return {
    affectedVictimCount: report.affectedVictimCount,
    claimedLoss: report.claimedLoss,
    createdAt: report.createdAt.toISOString(),
    evidence: materials.evidence.map((item) =>
      toPrivateEvidenceView(item, derivativesByEvidenceId.get(item.id))
    ),
    history: materials.history.map((item) => ({
      actorUserId: item.actorUserId,
      createdAt: item.createdAt.toISOString(),
      id: item.id,
      isPublic: item.isPublic,
      reason: item.reason,
      status: item.status,
    })),
    id: report.id,
    identifiers: materials.identifiers.map((item) => ({
      ...toPrivateIdentifierView(item),
      value: item.value,
    })),
    narrative: report.narrative,
    platform: report.platform,
    publicSlug: report.publicSlug,
    publicSummary: report.publicSummary,
    reporterEmail: report.reporterEmail,
    reporterName: report.reporterName,
    reporterPhone: report.reporterPhone,
    reporterZalo: report.reporterZalo,
    reviewReason: report.reviewReason,
    reviewedAt: toIso(report.reviewedAt),
    reviewedByUserId: report.reviewedByUserId,
    status: report.status,
    submittedAt: toIso(report.submittedAt),
    type: report.type,
    underVerificationApproved: report.underVerificationApproved,
    updatedAt: report.updatedAt.toISOString(),
    urgency: report.urgency,
    violationType: report.violationType,
  };
};

const assertReadyDerivatives = (
  report: RiskReport,
  evidence: RiskEvidence[],
  derivatives: RiskDerivative[]
): void => {
  const derivativeByEvidenceId = new Map(
    derivatives.map((item) => [item.evidenceId, item])
  );
  for (const item of evidence) {
    const derivative = derivativeByEvidenceId.get(item.id);
    if (
      !derivative ||
      !isRiskReportDerivativeKey(derivative.storageKey, report.id, item.id) ||
      !derivative.metadataRemoved ||
      !derivative.unrelatedPiiRedacted ||
      !derivative.watermarkApplied
    ) {
      throw new ORPCError("BAD_REQUEST", {
        message:
          "Every evidence file needs a validated redacted derivative before publication.",
      });
    }
  }
};

const assertRiskReportDecisionReason = (
  decision: RiskReportDecisionStatus,
  reason: string | undefined
): void => {
  const requiresReason =
    decision === "CHANGES_REQUESTED" ||
    decision === "REJECTED" ||
    decision === "REMOVED" ||
    decision === "UNDER_VERIFICATION";
  if (requiresReason && !reason?.trim()) {
    throwBadRequest("A reason is required for this moderation decision");
  }
};

const assertRiskReportUnderVerificationEligible = (
  report: RiskReport,
  approved: boolean | undefined
): void => {
  if (approved !== true) {
    throwBadRequest(
      "Under-verification publication requires an explicit policy approval"
    );
  }
  if (
    !isRiskReportUnderVerificationEligible({
      affectedVictimCount: report.affectedVictimCount,
      urgency: report.urgency,
    })
  ) {
    throwBadRequest(
      "Under-verification publication is limited to urgent or multi-victim risk"
    );
  }
};

const assertRiskReportPublicationReady = ({
  decision,
  launchConfiguration,
  materials,
  publicSummary,
  report,
  underVerificationApproved,
}: {
  decision: RiskReportDecisionStatus;
  launchConfiguration: ProtectionLaunchConfiguration;
  materials: ReportMaterials;
  publicSummary: string | undefined;
  report: RiskReport;
  underVerificationApproved?: boolean;
}): void => {
  if (
    decision !== "PUBLISHED" &&
    decision !== "CORRECTED" &&
    decision !== "UNDER_VERIFICATION"
  ) {
    return;
  }
  if (decision === "UNDER_VERIFICATION") {
    assertRiskReportUnderVerificationEligible(
      report,
      underVerificationApproved
    );
  }
  assertProtectionOperationAllowed(
    launchConfiguration,
    "RISK_REPORT_PUBLICATION"
  );
  assertRiskReportSubmission({
    claimedLoss: report.claimedLoss,
    evidence: materials.evidence as RiskReportSubmissionEvidence[],
    identifiers: materials.identifiers,
    narrative: report.narrative,
    platform: report.platform,
    type: report.type,
    violationType: report.violationType,
  });
  assertReadyDerivatives(report, materials.evidence, materials.derivatives);
  if (!(publicSummary?.trim() || report.publicSummary?.trim())) {
    throwBadRequest("A public redacted summary is required before publication");
  }
};

export const decideRiskReport = async ({
  database,
  decision,
  id,
  now = new Date(),
  publicSummary,
  reason,
  reviewerUserId,
  underVerificationApproved,
  launchConfiguration = getProtectionLaunchConfiguration(),
}: {
  database: Database;
  decision: RiskReportDecisionStatus;
  id: string;
  launchConfiguration?: ProtectionLaunchConfiguration;
  now?: Date;
  publicSummary?: string;
  reason?: string;
  reviewerUserId: string;
  underVerificationApproved?: boolean;
}) => {
  const [report] = await database
    .select()
    .from(protectionRiskReport)
    .where(eq(protectionRiskReport.id, id))
    .limit(1);
  if (!report) {
    throw new ORPCError("NOT_FOUND", { message: "Risk report not found" });
  }

  try {
    assertRiskReportTransition(report.status, decision);
  } catch (error) {
    throw new ORPCError("CONFLICT", {
      message:
        error instanceof Error
          ? error.message
          : "Risk report transition is not allowed",
    });
  }

  assertRiskReportDecisionReason(decision, reason);

  const materials = await loadReportMaterials(database, report.id);
  assertRiskReportPublicationReady({
    decision,
    launchConfiguration,
    materials,
    publicSummary,
    report,
    underVerificationApproved,
  });

  const nextPublicSlug =
    isPublicRiskReportStatus(decision) && !report.publicSlug
      ? createRiskReportPublicSlug(report.id)
      : report.publicSlug;
  const nextPublishedAt =
    isPublicRiskReportStatus(decision) && !report.publishedAt
      ? now
      : report.publishedAt;
  const [updated] = await database
    .update(protectionRiskReport)
    .set({
      publicSlug: nextPublicSlug,
      publicSummary: publicSummary?.trim() || report.publicSummary,
      publishedAt: nextPublishedAt,
      reviewReason: reason?.trim() || null,
      reviewedAt: now,
      reviewedByUserId: reviewerUserId,
      status: decision,
      underVerificationApproved:
        decision === "UNDER_VERIFICATION"
          ? true
          : report.underVerificationApproved,
      updatedAt: now,
    })
    .where(eq(protectionRiskReport.id, report.id))
    .returning();
  if (!updated) {
    throw new ORPCError("CONFLICT", {
      message: "Risk report was updated by another moderator",
    });
  }

  await database.insert(protectionRiskReportHistory).values({
    actorUserId: reviewerUserId,
    createdAt: now,
    isPublic: isPublicRiskReportStatus(decision),
    reason: reason?.trim() || null,
    reportId: report.id,
    status: decision,
  });
  await enqueueRiskReportStatusEmail(database, updated, decision, reason, now);
  await notifyRiskModerators(database, updated, decision, now);
  await notifyRiskReporter(database, updated, decision, now);
  return getRiskReportForAdmin(database, updated.id);
};

export const registerRiskReportDerivative = async ({
  contentType,
  database,
  evidenceId,
  metadataRemoved,
  reportId,
  sha256,
  sizeBytes,
  storageKey,
  unrelatedPiiRedacted,
  watermarkApplied,
  now = new Date(),
}: {
  contentType: string;
  database: Database;
  evidenceId: string;
  metadataRemoved: boolean;
  now?: Date;
  reportId: string;
  sha256?: string;
  sizeBytes: number;
  storageKey: string;
  unrelatedPiiRedacted: boolean;
  watermarkApplied: boolean;
}) => {
  if (!isRiskEvidenceContentType(contentType)) {
    throwBadRequest("This derivative file type is not supported");
  }
  if (sizeBytes > RISK_REPORT_EVIDENCE_MAX_BYTES) {
    throwBadRequest("This derivative file is too large");
  }
  if (!metadataRemoved || !unrelatedPiiRedacted || !watermarkApplied) {
    throwBadRequest(
      "A public derivative must have metadata removed, unrelated PII redacted, and an Avin watermark"
    );
  }
  if (!isRiskReportDerivativeKey(storageKey, reportId, evidenceId)) {
    throwBadRequest("The derivative storage key is not valid for this report");
  }
  const derivativeFileName = storageKey.split("/").at(-1) ?? "";
  if (!isRiskReportEvidenceFileNameAllowed(derivativeFileName, contentType)) {
    throwBadRequest("The derivative file name does not match its content type");
  }
  const [evidence] = await database
    .select()
    .from(protectionRiskEvidence)
    .where(
      and(
        eq(protectionRiskEvidence.id, evidenceId),
        eq(protectionRiskEvidence.reportId, reportId)
      )
    )
    .limit(1);
  if (!evidence) {
    throw new ORPCError("NOT_FOUND", { message: "Risk evidence not found" });
  }
  const [existing] = await database
    .select()
    .from(protectionRiskEvidenceDerivative)
    .where(eq(protectionRiskEvidenceDerivative.evidenceId, evidenceId))
    .limit(1);
  if (existing) {
    throw new ORPCError("CONFLICT", {
      message: "A derivative already exists for this evidence file",
    });
  }

  const [derivative] = await database
    .insert(protectionRiskEvidenceDerivative)
    .values({
      contentType,
      createdAt: now,
      evidenceId,
      metadataRemoved,
      sha256,
      sizeBytes,
      storageKey,
      unrelatedPiiRedacted,
      watermarkApplied,
    })
    .returning();
  if (!derivative) {
    throw new ORPCError("CONFLICT", {
      message: "Derivative could not be registered",
    });
  }
  return {
    contentType: derivative.contentType,
    evidenceId: derivative.evidenceId,
    id: derivative.id,
    metadataRemoved: derivative.metadataRemoved,
    sizeBytes: derivative.sizeBytes,
    unrelatedPiiRedacted: derivative.unrelatedPiiRedacted,
    watermarkApplied: derivative.watermarkApplied,
  };
};

export const createRiskReportOriginalEvidenceUrl = async ({
  database,
  evidenceId,
  fetchImpl = fetch,
  reportId,
  storage,
  supabaseSecretKey = env.SUPABASE_SECRET_KEY,
}: {
  database: Database;
  evidenceId: string;
  fetchImpl?: typeof fetch;
  reportId: string;
  storage?: Context["storage"];
  supabaseSecretKey?: string;
}) => {
  if (!storage) {
    throw new ORPCError("SERVICE_UNAVAILABLE", {
      message: "Private evidence storage is not configured",
    });
  }
  const [evidence] = await database
    .select()
    .from(protectionRiskEvidence)
    .where(
      and(
        eq(protectionRiskEvidence.id, evidenceId),
        eq(protectionRiskEvidence.reportId, reportId)
      )
    )
    .limit(1);
  if (
    !evidence ||
    !isRiskReportEvidenceKey(evidence.originalStorageKey, reportId)
  ) {
    throw new ORPCError("NOT_FOUND", { message: "Risk evidence not found" });
  }

  const encodedKey = evidence.originalStorageKey
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  const response = await fetchImpl(
    `${storage.supabaseUrl.replace(/\/$/u, "")}/storage/v1/object/sign/${PROTECTION_RISK_ORIGINALS_BUCKET}/${encodedKey}`,
    {
      body: JSON.stringify({ expiresIn: 300 }),
      headers: {
        Authorization: `Bearer ${supabaseSecretKey}`,
        "Content-Type": "application/json",
        apikey: supabaseSecretKey,
      },
      method: "POST",
    }
  );
  if (!response.ok) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Could not create a private evidence URL",
    });
  }
  const result = (await response.json()) as { signedURL?: string };
  if (!result.signedURL) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Could not create a private evidence URL",
    });
  }
  const signedPath = result.signedURL.startsWith("/storage/v1/")
    ? result.signedURL
    : `/storage/v1${result.signedURL}`;
  return {
    expiresInSeconds: 300,
    url: new URL(signedPath, storage.supabaseUrl).toString(),
  };
};

const toPublicWarningView = (
  report: RiskReport,
  identifiers: RiskIdentifier[],
  evidence: RiskEvidence[],
  derivatives: RiskDerivative[],
  history: RiskHistory[],
  supportOutcome: SupportReviewPublicOutcome,
  supabaseUrl: string
) => {
  const isRemoved = report.status === "REMOVED";
  const derivativesByEvidenceId = new Map(
    derivatives.map((item) => [item.evidenceId, item])
  );
  const publicHistory: {
    createdAt: string;
    status: RiskReportStatus;
  }[] = [];
  for (const item of history) {
    if (item.isPublic) {
      publicHistory.push({
        createdAt: item.createdAt.toISOString(),
        status: item.status,
      });
    }
  }
  return {
    claimedLoss: isRemoved ? null : report.claimedLoss,
    evidence: isRemoved
      ? []
      : evidence.flatMap((item) => {
          const derivative = derivativesByEvidenceId.get(item.id);
          if (
            !derivative ||
            !isRiskReportDerivativeKey(
              derivative.storageKey,
              report.id,
              item.id
            ) ||
            !derivative.metadataRemoved ||
            !derivative.unrelatedPiiRedacted ||
            !derivative.watermarkApplied
          ) {
            return [];
          }
          return [
            {
              contentType: derivative.contentType,
              id: item.id,
              kind: item.kind,
              publicUrl: createPublicMediaUrl(
                supabaseUrl,
                derivative.storageKey
              ),
              sizeBytes: derivative.sizeBytes,
            },
          ];
        }),
    history: publicHistory,
    identifiers: isRemoved
      ? []
      : identifiers.map((item) => ({
          maskedValue: item.maskedValue,
          publicValue: getRiskIdentifierPublicValue(
            item.type,
            item.normalizedValue
          ),
          type: item.type,
        })),
    platform: isRemoved ? null : report.platform,
    publicPath: createPublicWarningPath(
      report.publicSlug ?? createRiskReportPublicSlug(report.id)
    ),
    publicSlug: report.publicSlug ?? createRiskReportPublicSlug(report.id),
    publicSummary: isRemoved
      ? "Warning này đã được gỡ khỏi danh mục công khai."
      : report.publicSummary,
    publishedAt: toIso(report.publishedAt),
    status: report.status,
    supportOutcome: isRemoved ? null : supportOutcome,
    type: report.type,
    violationType: isRemoved ? null : report.violationType,
  };
};

const getPublicSupportOutcome = async (
  database: Database,
  reportId: string
): Promise<SupportReviewPublicOutcome> => {
  const [review] = await database
    .select({ publicOutcome: protectionSupportReview.publicOutcome })
    .from(protectionSupportReview)
    .where(eq(protectionSupportReview.riskReportId, reportId))
    .orderBy(desc(protectionSupportReview.updatedAt))
    .limit(1);
  return review?.publicOutcome ?? null;
};

export const listPublicRiskWarnings = async (
  database: Database,
  input: { limit?: number } | undefined,
  supabaseUrl = env.SUPABASE_URL
) => {
  const reports = await database
    .select()
    .from(protectionRiskReport)
    .where(
      inArray(protectionRiskReport.status, [
        "PUBLISHED",
        "CORRECTED",
        "UNDER_VERIFICATION",
        "REMOVED",
      ])
    )
    .orderBy(desc(protectionRiskReport.publishedAt))
    .limit(input?.limit ?? 20);

  return Promise.all(
    reports.map(async (report) => {
      const [materials, supportOutcome] = await Promise.all([
        loadReportMaterials(database, report.id),
        getPublicSupportOutcome(database, report.id),
      ]);
      return toPublicWarningView(
        report,
        materials.identifiers,
        materials.evidence,
        materials.derivatives,
        materials.history,
        supportOutcome,
        supabaseUrl
      );
    })
  );
};

export const getPublicRiskWarning = async (
  database: Database,
  publicSlug: string,
  supabaseUrl = env.SUPABASE_URL
) => {
  const [report] = await database
    .select()
    .from(protectionRiskReport)
    .where(
      and(
        eq(protectionRiskReport.publicSlug, publicSlug),
        inArray(protectionRiskReport.status, [
          "PUBLISHED",
          "CORRECTED",
          "UNDER_VERIFICATION",
          "REMOVED",
        ])
      )
    )
    .limit(1);
  if (!report || !isPublicRiskReportStatus(report.status)) {
    throw new ORPCError("NOT_FOUND", {
      message: "Public risk warning not found",
    });
  }
  const [materials, supportOutcome] = await Promise.all([
    loadReportMaterials(database, report.id),
    getPublicSupportOutcome(database, report.id),
  ]);
  return toPublicWarningView(
    report,
    materials.identifiers,
    materials.evidence,
    materials.derivatives,
    materials.history,
    supportOutcome,
    supabaseUrl
  );
};
