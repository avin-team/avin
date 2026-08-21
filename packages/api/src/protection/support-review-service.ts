import {
  protectionProviderBondAdjustment,
  protectionProviderProfile,
  protectionProviderProfileVersion,
  protectionProviderRiskIncident,
  protectionProviderRiskIncidentEvidence,
  protectionRiskEvidence,
  protectionRiskReport,
  protectionSupportReview,
  protectionSupportReviewHistory,
} from "@avin/db/schema/protection";
import { ORPCError } from "@orpc/server";
import type { SQL } from "drizzle-orm";
import { and, asc, desc, eq } from "drizzle-orm";

import type { Context } from "../runtime/context";
import {
  approveProviderBondAdjustment,
  recordProviderBondAdjustment,
} from "./bond-service";
import { assertSupportReviewTransition } from "./support-review";
import type {
  SupportReviewDecisionInput,
  SupportReviewEligibilityInput,
  SupportReviewOutcomeInput,
  SupportReviewReconsiderInput,
  SupportReviewStartInput,
  supportReviewPublicOutcomes,
} from "./support-review";

type Database = Context["db"];
type ProviderProfileVersion =
  typeof protectionProviderProfileVersion.$inferSelect;
type SupportReview = typeof protectionSupportReview.$inferSelect;
type SupportReviewHistory = typeof protectionSupportReviewHistory.$inferSelect;
type BondAdjustment = typeof protectionProviderBondAdjustment.$inferSelect;

const SUPPORT_ADJUSTMENT_SOURCE_TYPE = "PROTECTION_SUPPORT_REVIEW";
const ELIGIBLE_REPORT_STATUSES = [
  "UNDER_REVIEW",
  "PUBLISHED",
  "CORRECTED",
  "UNDER_VERIFICATION",
] as const;

const throwBadRequest = (message: string): never => {
  throw new ORPCError("BAD_REQUEST", { message });
};

const throwConflict = (message: string): never => {
  throw new ORPCError("CONFLICT", { message });
};

const toIso = (value: Date | null): string | null =>
  value?.toISOString() ?? null;

const findSupportReview = async (database: Database, reviewId: string) => {
  const [row] = await database
    .select({
      incident: protectionProviderRiskIncident,
      profile: protectionProviderProfile,
      profileVersion: protectionProviderProfileVersion,
      report: protectionRiskReport,
      review: protectionSupportReview,
    })
    .from(protectionSupportReview)
    .innerJoin(
      protectionProviderRiskIncident,
      eq(protectionSupportReview.incidentId, protectionProviderRiskIncident.id)
    )
    .innerJoin(
      protectionProviderProfile,
      eq(protectionSupportReview.profileId, protectionProviderProfile.id)
    )
    .innerJoin(
      protectionProviderProfileVersion,
      eq(
        protectionSupportReview.profileVersionId,
        protectionProviderProfileVersion.id
      )
    )
    .innerJoin(
      protectionRiskReport,
      eq(protectionSupportReview.riskReportId, protectionRiskReport.id)
    )
    .where(eq(protectionSupportReview.id, reviewId))
    .limit(1);
  return row ?? null;
};

const findSupportReviewForUpdate = async (
  database: Database,
  reviewId: string
): Promise<SupportReview | null> => {
  const query = database
    .select()
    .from(protectionSupportReview)
    .where(eq(protectionSupportReview.id, reviewId));
  const [review] = await query.for("update").limit(1);
  return review ?? null;
};

const findBondAdjustment = async (
  database: Database,
  adjustmentId: string
): Promise<BondAdjustment | null> => {
  const [adjustment] = await database
    .select()
    .from(protectionProviderBondAdjustment)
    .where(eq(protectionProviderBondAdjustment.id, adjustmentId))
    .limit(1);
  return adjustment ?? null;
};

