import {
  protectionProviderProfile,
  protectionRiskCorrectionRequest,
  protectionRiskEvidence,
  protectionRiskEvidenceDerivative,
  protectionRiskIdentifier,
  protectionRiskReport,
  protectionRiskReportEmailDelivery,
  protectionRiskReportHistory,
  protectionRiskReportRevision,
  protectionRiskTransaction,
  protectionSupportReview,
} from "@avin/db/schema/protection";
import { env } from "@avin/env/server";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";

import {
  createNotificationEvent,
  listNotificationRecipientsByRole,
} from "../notifications/notification";
import type { NotificationEventType } from "../notifications/notification-logic";
import type { Context } from "../runtime/context";
import {
  createPublicMediaUrl,
  getNativeRiskReportEvidenceMaxBytes,
  isRiskReportDerivativeKey,
  isNativeRiskReportEvidenceContentType,
  isNativeRiskReportEvidenceFileNameAllowed,
  isRiskReportEvidenceKey,
  PROTECTION_RISK_ORIGINALS_BUCKET,
  RISK_REPORT_EVIDENCE_MAX_COUNT,
  RISK_REPORT_EVIDENCE_MAX_VIDEO_COUNT,
} from "../runtime/storage";
import { getProtectionLaunchConfiguration } from "./configuration";
import { publicNativeRiskFilter } from "./external-risk-import";
import {
  assertProtectionOperationAllowed,
  getProtectionReadinessStatus,
} from "./launch-gates";
import type { ProtectionLaunchConfiguration } from "./launch-gates";
import {
  assertRiskReportIntake,
  assertRiskReportSubmission,
  assertRiskReportTransition,
  buildRiskReportPublicNarrative,
  createRiskReportEmailSubject,
  createRiskReportPublicTitle,
  createRiskReportPublicPath as createPublicWarningPath,
  createRiskReportPublicSlug,
  getRiskIdentifierPublicValue,
  getRiskReportIdentifierTypes,
  isRiskReportUnderVerificationEligible,
  isPublicRiskReportStatus,
  maskRiskIdentifier,
  maskRiskHolderName,
  normalizeRiskIdentifier,
  riskReportPublicSubjectIdentifierRoles,
} from "./risk-report";
import type {
  RiskReportCorrectionRequestInput,
  RiskReportDecisionStatus,
  RiskReportDraftInput,
  RiskReportEvidenceInput,
  RiskReportIdentifierInput,
  RiskReportStatus,
  RiskReportSubmissionEvidence,
  RISK_REPORT_ATTESTATION_VERSION,
} from "./risk-report";

type Database = Context["db"];
type RiskReport = typeof protectionRiskReport.$inferSelect;
type RiskIdentifier = typeof protectionRiskIdentifier.$inferSelect;
type RiskEvidence = typeof protectionRiskEvidence.$inferSelect;
type RiskDerivative = typeof protectionRiskEvidenceDerivative.$inferSelect;
type RiskHistory = typeof protectionRiskReportHistory.$inferSelect;
type RiskTransaction = typeof protectionRiskTransaction.$inferSelect;
type RiskCorrection = typeof protectionRiskCorrectionRequest.$inferSelect;
type SupportReviewPublicOutcome =
  typeof protectionSupportReview.$inferSelect.publicOutcome;

const publicSubjectIdentifierRoles = new Set<string>(
  riskReportPublicSubjectIdentifierRoles
);

const RISK_EMAIL_SOURCE_TYPE = "PROTECTION_RISK_REPORT";

const REPORT_SUBMISSION_WINDOW_MS = 60 * 60 * 1000;
const REPORT_SUBMISSIONS_PER_WINDOW = 5;

interface ReportSubmissionRateLimitBucket {
  count: number;
  windowStartedAt: number;
}

const reportSubmissionRateLimitBuckets = new Map<
  string,
  ReportSubmissionRateLimitBucket
>();

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

const isRiskEvidenceContentType = isNativeRiskReportEvidenceContentType;

const isRiskReportVideoContentType = (contentType: string): boolean =>
  contentType === "video/mp4" || contentType === "video/webm";

const throwBadRequest = (message: string): never => {
  throw new ORPCError("BAD_REQUEST", { message });
};

const reportSubmissionRateLimitKey = (
  reporterUserId: string,
  ipAddress?: string
): string => `${reporterUserId}:${ipAddress?.trim() || "unknown"}`;

export const assertRiskReportSubmissionAllowed = (
  reporterUserId: string,
  ipAddress?: string,
  now = Date.now()
): void => {
  const key = reportSubmissionRateLimitKey(reporterUserId, ipAddress);
  const existing = reportSubmissionRateLimitBuckets.get(key);
  if (
    !existing ||
    now - existing.windowStartedAt >= REPORT_SUBMISSION_WINDOW_MS
  ) {
    reportSubmissionRateLimitBuckets.set(key, {
      count: 1,
      windowStartedAt: now,
    });
    return;
  }

  if (existing.count >= REPORT_SUBMISSIONS_PER_WINDOW) {
    throw new ORPCError("TOO_MANY_REQUESTS", {
      message:
        "Bạn đã gửi quá nhiều báo cáo trong thời gian ngắn. Vui lòng thử lại sau.",
    });
  }

  existing.count += 1;
};

export const resetRiskReportSubmissionRateLimitForTests = (): void => {
  reportSubmissionRateLimitBuckets.clear();
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
  displayName: identifier.displayName,
  holderName: identifier.holderName,
  id: identifier.id,
  institutionName: identifier.institutionName,
  isPrimary: identifier.isPrimary,
  maskedValue: identifier.maskedValue,
  namespace: identifier.namespace,
  normalizedValue: identifier.normalizedValue,
  publicValue: identifier.publicValue,
  role: identifier.role,
  type: identifier.type,
  value: identifier.value,
});

const toPrivateEvidenceView = (
  evidence: RiskEvidence,
  derivative?: RiskDerivative | null,
  supabaseUrl = env.SUPABASE_URL
) => ({
  contentType: evidence.contentType,
  derivative: derivative
    ? {
        contentType: derivative.contentType,
        id: derivative.id,
        metadataRemoved: derivative.metadataRemoved,
        publicUrl: createPublicMediaUrl(supabaseUrl, derivative.storageKey),
        sizeBytes: derivative.sizeBytes,
        storageKey: derivative.storageKey,
        unrelatedPiiRedacted: derivative.unrelatedPiiRedacted,
        watermarkApplied: derivative.watermarkApplied,
      }
    : null,
  explanation: evidence.explanation,
  fileName: evidence.fileName,
  id: evidence.id,
  immutableAt: evidence.immutableAt.toISOString(),
  kind: evidence.kind,
  originalStorageKey: evidence.originalStorageKey,
  publicUrl: createPublicMediaUrl(
    supabaseUrl,
    derivative?.storageKey ?? evidence.originalStorageKey
  ),
  scanReason: evidence.scanReason,
  scanStatus: evidence.scanStatus,
  sha256: evidence.sha256,
  sizeBytes: evidence.sizeBytes,
});

const toDraftView = (
  report: RiskReport,
  identifiers: RiskIdentifier[],
  evidence: RiskEvidence[],
  derivatives: RiskDerivative[],
  transactions: RiskTransaction[]
) => ({
  accessLostAt: toIso(report.accessLostAt),
  affectedVictimCount: report.affectedVictimCount,
  claimedLoss: report.claimedLoss,
  createdAt: report.createdAt.toISOString(),
  evidence: evidence.map((item) =>
    toPrivateEvidenceView(
      item,
      derivatives.find((derivative) => derivative.evidenceId === item.id)
    )
  ),
  handoverAt: toIso(report.handoverAt),
  id: report.id,
  identifiers: identifiers.map(toPrivateIdentifierView),
  incidentAt: toIso(report.incidentAt),
  incidentDateApproximate: report.incidentDateApproximate,
  issues: report.issues,
  lossOccurred: report.lossOccurred,
  narrative: report.narrative,
  ongoing: report.ongoing,
  otherIssueDescription: report.otherIssueDescription,
  platform: report.platform,
  possibleDuplicateOfReportId: report.possibleDuplicateOfReportId,
  privateNote: report.privateNote,
  publicNarrative: report.publicNarrative,
  publicPacketPreviewedAt: toIso(report.publicPacketPreviewedAt),
  purchaseAt: toIso(report.purchaseAt),
  reporterInvolvement: report.reporterInvolvement,
  reporterName: report.reporterName,
  reporterPhone: report.reporterPhone,
  reporterRelationship: report.reporterRelationship,
  reporterZalo: report.reporterZalo,
  reviewReason: report.reviewReason,
  status: report.status,
  submittedAt: toIso(report.submittedAt),
  transactions: transactions.map((transaction) => ({
    amount: transaction.amount,
    currencyOrAsset: transaction.currencyOrAsset,
    destinationIdentifierId: transaction.destinationIdentifierId,
    id: transaction.id,
    occurredAt: transaction.occurredAt.toISOString(),
    paymentMethod: transaction.paymentMethod,
    reference: transaction.reference,
    timeKnown: transaction.timeKnown,
  })),
  type: report.type,
  underVerificationApproved: report.underVerificationApproved,
  updatedAt: report.updatedAt.toISOString(),
  urgency: report.urgency,
  violationType: report.violationType,
  withdrawalReason: report.withdrawalReason,
  withdrawalRequestedAt: toIso(report.withdrawalRequestedAt),
  withdrawalStatus: report.withdrawalStatus,
});

const toPublicIdentifierView = (item: RiskIdentifier) => ({
  holderName:
    item.type === "BANK_ACCOUNT" && item.holderName
      ? maskRiskHolderName(item.holderName)
      : null,
  institutionName: item.institutionName,
  isPrimary: item.isPrimary,
  maskedValue: item.maskedValue,
  publicValue: getRiskIdentifierPublicValue(item.type, item.normalizedValue),
  role: item.role,
  type: item.type,
});

const toCorrectionView = (request: RiskCorrection) => ({
  authorityEvidenceReference: request.authorityEvidenceReference,
  createdAt: request.createdAt.toISOString(),
  id: request.id,
  reason: request.reason,
  reportId: request.reportId,
  requesterName: request.requesterName,
  requesterRelationship: request.requesterRelationship,
  reviewReason: request.reviewReason,
  reviewedAt: toIso(request.reviewedAt),
  status: request.status,
  updatedAt: request.updatedAt.toISOString(),
});

const loadReportMaterials = async (
  database: Database,
  reportId: string
): Promise<{
  derivatives: RiskDerivative[];
  evidence: RiskEvidence[];
  history: RiskHistory[];
  identifiers: RiskIdentifier[];
  transactions: RiskTransaction[];
}> => {
  const [identifiers, evidence, history, transactions] = await Promise.all([
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
    database
      .select()
      .from(protectionRiskTransaction)
      .where(eq(protectionRiskTransaction.reportId, reportId))
      .orderBy(protectionRiskTransaction.occurredAt),
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

  return { derivatives, evidence, history, identifiers, transactions };
};

const assertRiskReportTransactionDestinations = (
  report: RiskReport,
  transactions: readonly RiskTransaction[]
): void => {
  if (
    report.lossOccurred !== "YES" ||
    report.type === "SOCIAL_GAME_ACCOUNT" ||
    transactions.every((transaction) => transaction.destinationIdentifierId)
  ) {
    return;
  }
  throwBadRequest(
    "Every loss transaction must identify the payment destination in this report"
  );
};

type ReportMaterials = Awaited<ReturnType<typeof loadReportMaterials>>;

const duplicateEligibleReportStatuses = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "CHANGES_REQUESTED",
  "UNDER_VERIFICATION",
  "PUBLISHED",
  "CORRECTED",
] as const;

const findPossibleDuplicateReportId = async (
  database: Database,
  reportId: string,
  identifiers: readonly RiskIdentifier[]
): Promise<string | null> => {
  for (const identifier of identifiers) {
    const [candidate] = await database
      .select({ reportId: protectionRiskReport.id })
      .from(protectionRiskIdentifier)
      .innerJoin(
        protectionRiskReport,
        eq(protectionRiskIdentifier.reportId, protectionRiskReport.id)
      )
      .where(
        and(
          eq(protectionRiskIdentifier.type, identifier.type),
          eq(
            protectionRiskIdentifier.normalizedValue,
            identifier.normalizedValue
          ),
          ne(protectionRiskReport.id, reportId),
          inArray(protectionRiskReport.status, duplicateEligibleReportStatuses),
          publicNativeRiskFilter
        )
      )
      .orderBy(desc(protectionRiskReport.updatedAt))
      .limit(1);

    if (candidate) {
      return candidate.reportId;
    }
  }

  return null;
};

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
    context: {
      possibleDuplicateOfReportId: report.possibleDuplicateOfReportId,
      status,
      type: report.type,
    },
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

  if (!report.reporterUserId) {
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
      displayName: identifier.displayName,
      holderName: identifier.holderName,
      id: crypto.randomUUID(),
      institutionName: identifier.institutionName,
      isPrimary: index === 0,
      maskedValue: maskRiskIdentifier(identifier.type, normalizedValue),
      namespace: identifier.namespace,
      normalizedValue,
      publicValue,
      reportId,
      role: identifier.role,
      type: identifier.type,
      value: identifier.value.trim(),
    };
  });

// oxlint-disable-next-line complexity
const buildRiskReportDraftUpdates = (
  input: RiskReportDraftInput,
  now: Date
): Partial<typeof protectionRiskReport.$inferInsert> => {
  const updates: Partial<typeof protectionRiskReport.$inferInsert> = {
    publicPacketPreviewedAt: null,
    updatedAt: now,
  };
  if (input.accessLostAt !== undefined) {
    updates.accessLostAt = input.accessLostAt;
  }
  if (input.affectedVictimCount !== undefined) {
    updates.affectedVictimCount = input.affectedVictimCount;
  }
  if (input.claimedLoss !== undefined) {
    updates.claimedLoss = input.claimedLoss;
  }
  if (input.incidentAt !== undefined) {
    updates.incidentAt = input.incidentAt;
  }
  if (input.incidentDateApproximate !== undefined) {
    updates.incidentDateApproximate = input.incidentDateApproximate;
  }
  if (input.handoverAt !== undefined) {
    updates.handoverAt = input.handoverAt;
  }
  if (input.issues !== undefined) {
    updates.issues = input.issues;
  }
  if (input.lossOccurred !== undefined) {
    updates.lossOccurred = input.lossOccurred;
    if (input.lossOccurred !== "YES" && input.claimedLoss === undefined) {
      updates.claimedLoss = null;
    }
  }
  if (input.narrative !== undefined) {
    updates.narrative = input.narrative.trim() || null;
    updates.publicPacketPreviewedAt = null;
  }
  if (input.ongoing !== undefined) {
    updates.ongoing = input.ongoing;
  }
  if (input.otherIssueDescription !== undefined) {
    updates.otherIssueDescription = input.otherIssueDescription || null;
  }
  if (input.privateNote !== undefined) {
    updates.privateNote = input.privateNote || null;
  }
  if (input.purchaseAt !== undefined) {
    updates.purchaseAt = input.purchaseAt;
  }
  if (input.reporterInvolvement !== undefined) {
    updates.reporterInvolvement = input.reporterInvolvement;
  }
  if (input.platform !== undefined) {
    updates.platform = input.platform;
  }
  if (input.reporterRelationship !== undefined) {
    updates.reporterRelationship = input.reporterRelationship;
  }
  if (input.reporterPhone !== undefined) {
    updates.reporterPhone = input.reporterPhone;
    updates.publicPacketPreviewedAt = null;
  }
  if (input.reporterZalo !== undefined) {
    updates.reporterZalo = input.reporterZalo;
    updates.publicPacketPreviewedAt = null;
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
  accessLostAt: input.accessLostAt,
  affectedVictimCount: input.affectedVictimCount,
  claimedLoss: input.claimedLoss,
  createdAt: now,
  handoverAt: input.handoverAt,
  id: input.reportId,
  incidentAt: input.incidentAt,
  incidentDateApproximate: input.incidentDateApproximate ?? false,
  issues: input.issues ?? [],
  lossOccurred: input.lossOccurred,
  narrative: input.narrative?.trim() || null,
  ongoing: input.ongoing ?? false,
  otherIssueDescription: input.otherIssueDescription || null,
  platform: input.platform,
  possibleDuplicateOfReportId: null,
  privateNote: input.privateNote || null,
  publicNarrative: null,
  publicPacketPreviewedAt: null,
  purchaseAt: input.purchaseAt,
  reporterEmail,
  reporterInvolvement: input.reporterInvolvement,
  reporterName,
  reporterPhone: input.reporterPhone,
  reporterRelationship:
    input.reporterRelationship ?? "NO_PROVIDER_RELATIONSHIP",
  reporterUserId,
  reporterZalo: input.reporterZalo,
  type: input.type,
  updatedAt: now,
  urgency: input.urgency,
  violationType: input.violationType,
});