const findSupportReviewHistory = (
  database: Database,
  reviewId: string
): Promise<SupportReviewHistory[]> =>
  database
    .select()
    .from(protectionSupportReviewHistory)
    .where(eq(protectionSupportReviewHistory.supportReviewId, reviewId))
    .orderBy(asc(protectionSupportReviewHistory.createdAt))
    .execute();

const appendSupportReviewHistory = async (
  database: Database,
  reviewId: string,
  status: SupportReview["status"],
  actorUserId: string | null,
  reason: string | null,
  createdAt: Date
): Promise<void> => {
  await database.insert(protectionSupportReviewHistory).values({
    actorUserId,
    createdAt,
    reason,
    status,
    supportReviewId: reviewId,
  });
};

const listProfileVersions = async (database: Database, profileId: string) => {
  const versions = await database
    .select()
    .from(protectionProviderProfileVersion)
    .where(eq(protectionProviderProfileVersion.profileId, profileId))
    .orderBy(desc(protectionProviderProfileVersion.versionNumber))
    .execute();
  return versions.map((version) => ({
    publishedAt: version.publishedAt.toISOString(),
    recommendedTransactionLimit: version.recommendedTransactionLimit,
    versionId: version.id,
    versionNumber: version.versionNumber,
  }));
};

const toAdminHistoryView = (history: SupportReviewHistory) => ({
  actorUserId: history.actorUserId,
  createdAt: history.createdAt.toISOString(),
  id: history.id,
  reason: history.reason,
  status: history.status,
});

const toAdminBondAdjustmentView = (adjustment: BondAdjustment | null) =>
  adjustment
    ? {
        approvalReason: adjustment.approvalReason,
        approvedAt: toIso(adjustment.approvedAt),
        approvedByUserId: adjustment.approvedByUserId,
        balanceAfter: adjustment.balanceAfter,
        balanceBefore: adjustment.balanceBefore,
        deltaAmount: adjustment.deltaAmount,
        evidenceReference: adjustment.evidenceReference,
        id: adjustment.id,
        kind: adjustment.kind,
        reason: adjustment.reason,
        sourceId: adjustment.sourceId,
        sourceType: adjustment.sourceType,
        status: adjustment.status,
      }
    : null;

const toAdminSupportReviewView = (
  row: NonNullable<Awaited<ReturnType<typeof findSupportReview>>>,
  history: SupportReviewHistory[],
  profileVersions: Awaited<ReturnType<typeof listProfileVersions>>,
  bondAdjustment: BondAdjustment | null
) => ({
  approvalReason: row.review.approvalReason,
  approvedAt: toIso(row.review.approvedAt),
  approvedByUserId: row.review.approvedByUserId,
  approvedServiceConfirmed: row.review.approvedServiceConfirmed,
  bondAdjustment: toAdminBondAdjustmentView(bondAdjustment),
  createdAt: row.review.createdAt.toISOString(),
  eligibilityReason: row.review.eligibilityReason,
  evidenceSufficient: row.review.evidenceSufficient,
  externalActionReference: row.review.externalActionReference,
  historicalRecommendedTransactionLimit:
    row.review.historicalRecommendedTransactionLimit,
  history: history.map(toAdminHistoryView),
  id: row.review.id,
  incident: {
    id: row.incident.id,
    responseDeadlineAt: row.incident.responseDeadlineAt.toISOString(),
    responseStatus: row.incident.status,
  },
  ineligibilityReason: row.review.ineligibilityReason,
  outcomeReason: row.review.outcomeReason,
  outcomeRecordedAt: toIso(row.review.outcomeRecordedAt),
  outcomeRecordedByUserId: row.review.outcomeRecordedByUserId,
  preTransactionVideoPresent: row.review.preTransactionVideoPresent,
  privateEvidenceReference: row.review.privateEvidenceReference,
  profile: {
    displayName: row.profile.displayName,
    id: row.profile.id,
    profileSlug: row.profile.profileSlug,
    providerUserId: row.profile.providerUserId,
    status: row.profile.status,
  },
  profileVersion: {
    recommendedTransactionLimit: row.profileVersion.recommendedTransactionLimit,
    versionId: row.profileVersion.id,
    versionNumber: row.profileVersion.versionNumber,
  },
  profileVersions,
  providerIdentityConfirmed: row.review.providerIdentityConfirmed,
  publicOutcome: row.review.publicOutcome,
  recommendedSupportAmount: row.review.recommendedSupportAmount,
  reconsiderationCount: row.review.reconsiderationCount,
  reconsiderationEvidenceReference: row.review.reconsiderationEvidenceReference,
  reconsiderationReason: row.review.reconsiderationReason,
  reconsideredAt: toIso(row.review.reconsideredAt),
  registeredPaymentIdentityConfirmed:
    row.review.registeredPaymentIdentityConfirmed,
  requiredProcessCompleted: row.review.requiredProcessCompleted,
  reviewedAt: toIso(row.review.reviewedAt),
  reviewedByUserId: row.review.reviewedByUserId,
  riskReport: {
    id: row.report.id,
    publicSlug: row.report.publicSlug,
    status: row.report.status,
    type: row.report.type,
  },
  startedAt: row.review.startedAt.toISOString(),
  startedByUserId: row.review.startedByUserId,
  status: row.review.status,
  supportAmount: row.review.supportAmount,
  transactionChannel: row.review.transactionChannel,
  transactionLawfulConfirmed: row.review.transactionLawfulConfirmed,
  transactionOccurredAt: toIso(row.review.transactionOccurredAt),
  transactionProfileVersionId: row.review.transactionProfileVersionId,
  transactionScope: row.review.transactionScope,
  updatedAt: row.review.updatedAt.toISOString(),
  verifiedActualLoss: row.review.verifiedActualLoss,
});