const assertRiskReportDraftEditable = (
  report: RiskReport,
  reportType: RiskReportDraftInput["type"]
): void => {
  if (report.type !== reportType) {
    throwBadRequest(
      "A report type cannot be changed after the draft is created"
    );
  }
  if (report.status !== "DRAFT" && report.status !== "CHANGES_REQUESTED") {
    throw new ORPCError("CONFLICT", {
      message: "Only a draft or a report requesting changes can be edited.",
    });
  }
};

export const saveRiskReportDraft = ({
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
}) =>
  // oxlint-disable-next-line complexity
  database.transaction(async (transaction) => {
    let report: RiskReport | undefined;

    if (input.reportId) {
      const [existingReport] = await transaction
        .select()
        .from(protectionRiskReport)
        .where(
          and(
            eq(protectionRiskReport.id, input.reportId),
            eq(protectionRiskReport.reporterUserId, reporterUserId)
          )
        )
        .for("update")
        .limit(1);
      if (existingReport) {
        assertRiskReportDraftEditable(existingReport, input.type);
        report = existingReport;
      }
    }

    if (report) {
      const updates = buildRiskReportDraftUpdates(input, now);
      const [updatedReport] = await transaction
        .update(protectionRiskReport)
        .set(updates)
        .where(eq(protectionRiskReport.id, report.id))
        .returning();
      if (!updatedReport) {
        throw new ORPCError("CONFLICT", {
          message: "Risk draft could not be saved",
        });
      }
      report = updatedReport;
    } else {
      const [insertedReport] = await transaction
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
        .onConflictDoNothing({ target: protectionRiskReport.id })
        .returning();
      report = insertedReport;

      if (!report && input.reportId) {
        const [conflictingReport] = await transaction
          .select()
          .from(protectionRiskReport)
          .where(
            and(
              eq(protectionRiskReport.id, input.reportId),
              eq(protectionRiskReport.reporterUserId, reporterUserId)
            )
          )
          .for("update")
          .limit(1);
        if (!conflictingReport) {
          throw new ORPCError("NOT_FOUND", {
            message: "Risk report not found",
          });
        }
        assertRiskReportDraftEditable(conflictingReport, input.type);
        const [updatedReport] = await transaction
          .update(protectionRiskReport)
          .set(buildRiskReportDraftUpdates(input, now))
          .where(eq(protectionRiskReport.id, conflictingReport.id))
          .returning();
        if (!updatedReport) {
          throw new ORPCError("CONFLICT", {
            message: "Risk draft could not be saved",
          });
        }
        report = updatedReport;
      }
    }

    if (!report) {
      throw new ORPCError("CONFLICT", {
        message: "Risk draft could not be saved",
      });
    }

    let currentReport = report;

    if (input.identifiers !== undefined) {
      const allowedTypes = new Set(getRiskReportIdentifierTypes(input.type));
      for (const identifier of input.identifiers) {
        if (!allowedTypes.has(identifier.type)) {
          throwBadRequest("The identifier does not match this report type");
        }
      }
      await transaction
        .delete(protectionRiskIdentifier)
        .where(eq(protectionRiskIdentifier.reportId, currentReport.id));
      const rows = buildIdentifierRows(currentReport.id, input.identifiers);
      if (rows.length > 0) {
        await transaction.insert(protectionRiskIdentifier).values(rows);
      }
    }

    const materialsBeforeTransactions = await loadReportMaterials(
      transaction,
      currentReport.id
    );

    if (input.transactions !== undefined) {
      const identifiersByIndex = materialsBeforeTransactions.identifiers;
      const transactionRows = input.transactions.map((transactionInput) => {
        const destinationIdentifier =
          transactionInput.destinationIdentifierIndex === undefined
            ? null
            : identifiersByIndex[transactionInput.destinationIdentifierIndex];
        if (
          transactionInput.destinationIdentifierIndex !== undefined &&
          !destinationIdentifier
        ) {
          throwBadRequest(
            "Transaction destination must reference an identifier in this report"
          );
        }
        return {
          amount: transactionInput.amount,
          currencyOrAsset: transactionInput.currencyOrAsset,
          destinationIdentifierId: destinationIdentifier?.id ?? null,
          occurredAt: transactionInput.occurredAt,
          paymentMethod: transactionInput.paymentMethod,
          reference: transactionInput.reference || null,
          reportId: currentReport.id,
          timeKnown: transactionInput.timeKnown,
        };
      });
      await transaction
        .delete(protectionRiskTransaction)
        .where(eq(protectionRiskTransaction.reportId, currentReport.id));
      if (transactionRows.length > 0) {
        await transaction
          .insert(protectionRiskTransaction)
          .values(transactionRows);
      }
    }

    const materials = await loadReportMaterials(transaction, currentReport.id);
    const shouldRefreshPublicNarrative =
      input.narrative !== undefined ||
      input.identifiers !== undefined ||
      input.reporterPhone !== undefined ||
      input.reporterZalo !== undefined;
    if (shouldRefreshPublicNarrative) {
      const privateValues = [
        currentReport.reporterPhone,
        currentReport.reporterZalo,
        ...materials.identifiers.flatMap((identifier) => [
          identifier.value,
          identifier.displayName,
          identifier.holderName,
          identifier.institutionName,
        ]),
      ].filter((value): value is string => Boolean(value));
      const [refreshedReport] = await transaction
        .update(protectionRiskReport)
        .set({
          publicNarrative: currentReport.narrative
            ? buildRiskReportPublicNarrative(
                currentReport.narrative,
                privateValues
              )
            : null,
          publicPacketPreviewedAt: null,
          updatedAt: now,
        })
        .where(eq(protectionRiskReport.id, currentReport.id))
        .returning();
      if (!refreshedReport) {
        throw new ORPCError("CONFLICT", {
          message: "Risk draft could not be refreshed",
        });
      }
      currentReport = refreshedReport;
    }

    return toDraftView(
      currentReport,
      materials.identifiers,
      materials.evidence,
      materials.derivatives,
      materials.transactions
    );
  });

export const previewRiskReport = async ({
  database,
  now = new Date(),
  reportId,
  reporterUserId,
}: {
  database: Database;
  now?: Date;
  reportId: string;
  reporterUserId: string;
}) => {
  const { report } = await findOwnedReport(database, reporterUserId, reportId);
  if (report.status !== "DRAFT" && report.status !== "CHANGES_REQUESTED") {
    throw new ORPCError("CONFLICT", {
      message: "Only an editable report can be previewed.",
    });
  }
  const materials = await loadReportMaterials(database, report.id);
  assertRiskReportTransactionDestinations(report, materials.transactions);
  try {
    assertRiskReportIntake({
      accessLostAt: report.accessLostAt,
      claimedLoss: report.claimedLoss,
      evidence: materials.evidence.map((evidence) => ({
        kind: evidence.kind,
        publicCopyReady: materials.derivatives.some(
          (derivative) => derivative.evidenceId === evidence.id
        ),
        scanStatus: evidence.scanStatus,
      })) as RiskReportSubmissionEvidence[],
      handoverAt: report.handoverAt,
      identifiers: materials.identifiers,
      incidentAt: report.incidentAt,
      issues: report.issues as NonNullable<RiskReportDraftInput["issues"]>,
      lossOccurred: report.lossOccurred,
      narrative: report.narrative,
      otherIssueDescription: report.otherIssueDescription,
      platform: report.platform,
      publicNarrative: report.publicNarrative,
      // Preview is the operation that creates this timestamp, so validate the
      // packet as if it had just been previewed.
      publicPacketPreviewedAt: now,
      purchaseAt: report.purchaseAt,
      reporterInvolvement: report.reporterInvolvement,
      transactions: materials.transactions.map((transaction) => ({
        amount: transaction.amount,
        currencyOrAsset: transaction.currencyOrAsset,
        occurredAt: transaction.occurredAt,
        paymentMethod: transaction.paymentMethod,
        reference: transaction.reference ?? undefined,
        timeKnown: transaction.timeKnown,
      })),
      type: report.type,
      violationType: report.violationType,
    });
  } catch (error) {
    throwBadRequest(
      error instanceof Error ? error.message : "Report is incomplete"
    );
  }
  const [updated] = await database
    .update(protectionRiskReport)
    .set({ publicPacketPreviewedAt: now, updatedAt: now })
    .where(eq(protectionRiskReport.id, report.id))
    .returning();
  if (!updated) {
    throw new ORPCError("CONFLICT", {
      message: "Risk report preview could not be saved",
    });
  }
  const publicIdentifiers = materials.identifiers.map(toPublicIdentifierView);

  return {
    evidence: materials.evidence.flatMap((evidence) => {
      const derivative = materials.derivatives.find(
        (item) => item.evidenceId === evidence.id
      );
      return derivative
        ? [
            {
              contentType: derivative.contentType,
              fileName: evidence.fileName,
              kind: evidence.kind,
            },
          ]
        : [];
    }),
    identifiers: publicIdentifiers.map((identifier) => ({
      holderName: identifier.holderName,
      institutionName: identifier.institutionName,
      maskedValue: identifier.maskedValue,
      publicValue: identifier.publicValue,
      role: identifier.role,
      type: identifier.type,
    })),
    previewedAt: updated.publicPacketPreviewedAt?.toISOString() ?? null,
    publicNarrative: updated.publicNarrative,
    publicTitle: createRiskReportPublicTitle({
      identifiers: publicIdentifiers,
      platform: updated.platform,
      type: updated.type,
    }),
    reportId: updated.id,
  };
};

export const deleteRiskReportDraft = async ({
  database,
  reporterUserId,
  reportId,
}: {
  database: Database;
  reporterUserId: string;
  reportId: string;
}): Promise<{ deleted: true }> => {
  const { report } = await findOwnedReport(database, reporterUserId, reportId);
  if (report.status !== "DRAFT") {
    throw new ORPCError("CONFLICT", {
      message: "Only an unsent draft can be deleted.",
    });
  }

  const deleted = await database
    .delete(protectionRiskReport)
    .where(eq(protectionRiskReport.id, report.id))
    .returning({ id: protectionRiskReport.id });
  if (deleted.length === 0) {
    throw new ORPCError("CONFLICT", {
      message: "Risk draft could not be deleted.",
    });
  }

  return { deleted: true };
};

export const requestRiskReportWithdrawal = async ({
  database,
  input,
  reporterUserId,
  now = new Date(),
}: {
  database: Database;
  input: { reason: string; reportId: string };
  now?: Date;
  reporterUserId: string;
}) => {
  const { report } = await findOwnedReport(
    database,
    reporterUserId,
    input.reportId
  );
  if (report.status === "DRAFT") {
    throw new ORPCError("CONFLICT", {
      message: "Draft reports can be deleted instead of withdrawn.",
    });
  }
  if (report.withdrawalStatus !== "NONE") {
    throw new ORPCError("CONFLICT", {
      message: "A withdrawal request already exists for this report.",
    });
  }

  const reason = input.reason.trim();
  const [updated] = await database
    .update(protectionRiskReport)
    .set({
      updatedAt: now,
      withdrawalReason: reason,
      withdrawalRequestedAt: now,
      withdrawalStatus: "REQUESTED",
    })
    .where(eq(protectionRiskReport.id, report.id))
    .returning();
  if (!updated) {
    throw new ORPCError("CONFLICT", {
      message: "Withdrawal request could not be created.",
    });
  }

  await database.insert(protectionRiskReportHistory).values({
    createdAt: now,
    reason: `Withdrawal requested: ${reason}`,
    reportId: report.id,
    status: report.status,
  });
  const recipients = await listNotificationRecipientsByRole(database, {
    role: "ADMIN",
    targetPath: `/avin-check/risk-reports/${report.id}`,
  });
  await createNotificationEvent(database, {
    body: `Báo cáo ${report.id} có yêu cầu rút lại cần được xem xét.`,
    context: { status: report.status, type: report.type },
    eventType: "protection_risk_report.withdrawal_requested",
    now,
    recipients,
    sourceId: `${report.id}:withdrawal`,
    sourceType: "PROTECTION_RISK_REPORT",
    title: "Yêu cầu rút lại báo cáo Avin Check",
  });
  await enqueueRiskEmail({
    database,
    eventType: "report.withdrawal_requested",
    htmlBody:
      "<p>Yêu cầu rút lại báo cáo Avin Check của bạn đã được tiếp nhận.</p>",
    now,
    recipientEmail: updated.reporterEmail,
    reportId: updated.id,
    sourceId: `${updated.id}:withdrawal`,
    sourceType: RISK_EMAIL_SOURCE_TYPE,
    subject: "Avin Check: đã tiếp nhận yêu cầu rút lại",
    textBody:
      "Yêu cầu rút lại báo cáo Avin Check của bạn đã được tiếp nhận. Bạn có thể theo dõi trong mục Báo cáo của tôi.",
  });

  const materials = await loadReportMaterials(database, updated.id);
  return toDraftView(
    updated,
    materials.identifiers,
    materials.evidence,
    materials.derivatives,
    materials.transactions
  );
};