const getAdminSupportReviewView = async (
  database: Database,
  reviewId: string
) => {
  const row = await findSupportReview(database, reviewId);
  if (!row) {
    throw new ORPCError("NOT_FOUND", {
      message: "Support Review does not exist",
    });
  }
  const [history, profileVersions, bondAdjustment] = await Promise.all([
    findSupportReviewHistory(database, reviewId),
    listProfileVersions(database, row.profile.id),
    row.review.bondAdjustmentId
      ? findBondAdjustment(database, row.review.bondAdjustmentId)
      : Promise.resolve(null),
  ]);
  return toAdminSupportReviewView(
    row,
    history,
    profileVersions,
    bondAdjustment
  );
};

export const getAdminSupportReview = (database: Database, reviewId: string) =>
  getAdminSupportReviewView(database, reviewId);

const findIncidentContext = async (database: Database, incidentId: string) => {
  const [row] = await database
    .select({
      incident: protectionProviderRiskIncident,
      profile: protectionProviderProfile,
      profileVersion: protectionProviderProfileVersion,
      report: protectionRiskReport,
    })
    .from(protectionProviderRiskIncident)
    .innerJoin(
      protectionProviderProfile,
      eq(
        protectionProviderRiskIncident.providerProfileId,
        protectionProviderProfile.id
      )
    )
    .innerJoin(
      protectionProviderProfileVersion,
      eq(
        protectionProviderRiskIncident.providerProfileVersionId,
        protectionProviderProfileVersion.id
      )
    )
    .innerJoin(
      protectionRiskReport,
      eq(protectionProviderRiskIncident.riskReportId, protectionRiskReport.id)
    )
    .where(eq(protectionProviderRiskIncident.id, incidentId))
    .limit(1);
  return row ?? null;
};

const assertReportCanStartSupportReview = (
  incidentStatus: string,
  reportStatus: string
): void => {
  if (incidentStatus !== "UNDER_REVIEW") {
    throwBadRequest(
      "Only a Provider-linked incident that is under moderation review can start a Support Review"
    );
  }
  if (
    !ELIGIBLE_REPORT_STATUSES.includes(
      reportStatus as (typeof ELIGIBLE_REPORT_STATUSES)[number]
    )
  ) {
    throwBadRequest("Only a moderated Risk Report can start a Support Review");
  }
};