export const requestRiskReportCorrection = async ({
  database,
  input,
  requesterEmail,
  requesterName,
  requesterUserId,
  now = new Date(),
}: {
  database: Database;
  input: RiskReportCorrectionRequestInput;
  now?: Date;
  requesterEmail: string;
  requesterName: string;
  requesterUserId: string;
}) => {
  const [report] = await database
    .select({
      id: protectionRiskReport.id,
      status: protectionRiskReport.status,
    })
    .from(protectionRiskReport)
    .where(
      and(eq(protectionRiskReport.id, input.reportId), publicNativeRiskFilter)
    )
    .limit(1);
  if (!report || !isPublicRiskReportStatus(report.status)) {
    throw new ORPCError("NOT_FOUND", {
      message: "Only a public Risk Report can receive a correction request.",
    });
  }

  const [existing] = await database
    .select({ id: protectionRiskCorrectionRequest.id })
    .from(protectionRiskCorrectionRequest)
    .where(
      and(
        eq(protectionRiskCorrectionRequest.reportId, input.reportId),
        eq(protectionRiskCorrectionRequest.requesterUserId, requesterUserId),
        inArray(protectionRiskCorrectionRequest.status, [
          "REQUESTED",
          "UNDER_REVIEW",
        ])
      )
    )
    .limit(1);
  if (existing) {
    throw new ORPCError("CONFLICT", {
      message: "Bạn đã có một yêu cầu đính chính đang được xem xét.",
    });
  }

  const [request] = await database
    .insert(protectionRiskCorrectionRequest)
    .values({
      authorityEvidenceReference: input.authorityEvidenceReference,
      createdAt: now,
      reason: input.reason,
      reportId: input.reportId,
      requesterEmail,
      requesterName,
      requesterRelationship: input.requesterRelationship,
      requesterUserId,
      updatedAt: now,
    })
    .returning();
  if (!request) {
    throw new ORPCError("CONFLICT", {
      message: "Yêu cầu đính chính không thể tạo.",
    });
  }

  const recipients = await listNotificationRecipientsByRole(database, {
    role: "ADMIN",
    targetPath: `/avin-check/risk-reports/${input.reportId}`,
  });
  await createNotificationEvent(database, {
    body: `Risk Report ${input.reportId} có yêu cầu đính chính mới.`,
    context: { requesterRelationship: input.requesterRelationship },
    eventType: "protection_risk_correction.requested",
    now,
    recipients,
    sourceId: request.id,
    sourceType: "PROTECTION_RISK_CORRECTION",
    title: "Yêu cầu đính chính Avin Check mới",
  });

  return toCorrectionView(request);
};

export const listRiskReportCorrectionsForRequester = async ({
  database,
  requesterUserId,
}: {
  database: Database;
  requesterUserId: string;
}) => {
  const requests = await database
    .select()
    .from(protectionRiskCorrectionRequest)
    .where(eq(protectionRiskCorrectionRequest.requesterUserId, requesterUserId))
    .orderBy(desc(protectionRiskCorrectionRequest.updatedAt));
  return requests.map(toCorrectionView);
};

export const listRiskReportCorrectionsForAdmin = async (database: Database) => {
  const requests = await database
    .select()
    .from(protectionRiskCorrectionRequest)
    .orderBy(desc(protectionRiskCorrectionRequest.updatedAt));
  return requests.map(toCorrectionView);
};

export const decideRiskReportCorrection = async ({
  database,
  decision,
  id,
  reason,
  reviewerUserId,
  now = new Date(),
}: {
  database: Database;
  decision: "APPROVED" | "REJECTED" | "UNDER_REVIEW";
  id: string;
  now?: Date;
  reason?: string;
  reviewerUserId: string;
}) => {
  const [request] = await database
    .select()
    .from(protectionRiskCorrectionRequest)
    .where(eq(protectionRiskCorrectionRequest.id, id))
    .limit(1);
  if (!request) {
    throw new ORPCError("NOT_FOUND", {
      message: "Correction request not found.",
    });
  }
  if (request.status !== "REQUESTED" && request.status !== "UNDER_REVIEW") {
    throw new ORPCError("CONFLICT", {
      message: "This correction request has already been finalized.",
    });
  }
  if (decision === "REJECTED" && !reason?.trim()) {
    throwBadRequest("A reason is required when rejecting a correction request");
  }

  const [updated] = await database
    .update(protectionRiskCorrectionRequest)
    .set({
      reviewReason: reason?.trim() || null,
      reviewedAt: decision === "UNDER_REVIEW" ? null : now,
      reviewedByUserId: decision === "UNDER_REVIEW" ? null : reviewerUserId,
      status: decision,
      updatedAt: now,
    })
    .where(eq(protectionRiskCorrectionRequest.id, id))
    .returning();
  if (!updated) {
    throw new ORPCError("CONFLICT", {
      message: "Correction request changed concurrently.",
    });
  }

  let eventType: NotificationEventType;
  if (decision === "APPROVED") {
    eventType = "protection_risk_correction.approved";
  } else if (decision === "REJECTED") {
    eventType = "protection_risk_correction.rejected";
  } else {
    eventType = "protection_risk_correction.requested";
  }

  if (updated.requesterUserId) {
    await createNotificationEvent(database, {
      body: `Yêu cầu đính chính của bạn đang ở trạng thái ${decision.toLowerCase()}.`,
      context: { decision },
      eventType,
      now,
      recipients: [
        {
          targetPath: "/avin-check/reports",
          userId: updated.requesterUserId,
        },
      ],
      sourceId: updated.id,
      sourceType: "PROTECTION_RISK_CORRECTION",
      title: "Avin Check: cập nhật yêu cầu đính chính",
    });
  }

  return toCorrectionView(updated);
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
      return toDraftView(
        report,
        materials.identifiers,
        materials.evidence,
        materials.derivatives,
        materials.transactions
      );
    })
  );
};

const assertRiskEvidenceReplayMatches = (
  evidence: RiskEvidence,
  input: RiskReportEvidenceInput
): void => {
  const matches =
    evidence.contentType === input.contentType &&
    evidence.explanation === input.explanation &&
    evidence.fileName === input.fileName &&
    evidence.kind === input.kind &&
    evidence.reportId === input.reportId &&
    evidence.sha256 === (input.sha256 ?? null) &&
    evidence.sizeBytes === input.sizeBytes;
  if (!matches) {
    throw new ORPCError("CONFLICT", {
      message:
        "The evidence upload key is already registered with different metadata",
    });
  }
};

export const addRiskReportEvidence = (
  database: Database,
  input: RiskReportEvidenceInput,
  reporterUserId: string,
  now = new Date()
) =>
  database.transaction(async (transaction) => {
    const [report] = await transaction
      .select()
      .from(protectionRiskReport)
      .where(
        and(
          eq(protectionRiskReport.id, input.reportId),
          eq(protectionRiskReport.reporterUserId, reporterUserId)
        )
      )
      .for("update")
      .limit(1);
    if (!report) {
      throw new ORPCError("NOT_FOUND", { message: "Risk report not found" });
    }
    if (!isRiskEvidenceContentType(input.contentType)) {
      throwBadRequest("This evidence file type is not supported");
    }
    if (
      input.sizeBytes > getNativeRiskReportEvidenceMaxBytes(input.contentType)
    ) {
      throwBadRequest("This evidence file is too large");
    }
    if (!isRiskReportEvidenceKey(input.originalStorageKey, input.reportId)) {
      throwBadRequest("The evidence storage key is not valid for this report");
    }
    if (
      !isNativeRiskReportEvidenceFileNameAllowed(
        input.fileName,
        input.contentType
      )
    ) {
      throwBadRequest("The evidence file name does not match its content type");
    }

    const [existingByKey] = await transaction
      .select()
      .from(protectionRiskEvidence)
      .where(
        eq(protectionRiskEvidence.originalStorageKey, input.originalStorageKey)
      )
      .limit(1);
    if (existingByKey) {
      assertRiskEvidenceReplayMatches(existingByKey, input);
      return toPrivateEvidenceView(existingByKey);
    }

    if (report.status !== "DRAFT" && report.status !== "CHANGES_REQUESTED") {
      throw new ORPCError("CONFLICT", {
        message: "Evidence can only be added to an editable report.",
      });
    }

    const existing = await transaction
      .select({
        contentType: protectionRiskEvidence.contentType,
        id: protectionRiskEvidence.id,
      })
      .from(protectionRiskEvidence)
      .where(eq(protectionRiskEvidence.reportId, input.reportId));
    if (existing.length >= RISK_REPORT_EVIDENCE_MAX_COUNT) {
      throwBadRequest(
        `A report can contain at most ${RISK_REPORT_EVIDENCE_MAX_COUNT} evidence files`
      );
    }
    if (
      isRiskReportVideoContentType(input.contentType) &&
      existing.filter((item) => isRiskReportVideoContentType(item.contentType))
        .length >= RISK_REPORT_EVIDENCE_MAX_VIDEO_COUNT
    ) {
      throwBadRequest(
        `A report can contain at most ${RISK_REPORT_EVIDENCE_MAX_VIDEO_COUNT} video evidence files`
      );
    }

    const [evidence] = await transaction
      .insert(protectionRiskEvidence)
      .values({
        contentType: input.contentType,
        createdAt: now,
        explanation: input.explanation,
        fileName: input.fileName,
        immutableAt: now,
        kind: input.kind,
        originalStorageKey: input.originalStorageKey,
        reportId: input.reportId,
        scanReason:
          "Private evidence intake; publication processing is deferred",
        scanStatus: "PENDING",
        sha256: input.sha256,
        sizeBytes: input.sizeBytes,
      })
      .onConflictDoNothing({
        target: protectionRiskEvidence.originalStorageKey,
      })
      .returning();
    if (evidence) {
      await transaction
        .update(protectionRiskReport)
        .set({ publicPacketPreviewedAt: null, updatedAt: now })
        .where(eq(protectionRiskReport.id, input.reportId));
      return toPrivateEvidenceView(evidence);
    }

    const [registeredEvidence] = await transaction
      .select()
      .from(protectionRiskEvidence)
      .where(
        eq(protectionRiskEvidence.originalStorageKey, input.originalStorageKey)
      )
      .limit(1);
    if (!registeredEvidence) {
      throw new ORPCError("CONFLICT", {
        message: "Evidence could not be registered",
      });
    }
    assertRiskEvidenceReplayMatches(registeredEvidence, input);
    return toPrivateEvidenceView(registeredEvidence);
  });

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
    .select({
      contentType: protectionRiskEvidence.contentType,
      id: protectionRiskEvidence.id,
    })
    .from(protectionRiskEvidence)
    .where(eq(protectionRiskEvidence.reportId, reportId));
  if (existing.length + files.length > RISK_REPORT_EVIDENCE_MAX_COUNT) {
    throw new ORPCError("BAD_REQUEST", {
      message: `A report can contain at most ${RISK_REPORT_EVIDENCE_MAX_COUNT} evidence files`,
    });
  }
  const existingVideoCount = existing.filter((item) =>
    isRiskReportVideoContentType(item.contentType)
  ).length;
  const requestedVideoCount = files.filter((file) =>
    isRiskReportVideoContentType(file.type)
  ).length;
  if (
    existingVideoCount + requestedVideoCount >
    RISK_REPORT_EVIDENCE_MAX_VIDEO_COUNT
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: `A report can contain at most ${RISK_REPORT_EVIDENCE_MAX_VIDEO_COUNT} video evidence files`,
    });
  }
  for (const file of files) {
    if (
      !isRiskEvidenceContentType(file.type) ||
      (file.size !== undefined &&
        file.size > getNativeRiskReportEvidenceMaxBytes(file.type))
    ) {
      throw new ORPCError("BAD_REQUEST", {
        message: "This evidence file type or size is not supported",
      });
    }
  }
};

export const submitRiskReport = async ({
  database,
  ipAddress,
  input,
  now = new Date(),
  reporterUserId,
}: {
  database: Database;
  ipAddress?: string;
  input: {
    attestationAccepted: true;
    attestationVersion: typeof RISK_REPORT_ATTESTATION_VERSION;
    reportId: string;
  };
  now?: Date;
  reporterUserId: string;
}) => {
  const result = await database.transaction(async (transaction) => {
    const [report] = await transaction
      .select()
      .from(protectionRiskReport)
      .where(
        and(
          eq(protectionRiskReport.id, input.reportId),
          eq(protectionRiskReport.reporterUserId, reporterUserId)
        )
      )
      .for("update")
      .limit(1);
    if (!report) {
      throw new ORPCError("NOT_FOUND", { message: "Risk report not found" });
    }

    const materials = await loadReportMaterials(transaction, report.id);
    if (report.status === "SUBMITTED") {
      return { materials, report };
    }

    assertRiskReportSubmissionAllowed(reporterUserId, ipAddress);
    const submissionEvidence = materials.evidence.map((evidence) => ({
      kind: evidence.kind,
      publicCopyReady: materials.derivatives.some(
        (derivative) => derivative.evidenceId === evidence.id
      ),
      scanStatus: evidence.scanStatus,
    }));
    assertRiskReportTransactionDestinations(report, materials.transactions);
    try {
      assertRiskReportIntake({
        accessLostAt: report.accessLostAt,
        claimedLoss: report.claimedLoss,
        evidence: submissionEvidence as RiskReportSubmissionEvidence[],
        handoverAt: report.handoverAt,
        identifiers: materials.identifiers,
        incidentAt: report.incidentAt,
        issues: report.issues as NonNullable<RiskReportDraftInput["issues"]>,
        lossOccurred: report.lossOccurred,
        narrative: report.narrative,
        otherIssueDescription: report.otherIssueDescription,
        platform: report.platform,
        publicNarrative: report.publicNarrative,
        publicPacketPreviewedAt: report.publicPacketPreviewedAt,
        purchaseAt: report.purchaseAt,
        reporterInvolvement: report.reporterInvolvement,
        transactions: materials.transactions.map((transactionRow) => ({
          amount: transactionRow.amount,
          currencyOrAsset: transactionRow.currencyOrAsset,
          occurredAt: transactionRow.occurredAt,
          paymentMethod: transactionRow.paymentMethod,
          reference: transactionRow.reference ?? undefined,
          timeKnown: transactionRow.timeKnown,
        })),
        type: report.type,
        violationType: report.violationType,
      });
      assertRiskReportTransition(report.status, "SUBMITTED");
    } catch (error) {
      throwBadRequest(
        error instanceof Error ? error.message : "Report is incomplete"
      );
    }

    const possibleDuplicateOfReportId = await findPossibleDuplicateReportId(
      transaction,
      report.id,
      materials.identifiers
    );
    const [updated] = await transaction
      .update(protectionRiskReport)
      .set({
        attestationVersion: input.attestationVersion,
        attestedAt: now,
        possibleDuplicateOfReportId,
        status: "SUBMITTED",
        submittedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(protectionRiskReport.id, report.id),
          eq(protectionRiskReport.status, report.status)
        )
      )
      .returning();
    if (!updated) {
      throw new ORPCError("CONFLICT", {
        message: "Risk report could not be submitted",
      });
    }

    await transaction.insert(protectionRiskReportHistory).values({
      createdAt: now,
      reason: null,
      reportId: report.id,
      status: "SUBMITTED",
    });
    const [latestRevision] = await transaction
      .select({ revisionNumber: protectionRiskReportRevision.revisionNumber })
      .from(protectionRiskReportRevision)
      .where(eq(protectionRiskReportRevision.reportId, report.id))
      .orderBy(desc(protectionRiskReportRevision.revisionNumber))
      .limit(1);
    await transaction.insert(protectionRiskReportRevision).values({
      reportId: report.id,
      revisionNumber: (latestRevision?.revisionNumber ?? 0) + 1,
      snapshot: {
        evidenceIds: materials.evidence.map((evidence) => evidence.id),
        identifiers: materials.identifiers.map((identifier) => ({
          id: identifier.id,
          role: identifier.role,
          type: identifier.type,
          value: identifier.value,
        })),
        issues: report.issues,
        narrative: report.narrative,
        publicNarrative: report.publicNarrative,
        transactions: materials.transactions.map((transactionRow) => ({
          amount: transactionRow.amount,
          currencyOrAsset: transactionRow.currencyOrAsset,
          destinationIdentifierId: transactionRow.destinationIdentifierId,
          occurredAt: transactionRow.occurredAt.toISOString(),
          paymentMethod: transactionRow.paymentMethod,
        })),
      },
      submittedAt: now,
    });
    await notifyRiskModerators(transaction, updated, "SUBMITTED", now);
    await notifyRiskReporter(transaction, updated, "SUBMITTED", now);
    await enqueueRiskReportStatusEmail(
      transaction,
      updated,
      "SUBMITTED",
      null,
      now
    );
    return { materials, report: updated };
  });
  return toDraftView(
    result.report,
    result.materials.identifiers,
    result.materials.evidence,
    result.materials.derivatives,
    result.materials.transactions
  );
};