export const startSupportReview = async ({
  database,
  incidentId,
  now = new Date(),
  reason,
  reviewerUserId,
}: SupportReviewStartInput & {
  database: Database;
  now?: Date;
  reviewerUserId: string;
}) => {
  const reviewId = await database.transaction(async (transaction) => {
    const context = await findIncidentContext(transaction, incidentId);
    if (!context) {
      throw new ORPCError("NOT_FOUND", {
        message: "Provider-linked incident does not exist",
      });
    }
    assertReportCanStartSupportReview(
      context.incident.status,
      context.report.status
    );
    if (["REMOVED_FOR_FRAUD", "WITHDRAWN"].includes(context.profile.status)) {
      throwBadRequest(
        "A withdrawn or fraud-removed Provider cannot start a Support Review"
      );
    }
    const [existing] = await transaction
      .select()
      .from(protectionSupportReview)
      .where(eq(protectionSupportReview.incidentId, incidentId))
      .limit(1);
    if (existing) {
      return existing.id;
    }

    const [created] = await transaction
      .insert(protectionSupportReview)
      .values({
        createdAt: now,
        incidentId,
        policyVersionId:
          context.incident.policyVersionId ??
          context.profileVersion.policyVersionId,
        profileId: context.profile.id,
        profileVersionId: context.profileVersion.id,
        providerUserId: context.profile.providerUserId,
        riskReportId: context.report.id,
        startedAt: now,
        startedByUserId: reviewerUserId,
        status: "ELIGIBILITY_REVIEW",
        updatedAt: now,
      })
      .returning();
    if (!created) {
      return throwConflict("Support Review could not be started");
    }
    await appendSupportReviewHistory(
      transaction,
      created.id,
      created.status,
      reviewerUserId,
      reason?.trim() || "Provider-linked report promoted to Support Review.",
      now
    );
    return created.id;
  });

  return getAdminSupportReviewView(database, reviewId);
};

export const listSupportReviewsForAdmin = async (
  database: Database,
  input?: {
    incidentId?: string;
    profileId?: string;
    status?: SupportReview["status"];
  }
) => {
  const conditions: SQL[] = [];
  if (input?.incidentId) {
    conditions.push(eq(protectionSupportReview.incidentId, input.incidentId));
  }
  if (input?.profileId) {
    conditions.push(eq(protectionSupportReview.profileId, input.profileId));
  }
  if (input?.status) {
    conditions.push(eq(protectionSupportReview.status, input.status));
  }
  const reviews = await database
    .select({ id: protectionSupportReview.id })
    .from(protectionSupportReview)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(protectionSupportReview.createdAt))
    .execute();

  const views = [];
  for (const review of reviews) {
    views.push(await getAdminSupportReviewView(database, review.id));
  }
  return views;
};

const hasRecordedEvidence = async (
  database: Database,
  reportId: string,
  incidentId: string
): Promise<boolean> => {
  const [reportEvidence, incidentEvidence] = await Promise.all([
    database
      .select({ id: protectionRiskEvidence.id })
      .from(protectionRiskEvidence)
      .where(eq(protectionRiskEvidence.reportId, reportId))
      .limit(1),
    database
      .select({ id: protectionProviderRiskIncidentEvidence.id })
      .from(protectionProviderRiskIncidentEvidence)
      .where(eq(protectionProviderRiskIncidentEvidence.incidentId, incidentId))
      .limit(1),
  ]);
  return reportEvidence.length > 0 || incidentEvidence.length > 0;
};

const getEligibilityFailures = ({
  effectiveVersion,
  hasEvidence,
  input,
}: {
  effectiveVersion: ProviderProfileVersion | null;
  hasEvidence: boolean;
  input: SupportReviewEligibilityInput;
}): string[] => {
  const failures: string[] = [];
  if (!input.providerIdentityConfirmed) {
    failures.push("The transaction does not identify the linked Provider");
  }
  if (!input.approvedServiceConfirmed) {
    failures.push("The transaction is outside the approved Provider service");
  }
  if (
    !input.registeredPaymentIdentityConfirmed ||
    !effectiveVersion?.paymentAccount
  ) {
    failures.push("The transaction does not use a registered payment identity");
  }
  if (
    input.transactionChannel === "OTHER" ||
    input.transactionScope !== "DIRECT" ||
    !input.transactionLawfulConfirmed
  ) {
    failures.push(
      "Only lawful direct Facebook or Zalo transactions are eligible"
    );
  }
  if (!input.evidenceSufficient || !hasEvidence) {
    failures.push("The recorded evidence is not sufficient");
  }
  if (!input.requiredProcessCompleted) {
    failures.push("The required transaction process was not completed");
  }
  if (!input.preTransactionVideoPresent) {
    failures.push(
      "Mandatory pre-transaction screen video is missing; the public warning remains separate from Bond-backed support"
    );
  }
  if (input.verifiedActualLoss <= 0) {
    failures.push("No verified actual loss was established");
  }
  return failures;
};

export const evaluateSupportReview = async ({
  database,
  input,
  now = new Date(),
  reviewerUserId,
}: {
  database: Database;
  input: SupportReviewEligibilityInput;
  now?: Date;
  reviewerUserId: string;
}) => {
  const transactionOccurredAt = new Date(input.transactionOccurredAt);
  if (Number.isNaN(transactionOccurredAt.getTime())) {
    return throwBadRequest("Transaction time is invalid");
  }
  if (transactionOccurredAt.getTime() > now.getTime()) {
    return throwBadRequest("Transaction time cannot be in the future");
  }

  await database.transaction(async (transaction) => {
    const review = await findSupportReviewForUpdate(
      transaction,
      input.reviewId
    );
    if (!review) {
      throw new ORPCError("NOT_FOUND", {
        message: "Support Review does not exist",
      });
    }
    if (review.status !== "ELIGIBILITY_REVIEW") {
      throwConflict("This Support Review is not awaiting eligibility review");
    }
    const context = await findIncidentContext(transaction, review.incidentId);
    if (!context) {
      throw new ORPCError("NOT_FOUND", {
        message: "Provider-linked incident does not exist",
      });
    }
    const versions = await transaction
      .select()
      .from(protectionProviderProfileVersion)
      .where(eq(protectionProviderProfileVersion.profileId, review.profileId))
      .orderBy(desc(protectionProviderProfileVersion.versionNumber))
      .execute();
    const effectiveVersion =
      versions.find(
        (version) =>
          version.publishedAt.getTime() <= transactionOccurredAt.getTime()
      ) ?? null;
    if (
      !effectiveVersion ||
      effectiveVersion.id !== input.transactionProfileVersionId
    ) {
      return throwBadRequest(
        "The selected profile version was not authoritative at transaction time"
      );
    }

    const recordedEvidence = await hasRecordedEvidence(
      transaction,
      context.report.id,
      context.incident.id
    );
    const failures = getEligibilityFailures({
      effectiveVersion,
      hasEvidence: recordedEvidence,
      input,
    });
    const isEligible = failures.length === 0;
    const nextStatus: SupportReview["status"] = isEligible
      ? "ELIGIBLE"
      : "INELIGIBLE";
    assertSupportReviewTransition(review.status, nextStatus);
    const [updated] = await transaction
      .update(protectionSupportReview)
      .set({
        approvedServiceConfirmed: input.approvedServiceConfirmed,
        eligibilityReason: input.reason.trim(),
        evidenceSufficient: input.evidenceSufficient && recordedEvidence,
        historicalRecommendedTransactionLimit:
          effectiveVersion.recommendedTransactionLimit,
        ineligibilityReason: isEligible ? null : failures.join(" "),
        preTransactionVideoPresent: input.preTransactionVideoPresent,
        privateEvidenceReference: input.privateEvidenceReference.trim(),
        profileVersionId: context.profileVersion.id,
        providerIdentityConfirmed: input.providerIdentityConfirmed,
        publicOutcome: isEligible ? "UNDER_VERIFICATION" : "INELIGIBLE",
        recommendedSupportAmount: isEligible
          ? Math.min(
              input.verifiedActualLoss,
              effectiveVersion.recommendedTransactionLimit
            )
          : 0,
        registeredPaymentIdentityConfirmed:
          input.registeredPaymentIdentityConfirmed &&
          Boolean(effectiveVersion.paymentAccount),
        requiredProcessCompleted: input.requiredProcessCompleted,
        reviewedAt: now,
        reviewedByUserId: reviewerUserId,
        status: nextStatus,
        transactionChannel: input.transactionChannel,
        transactionLawfulConfirmed: input.transactionLawfulConfirmed,
        transactionOccurredAt,
        transactionProfileVersionId: effectiveVersion.id,
        transactionScope: input.transactionScope,
        updatedAt: now,
        verifiedActualLoss: input.verifiedActualLoss,
      })
      .where(
        and(
          eq(protectionSupportReview.id, review.id),
          eq(protectionSupportReview.status, "ELIGIBILITY_REVIEW")
        )
      )
      .returning();
    if (!updated) {
      throwConflict("Support Review changed while eligibility was evaluated");
    }
    await appendSupportReviewHistory(
      transaction,
      review.id,
      nextStatus,
      reviewerUserId,
      isEligible ? input.reason.trim() : failures.join(" "),
      now
    );
  });

  return getAdminSupportReviewView(database, input.reviewId);
};