export const listRiskReportsForAdmin = async (
  database: Database,
  input?: { search?: string; status?: RiskReportStatus }
) => {
  const reports = await database
    .select()
    .from(protectionRiskReport)
    .where(publicNativeRiskFilter)
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
      possibleDuplicateOfReportId: report.possibleDuplicateOfReportId,
      primaryIdentifier:
        identifiers.find((item) => item.isPrimary)?.maskedValue ?? null,
      reporterEmail: report.reporterEmail,
      reporterName: report.reporterName,
      reporterRelationship: report.reporterRelationship,
      status: report.status,
      submittedAt: toIso(report.submittedAt),
      type: report.type,
      updatedAt: report.updatedAt.toISOString(),
      urgency: report.urgency,
      violationType: report.violationType,
      withdrawalStatus: report.withdrawalStatus,
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
    .where(and(eq(protectionRiskReport.id, reportId), publicNativeRiskFilter))
    .limit(1);
  if (!report) {
    throw new ORPCError("NOT_FOUND", { message: "Risk report not found" });
  }
  const materials = await loadReportMaterials(database, report.id);
  const [reporterProviderProfile] = report.reporterUserId
    ? await database
        .select({ id: protectionProviderProfile.id })
        .from(protectionProviderProfile)
        .where(
          eq(protectionProviderProfile.providerUserId, report.reporterUserId)
        )
        .limit(1)
    : [];
  const derivativesByEvidenceId = new Map(
    materials.derivatives.map((item) => [item.evidenceId, item])
  );
  return {
    accessLostAt: toIso(report.accessLostAt),
    affectedVictimCount: report.affectedVictimCount,
    claimedLoss: report.claimedLoss,
    createdAt: report.createdAt.toISOString(),
    evidence: materials.evidence.map((item) =>
      toPrivateEvidenceView(item, derivativesByEvidenceId.get(item.id))
    ),
    handoverAt: toIso(report.handoverAt),
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
    incidentAt: toIso(report.incidentAt),
    incidentDateApproximate: report.incidentDateApproximate,
    issues: report.issues,
    lossOccurred: report.lossOccurred,
    narrative: report.narrative,
    ongoing: report.ongoing,
    platform: report.platform,
    possibleDuplicateOfReportId: report.possibleDuplicateOfReportId,
    privateNote: report.privateNote,
    providerConflictSignal:
      report.reporterRelationship &&
      report.reporterRelationship !== "NO_PROVIDER_RELATIONSHIP"
        ? {
            providerProfileId: reporterProviderProfile?.id ?? null,
            relationship: report.reporterRelationship,
          }
        : null,
    publicNarrative: report.publicNarrative,
    publicPacketPreviewedAt: toIso(report.publicPacketPreviewedAt),
    publicSlug: report.publicSlug,
    publicSummary: report.publicSummary,
    purchaseAt: toIso(report.purchaseAt),
    reporterEmail: report.reporterEmail,
    reporterInvolvement: report.reporterInvolvement,
    reporterName: report.reporterName,
    reporterPhone: report.reporterPhone,
    reporterRelationship: report.reporterRelationship,
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
    withdrawalReason: report.withdrawalReason,
    withdrawalRequestedAt: toIso(report.withdrawalRequestedAt),
    withdrawalStatus: report.withdrawalStatus,
  };
};

const assertReadyDerivatives = (
  report: RiskReport,
  evidence: RiskEvidence[],
  derivatives: RiskDerivative[]
): void => {
  if (evidence.length === 0) {
    throw new ORPCError("BAD_REQUEST", {
      message:
        "Báo cáo cần có ít nhất một bằng chứng đính kèm trước khi công khai.",
    });
  }
  if (derivatives.length === 0) {
    const hasCleanEvidence = evidence.some(
      (item) => item.scanStatus === "CLEAN"
    );
    if (!hasCleanEvidence) {
      throw new ORPCError("BAD_REQUEST", {
        message:
          "Tất cả bằng chứng phải vượt qua kiểm tra an toàn trước khi công khai.",
      });
    }
    return;
  }
  const derivativeByEvidenceId = new Map(
    derivatives.map((item) => [item.evidenceId, item])
  );
  const hasReadyDerivative = evidence.some((item) => {
    const derivative = derivativeByEvidenceId.get(item.id);
    return (
      derivative !== undefined &&
      isRiskReportDerivativeKey(derivative.storageKey, report.id, item.id) &&
      derivative.metadataRemoved &&
      derivative.unrelatedPiiRedacted &&
      derivative.watermarkApplied
    );
  });
  if (!hasReadyDerivative) {
    throw new ORPCError("BAD_REQUEST", {
      message:
        "Bằng chứng đã chỉnh sửa (derivative) chưa hợp lệ hoặc thiếu watermark.",
    });
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
  report,
  underVerificationApproved,
}: {
  decision: RiskReportDecisionStatus;
  launchConfiguration: ProtectionLaunchConfiguration;
  materials: ReportMaterials;
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
  const readinessStatus = getProtectionReadinessStatus(launchConfiguration);
  if (!readinessStatus.enabled) {
    throwBadRequest(
      `Risk report publication readiness is blocked: ${readinessStatus.blockers.join(", ")}`
    );
  }
  assertRiskReportTransactionDestinations(report, materials.transactions);
  assertRiskReportSubmission({
    accessLostAt: report.accessLostAt,
    claimedLoss: report.claimedLoss,
    evidence: materials.evidence.map((evidence) => ({
      kind: evidence.kind,
      publicCopyReady:
        materials.derivatives.some(
          (derivative) => derivative.evidenceId === evidence.id
        ) || evidence.scanStatus === "CLEAN",
      scanStatus: evidence.scanStatus,
    })) as RiskReportSubmissionEvidence[],
    handoverAt: report.handoverAt,
    identifiers: materials.identifiers,
    incidentAt: report.incidentAt,
    issues: report.issues as NonNullable<RiskReportDraftInput["issues"]>,
    lossOccurred: report.lossOccurred,
    narrative: report.narrative,
    otherIssueDescription: report.otherIssueDescription,
    platform: report.platform,
    publicNarrative: report.publicNarrative,
    publicPacketPreviewedAt: report.publicPacketPreviewedAt,
    purchaseAt: report.purchaseAt,
    reporterInvolvement: report.reporterInvolvement,
    transactions: materials.transactions.map((transaction) => ({
      amount: transaction.amount,
      currencyOrAsset: transaction.currencyOrAsset,
      occurredAt: transaction.occurredAt,
      paymentMethod: transaction.paymentMethod,
      reference: transaction.reference ?? undefined,
      timeKnown: transaction.timeKnown,
    })),
    type: report.type,
    violationType: report.violationType,
  });
  assertReadyDerivatives(report, materials.evidence, materials.derivatives);
  if (!report.publicNarrative?.trim()) {
    throwBadRequest("A public report narrative is required before publication");
  }
};

export const decideRiskReport = async ({
  database,
  decision,
  id,
  now = new Date(),
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
  reason?: string;
  reviewerUserId: string;
  underVerificationApproved?: boolean;
}) => {
  const [report] = await database
    .select()
    .from(protectionRiskReport)
    .where(and(eq(protectionRiskReport.id, id), publicNativeRiskFilter))
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
  try {
    assertRiskReportPublicationReady({
      decision,
      launchConfiguration,
      materials,
      report,
      underVerificationApproved,
    });
  } catch (error) {
    if (error instanceof ORPCError) {
      throw error;
    }
    throw new ORPCError("BAD_REQUEST", {
      message:
        error instanceof Error
          ? error.message
          : "Không thể phê duyệt báo cáo rủi ro.",
    });
  }

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
      publicSummary: report.publicSummary,
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
  if (sizeBytes > getNativeRiskReportEvidenceMaxBytes(contentType)) {
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
  if (
    !isNativeRiskReportEvidenceFileNameAllowed(derivativeFileName, contentType)
  ) {
    throwBadRequest("The derivative file name does not match its content type");
  }
  const [nativeReport] = await database
    .select({ id: protectionRiskReport.id })
    .from(protectionRiskReport)
    .where(and(eq(protectionRiskReport.id, reportId), publicNativeRiskFilter))
    .limit(1);
  if (!nativeReport) {
    throw new ORPCError("NOT_FOUND", { message: "Risk report not found" });
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
  await database
    .update(protectionRiskReport)
    .set({ publicPacketPreviewedAt: null, updatedAt: now })
    .where(eq(protectionRiskReport.id, reportId));
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
  const [nativeReport] = await database
    .select({ id: protectionRiskReport.id })
    .from(protectionRiskReport)
    .where(and(eq(protectionRiskReport.id, reportId), publicNativeRiskFilter))
    .limit(1);
  if (!nativeReport) {
    throw new ORPCError("NOT_FOUND", { message: "Risk report not found" });
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
  const payload: unknown = await response.json();
  const signedURL =
    typeof payload === "object" &&
    payload !== null &&
    "signedURL" in payload &&
    typeof payload.signedURL === "string"
      ? payload.signedURL
      : null;
  if (!signedURL) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Could not create a private evidence URL",
    });
  }
  const signedPath = signedURL.startsWith("/storage/v1/")
    ? signedURL
    : `/storage/v1${signedURL}`;
  const baseUrl = new URL(storage.supabaseUrl);
  const privateEvidenceUrl = new URL(signedPath, baseUrl);
  if (privateEvidenceUrl.origin !== baseUrl.origin) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Could not create a private evidence URL",
    });
  }
  return {
    expiresInSeconds: 300,
    url: privateEvidenceUrl.toString(),
  };
};