export const recordSupportReviewOutcome = async ({
  database,
  input,
  now = new Date(),
  recorderUserId,
}: {
  database: Database;
  input: SupportReviewOutcomeInput;
  now?: Date;
  recorderUserId: string;
}) => {
  const review = await findSupportReview(database, input.reviewId);
  if (!review) {
    throw new ORPCError("NOT_FOUND", {
      message: "Support Review does not exist",
    });
  }
  if (review.review.status === "PENDING_APPROVAL") {
    return getAdminSupportReviewView(database, input.reviewId);
  }
  if (review.review.status !== "ELIGIBLE") {
    throwConflict("Only an eligible Support Review can record an outcome");
  }
  const recommendedSupportAmount = review.review.recommendedSupportAmount ?? 0;
  if (input.supportAmount > recommendedSupportAmount) {
    throwConflict(
      "Support cannot exceed verified actual loss or the historical Recommended Transaction Limit"
    );
  }

  const idempotencyKey = `support-review-${review.review.id}-${review.review.reconsiderationCount}`;
  let bondAdjustmentId: string | null = null;
  if (input.supportAmount > 0) {
    const bond = await recordProviderBondAdjustment({
      database,
      input: {
        deltaAmount: -input.supportAmount,
        evidenceReference: input.privateEvidenceReference,
        idempotencyKey,
        kind: "SUPPORT_ALLOCATION",
        profileId: review.profile.id,
        reason: `Support Review ${review.review.id}: ${input.reason}`,
        sourceId: review.review.id,
        sourceType: SUPPORT_ADJUSTMENT_SOURCE_TYPE,
      },
      now,
      recordedByUserId: recorderUserId,
    });
    const adjustment = bond.adjustments.find(
      (candidate) => candidate.idempotencyKey === idempotencyKey
    );
    if (!adjustment) {
      return throwConflict("Support Bond Adjustment could not be linked");
    }
    bondAdjustmentId = adjustment.id;
  }

  await database.transaction(async (transaction) => {
    const locked = await findSupportReviewForUpdate(
      transaction,
      input.reviewId
    );
    if (!locked) {
      throw new ORPCError("NOT_FOUND", {
        message: "Support Review does not exist",
      });
    }
    if (locked.status === "PENDING_APPROVAL") {
      return;
    }
    if (locked.status !== "ELIGIBLE") {
      throwConflict("Support Review changed before the outcome was recorded");
    }
    assertSupportReviewTransition(locked.status, "PENDING_APPROVAL");
    const [updated] = await transaction
      .update(protectionSupportReview)
      .set({
        bondAdjustmentId,
        externalActionReference: input.externalActionReference.trim(),
        outcomeReason: input.reason.trim(),
        outcomeRecordedAt: now,
        outcomeRecordedByUserId: recorderUserId,
        privateEvidenceReference: input.privateEvidenceReference.trim(),
        publicOutcome: input.publicOutcome,
        status: "PENDING_APPROVAL",
        supportAmount: input.supportAmount,
        updatedAt: now,
      })
      .where(
        and(
          eq(protectionSupportReview.id, input.reviewId),
          eq(protectionSupportReview.status, "ELIGIBLE")
        )
      )
      .returning();
    if (!updated) {
      throwConflict("Support Review changed before the outcome was recorded");
    }
    await appendSupportReviewHistory(
      transaction,
      input.reviewId,
      "PENDING_APPROVAL",
      recorderUserId,
      input.reason.trim(),
      now
    );
  });

  return getAdminSupportReviewView(database, input.reviewId);
};

export const approveSupportReview = async ({
  database,
  input,
  now = new Date(),
  approverUserId,
}: {
  database: Database;
  input: SupportReviewDecisionInput;
  now?: Date;
  approverUserId: string;
}) => {
  const review = await findSupportReview(database, input.reviewId);
  if (!review) {
    throw new ORPCError("NOT_FOUND", {
      message: "Support Review does not exist",
    });
  }
  if (["APPROVED", "DECLINED"].includes(review.review.status)) {
    return getAdminSupportReviewView(database, input.reviewId);
  }
  if (review.review.status !== "PENDING_APPROVAL") {
    throwConflict("Only a pending Support Review can be decided");
  }
  if (review.review.outcomeRecordedByUserId === approverUserId) {
    throw new ORPCError("FORBIDDEN", {
      message: "The Admin who recorded the support outcome cannot approve it",
    });
  }
  if (input.decision === "REJECTED" && !input.reason?.trim()) {
    throwBadRequest("A reason is required to reject a Support Review");
  }

  const adjustment = review.review.bondAdjustmentId
    ? await findBondAdjustment(database, review.review.bondAdjustmentId)
    : null;
  if (adjustment) {
    if (input.decision === "APPROVED" && adjustment.status === "REJECTED") {
      throwConflict("The linked Bond Adjustment was already rejected");
    }
    if (input.decision === "REJECTED" && adjustment.status === "APPLIED") {
      throwConflict("The linked Bond Adjustment was already applied");
    }
    if (adjustment.status === "PENDING_APPROVAL") {
      await approveProviderBondAdjustment({
        database,
        input: {
          adjustmentId: adjustment.id,
          decision: input.decision,
          reason: input.reason,
        },
        now,
        reviewerUserId: approverUserId,
      });
    }
  }

  const nextStatus: SupportReview["status"] =
    input.decision === "APPROVED" ? "APPROVED" : "DECLINED";
  await database.transaction(async (transaction) => {
    const locked = await findSupportReviewForUpdate(
      transaction,
      input.reviewId
    );
    if (!locked) {
      throw new ORPCError("NOT_FOUND", {
        message: "Support Review does not exist",
      });
    }
    if (["APPROVED", "DECLINED"].includes(locked.status)) {
      return;
    }
    assertSupportReviewTransition(locked.status, nextStatus);
    const [updated] = await transaction
      .update(protectionSupportReview)
      .set({
        approvalReason: input.reason?.trim() || null,
        approvedAt: now,
        approvedByUserId: approverUserId,
        status: nextStatus,
        updatedAt: now,
      })
      .where(
        and(
          eq(protectionSupportReview.id, input.reviewId),
          eq(protectionSupportReview.status, "PENDING_APPROVAL")
        )
      )
      .returning();
    if (!updated) {
      throwConflict("Support Review was decided by another Manager");
    }
    await appendSupportReviewHistory(
      transaction,
      input.reviewId,
      nextStatus,
      approverUserId,
      input.reason?.trim() || null,
      now
    );
  });

  return getAdminSupportReviewView(database, input.reviewId);
};