// oxlint-disable-next-line complexity
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
  const {
    externalSource,
    publicNarrative: reportPublicNarrative,
    publicSummary: reportPublicSummary,
  } = report;
  const publicSubjectIdentifiers: ReturnType<typeof toPublicIdentifierView>[] =
    [];
  const reportedAssets: ReturnType<typeof toPublicIdentifierView>[] = [];
  const impersonatedIdentities: ReturnType<typeof toPublicIdentifierView>[] =
    [];
  for (const identifier of identifiers) {
    if (publicSubjectIdentifierRoles.has(identifier.role)) {
      publicSubjectIdentifiers.push(toPublicIdentifierView(identifier));
    } else if (identifier.role === "REPORTED_ASSET") {
      reportedAssets.push(toPublicIdentifierView(identifier));
    } else if (identifier.role === "IMPERSONATED_IDENTITY") {
      impersonatedIdentities.push(toPublicIdentifierView(identifier));
    }
  }
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
  let publicNarrative = reportPublicNarrative;
  let publicSummary = externalSource ? reportPublicSummary : null;
  if (isRemoved) {
    publicNarrative = null;
    publicSummary = "Warning này đã được gỡ khỏi danh mục công khai.";
  } else if (externalSource) {
    publicNarrative = reportPublicNarrative ?? reportPublicSummary;
  }
  const publicTitle =
    report.externalTitle ??
    createRiskReportPublicTitle({
      identifiers: [
        ...publicSubjectIdentifiers,
        ...reportedAssets,
        ...impersonatedIdentities,
      ],
      platform: report.platform,
      type: report.type,
    });
  return {
    claimedLoss: isRemoved ? null : report.claimedLoss,
    evidence: isRemoved
      ? []
      : evidence.map((item) => {
          const derivative = derivativesByEvidenceId.get(item.id);
          const hasValidDerivative =
            derivative !== undefined &&
            isRiskReportDerivativeKey(
              derivative.storageKey,
              report.id,
              item.id
            ) &&
            derivative.metadataRemoved &&
            derivative.unrelatedPiiRedacted &&
            derivative.watermarkApplied;
          const storageKey = hasValidDerivative
            ? derivative.storageKey
            : item.originalStorageKey;
          const contentType = hasValidDerivative
            ? derivative.contentType
            : item.contentType;
          const sizeBytes = hasValidDerivative
            ? derivative.sizeBytes
            : item.sizeBytes;
          return {
            contentType,
            id: item.id,
            kind: item.kind,
            publicUrl: createPublicMediaUrl(supabaseUrl, storageKey),
            sizeBytes,
          };
        }),
    externalSource: report.externalSource
      ? {
          bankName: report.externalBankName,
          name: report.externalSource,
          platformUrl: report.externalPlatformUrl,
          sourceCreatedAt: toIso(report.externalSourceCreatedAt),
          sourceStatus: report.externalSourceStatus,
          sourceUrl: report.externalSourceUrl,
          suspectName: report.externalSuspectName,
          title: report.externalTitle,
        }
      : null,
    history: publicHistory,
    identifiers: isRemoved ? [] : publicSubjectIdentifiers,
    impersonatedIdentities: isRemoved ? [] : impersonatedIdentities,
    platform: isRemoved ? null : report.platform,
    publicNarrative,
    publicPath: createPublicWarningPath(
      report.publicSlug ?? createRiskReportPublicSlug(report.id)
    ),
    publicSlug: report.publicSlug ?? createRiskReportPublicSlug(report.id),
    publicSummary,
    publicTitle,
    publishedAt: toIso(report.publishedAt),
    reportId: report.id,
    reportedAssets: isRemoved ? [] : reportedAssets,
    status: report.status,
    supportOutcome: isRemoved ? null : supportOutcome,
    type: report.type,
    viewCount: report.viewCount,
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
  input:
    | {
        limit?: number;
      }
    | undefined,
  supabaseUrl = env.SUPABASE_URL
) => {
  const reports = await database
    .select()
    .from(protectionRiskReport)
    .where(
      and(
        inArray(protectionRiskReport.status, [
          "PUBLISHED",
          "CORRECTED",
          "REMOVED",
        ]),
        publicNativeRiskFilter
      )
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
          "REMOVED",
        ]),
        publicNativeRiskFilter
      )
    )
    .limit(1);
  if (!report || !isPublicRiskReportStatus(report.status)) {
    throw new ORPCError("NOT_FOUND", {
      message: "Public risk warning not found",
    });
  }
  await database
    .update(protectionRiskReport)
    .set({ viewCount: sql`${protectionRiskReport.viewCount} + 1` })
    .where(eq(protectionRiskReport.id, report.id));
  const [materials, supportOutcome] = await Promise.all([
    loadReportMaterials(database, report.id),
    getPublicSupportOutcome(database, report.id),
  ]);
  return toPublicWarningView(
    { ...report, viewCount: report.viewCount + 1 },
    materials.identifiers,
    materials.evidence,
    materials.derivatives,
    materials.history,
    supportOutcome,
    supabaseUrl
  );
};