export const reconsiderSupportReview = async ({
  database,
  input,
  now = new Date(),
  reviewerUserId,
}: {
  database: Database;
  input: SupportReviewReconsiderInput;
  now?: Date;
  reviewerUserId: string;
}) => {
  await database.transaction(async (transaction) => {
    const review = await findSupportReviewForUpdate(
      transaction,
      input.reviewId
    );
    if (!review) {
      throw new ORPCError("NOT_FOUND", {
        message: "Support Review does not exist",
      });
    }
    if (!["INELIGIBLE", "DECLINED"].includes(review.status)) {
      throwConflict(
        "Only an ineligible or declined Support Review can be reconsidered"
      );
    }
    if (review.reconsiderationCount >= 1) {
      throwConflict("Only one Support Review reconsideration is allowed");
    }
    assertSupportReviewTransition(review.status, "ELIGIBILITY_REVIEW");
    const [updated] = await transaction
      .update(protectionSupportReview)
      .set({
        approvalReason: null,
        approvedAt: null,
        approvedByUserId: null,
        approvedServiceConfirmed: null,
        bondAdjustmentId: null,
        eligibilityReason: null,
        evidenceSufficient: null,
        externalActionReference: null,
        historicalRecommendedTransactionLimit: null,
        ineligibilityReason: null,
        outcomeReason: null,
        outcomeRecordedAt: null,
        outcomeRecordedByUserId: null,
        preTransactionVideoPresent: null,
        privateEvidenceReference:
          input.privateEvidenceReference?.trim() || null,
        providerIdentityConfirmed: null,
        publicOutcome: null,
        recommendedSupportAmount: null,
        reconsiderationCount: review.reconsiderationCount + 1,
        reconsiderationEvidenceReference:
          input.privateEvidenceReference?.trim() || null,
        reconsiderationReason: input.reason.trim(),
        reconsideredAt: now,
        registeredPaymentIdentityConfirmed: null,
        requiredProcessCompleted: null,
        reviewedAt: null,
        reviewedByUserId: null,
        status: "ELIGIBILITY_REVIEW",
        supportAmount: null,
        transactionChannel: null,
        transactionLawfulConfirmed: null,
        transactionOccurredAt: null,
        transactionProfileVersionId: null,
        transactionScope: null,
        updatedAt: now,
        verifiedActualLoss: null,
      })
      .where(
        and(
          eq(protectionSupportReview.id, input.reviewId),
          eq(protectionSupportReview.status, review.status)
        )
      )
      .returning();
    if (!updated) {
      throwConflict("Support Review changed before reconsideration");
    }
    await appendSupportReviewHistory(
      transaction,
      input.reviewId,
      "ELIGIBILITY_REVIEW",
      reviewerUserId,
      `${input.basis}: ${input.reason.trim()}`,
      now
    );
  });

  return getAdminSupportReviewView(database, input.reviewId);
};

export const getPublicSupportOutcome = async (
  database: Database,
  reportId: string
): Promise<{ status: (typeof supportReviewPublicOutcomes)[number] } | null> => {
  const [review] = await database
    .select({ publicOutcome: protectionSupportReview.publicOutcome })
    .from(protectionSupportReview)
    .where(eq(protectionSupportReview.riskReportId, reportId))
    .orderBy(desc(protectionSupportReview.updatedAt))
    .limit(1);
  return review?.publicOutcome ? { status: review.publicOutcome } : null;
};
