import { user } from "@avin/db/schema/auth";
import {
  protectionProviderBondAccount,
  protectionProviderBondAdjustment,
  protectionProviderBondWithdrawal,
  protectionPolicyVersion,
  protectionProviderApplication,
  protectionProviderOwnershipChange,
  protectionProviderProfile,
  protectionProviderProfileRevision,
  protectionProviderProfileVersion,
  protectionProviderRiskIncident,
  protectionRiskReport,
} from "@avin/db/schema/protection";
import type { ProviderOfficialChannels } from "@avin/db/schema/protection";
import { sellerEnforcementAction } from "@avin/db/schema/seller-enforcement";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, inArray, lte, ne } from "drizzle-orm";

import {
  createNotificationEvent,
  listNotificationRecipientsByRole,
} from "../notifications/notification";
import type { Context } from "../runtime/context";
import {
  assertProviderApplicationTransition,
  createProviderProfileSlug,
  CURRENT_PROVIDER_POLICY_VERSION,
  providerOwnershipRelinkInputSchema,
  validateProviderApplicationSubmission,
} from "./provider-application";
import type {
  ProviderApplicationDecision,
  ProviderApplicationStatus,
} from "./provider-application";
import {
  createRiskReportPublicPath,
  publicRiskReportStatuses,
} from "./risk-report";

type Database = Context["db"];
type ProviderApplication = typeof protectionProviderApplication.$inferSelect;
type ProviderProfile = typeof protectionProviderProfile.$inferSelect;
type ProviderProfileRevision =
  typeof protectionProviderProfileRevision.$inferSelect;
type ProviderProfileVersion =
  typeof protectionProviderProfileVersion.$inferSelect;

const providerProfilePath = (profileSlug: string): string =>
  `/avin-check/provider/${profileSlug}`;

const toPublicProviderOfficialChannels = (
  channels: ProviderOfficialChannels | null | undefined
) => ({
  avatarUrl: channels?.avatarUrl,
  bioShop: channels?.bioShop,
  facebookId: channels?.facebookId,
  facebookUrl: channels?.facebookUrl,
  note: channels?.note,
  telegramCommunityUrl: channels?.telegramCommunityUrl,
  websiteUrl: channels?.websiteUrl,
  zalo: channels?.zalo,
});

const toIso = (value: Date | null): string | null =>
  value?.toISOString() ?? null;

const assertProviderApplicationEligibility = async (
  database: Database,
  providerUserId: string
): Promise<void> => {
  const [latestFraudAction] = await database
    .select({
      newState: sellerEnforcementAction.newState,
      reasonCode: sellerEnforcementAction.reasonCode,
    })
    .from(sellerEnforcementAction)
    .where(eq(sellerEnforcementAction.sellerId, providerUserId))
    .orderBy(
      desc(sellerEnforcementAction.effectiveAt),
      desc(sellerEnforcementAction.createdAt)
    )
    .limit(1);

  const confirmedFraud =
    latestFraudAction?.newState === "BANNED" &&
    latestFraudAction.reasonCode === "FRAUD_RISK";
  if (!confirmedFraud) {
    return;
  }

  const [existingProfile] = await database
    .select({
      id: protectionProviderProfile.id,
      status: protectionProviderProfile.status,
    })
    .from(protectionProviderProfile)
    .where(eq(protectionProviderProfile.providerUserId, providerUserId))
    .limit(1);

  if (existingProfile) {
    if (existingProfile.status === "ACTIVE") {
      await database
        .update(protectionProviderProfile)
        .set({
          status: "SUSPENDED_PENDING_REVIEW",
          statusReason:
            "Confirmed marketplace fraud requires an Avin Check Provider review.",
          updatedAt: new Date(),
        })
        .where(eq(protectionProviderProfile.id, existingProfile.id));
    }
    return;
  }

  throw new ORPCError("FORBIDDEN", {
    message:
      "A confirmed marketplace fraud enforcement blocks a new Provider application until Admin review.",
  });
};

const assertNoDuplicateProviderIdentity = async (
  database: Database,
  application: Pick<
    ProviderApplication,
    "id" | "identityEvidenceReference" | "providerUserId"
  >
): Promise<void> => {
  if (!application.identityEvidenceReference) {
    return;
  }

  const [duplicateIdentity] = await database
    .select({
      id: protectionProviderApplication.id,
      providerUserId: protectionProviderApplication.providerUserId,
    })
    .from(protectionProviderApplication)
    .where(
      and(
        eq(
          protectionProviderApplication.identityEvidenceReference,
          application.identityEvidenceReference
        ),
        inArray(protectionProviderApplication.status, [
          "APPROVED",
          "PENDING_REVIEW",
        ]),
        ne(
          protectionProviderApplication.providerUserId,
          application.providerUserId
        )
      )
    )
    .limit(1);

  if (
    duplicateIdentity &&
    duplicateIdentity.id !== application.id &&
    duplicateIdentity.providerUserId &&
    duplicateIdentity.providerUserId !== application.providerUserId
  ) {
    throw new ORPCError("CONFLICT", {
      message:
        "This verified identity is already linked to another Provider standing.",
    });
  }
};

export const toProviderApplicationView = (
  application: ProviderApplication
) => ({
  ageEvidenceReference: application.ageEvidenceReference,
  createdAt: application.createdAt.toISOString(),
  fullName: application.fullName,
  id: application.id,
  identityEvidenceReference: application.identityEvidenceReference,
  officialChannelEvidenceReference:
    application.officialChannelEvidenceReference,
  officialChannels: application.officialChannels,
  operatingHistoryEvidenceReference:
    application.operatingHistoryEvidenceReference,
  operatingSince: application.operatingSince,
  paymentAccount: application.paymentAccount,
  paymentDisclosureConsent: application.paymentDisclosureConsent,
  paymentEvidenceReference: application.paymentEvidenceReference,
  policyAcceptedAt: toIso(application.policyAcceptedAt),
  policyVersion: application.policyVersion,
  policyVersionId: application.policyVersionId,
  providerUserId: application.providerUserId,
  reviewReason: application.reviewReason,
  reviewedAt: toIso(application.reviewedAt),
  revisionCount: application.revisionCount,
  services: application.services,
  status: application.status,
  submittedAt: toIso(application.submittedAt),
  updatedAt: application.updatedAt.toISOString(),
});

const toProviderProfileHistoryView = (version: ProviderProfileVersion) => ({
  publishedAt: version.publishedAt.toISOString(),
  recommendedTransactionLimit: version.recommendedTransactionLimit,
  status: version.status,
  statusReason: version.statusReason,
  versionNumber: version.versionNumber,
});

export const toProviderProfileView = (
  profile: ProviderProfile,
  version?: ProviderProfileVersion | null,
  history: ProviderProfileVersion[] = [],
  relatedWarnings: ProviderRelatedWarning[] = []
) => {
  const currentVersion = version ?? {
    displayName: profile.displayName,
    id: profile.id,
    officialChannels: profile.officialChannels,
    publishedAt: profile.publishedAt,
    recommendedTransactionLimit: 0,
    services: profile.services,
    status: profile.status,
    statusReason: null,
    verifiedAt: profile.verifiedAt,
    versionNumber: 1,
  };

  return {
    displayName: currentVersion.displayName,
    history: history.map(toProviderProfileHistoryView),
    id: profile.id,
    officialChannels: toPublicProviderOfficialChannels(
      currentVersion.officialChannels
    ),
    profileSlug: profile.profileSlug,
    publicUrl: providerProfilePath(profile.profileSlug),
    publishedAt: currentVersion.publishedAt.toISOString(),
    recommendedTransactionLimit: currentVersion.recommendedTransactionLimit,
    relatedWarnings,
    services: currentVersion.services,
    status:
      profile.status === "ACTIVE" ? currentVersion.status : profile.status,
    statusReason: profile.statusReason ?? currentVersion.statusReason,
    verifiedAt: currentVersion.verifiedAt.toISOString(),
    versionId: currentVersion.id,
    versionNumber: currentVersion.versionNumber,
  };
};

export interface ProviderRelatedWarning {
  publicPath: string;
  publicSlug: string;
  publishedAt: string | null;
  status: (typeof publicRiskReportStatuses)[number];
  type: string;
}

export const toProviderProfileRevisionView = (
  revision: ProviderProfileRevision
) => ({
  ageEvidenceReference: revision.ageEvidenceReference,
  baseVersionId: revision.baseVersionId,
  createdAt: revision.createdAt.toISOString(),
  fullName: revision.fullName,
  id: revision.id,
  identityEvidenceReference: revision.identityEvidenceReference,
  officialChannelEvidenceReference: revision.officialChannelEvidenceReference,
  officialChannels: revision.officialChannels,
  operatingHistoryEvidenceReference: revision.operatingHistoryEvidenceReference,
  operatingSince: revision.operatingSince,
  paymentAccount: revision.paymentAccount,
  paymentDisclosureConsent: revision.paymentDisclosureConsent,
  paymentEvidenceReference: revision.paymentEvidenceReference,
  policyAcceptedAt: toIso(revision.policyAcceptedAt),
  policyVersion: revision.policyVersion,
  policyVersionId: revision.policyVersionId,
  profileId: revision.profileId,
  providerUserId: revision.providerUserId,
  reviewReason: revision.reviewReason,
  reviewedAt: toIso(revision.reviewedAt),
  reviewedByUserId: revision.reviewedByUserId,
  revisionNumber: revision.revisionNumber,
  services: revision.services,
  status: revision.status,
  submittedAt: toIso(revision.submittedAt),
  updatedAt: revision.updatedAt.toISOString(),
});

const toAdminApplicationView = (
  application: ProviderApplication,
  applicant: { email: string; name: string }
) => ({
  applicantEmail: applicant.email,
  applicantName: applicant.name,
  id: application.id,
  reviewReason: application.reviewReason,
  revisionCount: application.revisionCount,
  services: application.services,
  status: application.status,
  submittedAt: toIso(application.submittedAt),
});

const findProviderApplication = async (
  database: Database,
  providerUserId: string
): Promise<ProviderApplication | null> => {
  const [application] = await database
    .select()
    .from(protectionProviderApplication)
    .where(eq(protectionProviderApplication.providerUserId, providerUserId))
    .limit(1);
  return application ?? null;
};

const findProviderProfile = async (
  database: Database,
  providerUserId: string
): Promise<ProviderProfile | null> => {
  const [profile] = await database
    .select()
    .from(protectionProviderProfile)
    .where(eq(protectionProviderProfile.providerUserId, providerUserId))
    .limit(1);
  return profile ?? null;
};

export const relinkProviderOwnership = async ({
  database,
  input,
  transferredByUserId,
}: {
  database: Database;
  input: {
    identityEvidenceReference: string;
    profileId: string;
    reason: string;
    targetUserId: string;
  };
  transferredByUserId: string;
}) => {
  const parsedInput = providerOwnershipRelinkInputSchema.parse(input);
  const [profile] = await database
    .select()
    .from(protectionProviderProfile)
    .where(eq(protectionProviderProfile.id, parsedInput.profileId))
    .limit(1);
  if (!profile) {
    throw new ORPCError("NOT_FOUND", {
      message: "Provider profile not found",
    });
  }

  const [application] = await database
    .select()
    .from(protectionProviderApplication)
    .where(eq(protectionProviderApplication.id, profile.applicationId))
    .limit(1);
  if (
    !application?.identityEvidenceReference ||
    application.identityEvidenceReference !==
      parsedInput.identityEvidenceReference
  ) {
    throw new ORPCError("FORBIDDEN", {
      message:
        "Ownership can only be relinked with the verified identity evidence already approved for this Provider.",
    });
  }
  if (profile.providerUserId === parsedInput.targetUserId) {
    throw new ORPCError("CONFLICT", {
      message: "The target account already owns this Provider profile.",
    });
  }

  const [targetUser] = await database
    .select({ banned: user.banned, id: user.id, role: user.role })
    .from(user)
    .where(eq(user.id, parsedInput.targetUserId))
    .limit(1);
  if (
    !targetUser ||
    (targetUser.role !== "BUYER" && targetUser.role !== "SELLER")
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Provider ownership can only move to a Buyer or Seller account.",
    });
  }
  if (targetUser.banned) {
    throw new ORPCError("FORBIDDEN", {
      message: "The target account is locked.",
    });
  }

  const [targetProfile] = await database
    .select({ id: protectionProviderProfile.id })
    .from(protectionProviderProfile)
    .where(eq(protectionProviderProfile.providerUserId, targetUser.id))
    .limit(1);
  if (targetProfile) {
    throw new ORPCError("CONFLICT", {
      message: "The target account already owns a Provider standing.",
    });
  }

  const now = new Date();
  await database.transaction(async (transaction) => {
    await transaction
      .update(protectionProviderApplication)
      .set({ providerUserId: targetUser.id, updatedAt: now })
      .where(eq(protectionProviderApplication.id, application.id));
    await transaction
      .update(protectionProviderProfile)
      .set({ providerUserId: targetUser.id, updatedAt: now })
      .where(eq(protectionProviderProfile.id, profile.id));
    await transaction
      .update(protectionProviderProfileRevision)
      .set({ providerUserId: targetUser.id, updatedAt: now })
      .where(eq(protectionProviderProfileRevision.profileId, profile.id));
    await transaction
      .update(protectionProviderRiskIncident)
      .set({ providerUserId: targetUser.id, updatedAt: now })
      .where(eq(protectionProviderRiskIncident.providerProfileId, profile.id));
    await transaction
      .update(protectionProviderBondAccount)
      .set({ providerUserId: targetUser.id, updatedAt: now })
      .where(eq(protectionProviderBondAccount.providerProfileId, profile.id));
    await transaction
      .update(protectionProviderBondAdjustment)
      .set({ providerUserId: targetUser.id, updatedAt: now })
      .where(eq(protectionProviderBondAdjustment.profileId, profile.id));
    await transaction
      .update(protectionProviderBondWithdrawal)
      .set({ providerUserId: targetUser.id })
      .where(eq(protectionProviderBondWithdrawal.profileId, profile.id));
    await transaction.insert(protectionProviderOwnershipChange).values({
      createdAt: now,
      fromUserId: profile.providerUserId,
      identityEvidenceReference: parsedInput.identityEvidenceReference,
      profileId: profile.id,
      reason: parsedInput.reason,
      toUserId: targetUser.id,
      transferredByUserId,
    });
  });

  return {
    fromUserId: profile.providerUserId,
    profileId: profile.id,
    toUserId: targetUser.id,
    transferredAt: now.toISOString(),
  };
};

const findLatestProviderProfileVersion = async (
  database: Database,
  profileId: string
): Promise<ProviderProfileVersion | null> => {
  const [version] = await database
    .select()
    .from(protectionProviderProfileVersion)
    .where(eq(protectionProviderProfileVersion.profileId, profileId))
    .orderBy(desc(protectionProviderProfileVersion.versionNumber))
    .limit(1);
  return version ?? null;
};

const findCurrentPolicyVersion = async (
  database: Database,
  now: Date
): Promise<{ id: string; version: string } | null> => {
  const [policy] = await database
    .select({
      id: protectionPolicyVersion.id,
      version: protectionPolicyVersion.version,
    })
    .from(protectionPolicyVersion)
    .where(lte(protectionPolicyVersion.effectiveAt, now))
    .orderBy(
      desc(protectionPolicyVersion.effectiveAt),
      desc(protectionPolicyVersion.createdAt)
    )
    .limit(1);
  return policy ?? null;
};

const findPolicyVersionId = async (
  database: Database,
  version: unknown
): Promise<string | null> => {
  if (typeof version !== "string" || version.trim().length === 0) {
    return null;
  }
  const [policy] = await database
    .select({ id: protectionPolicyVersion.id })
    .from(protectionPolicyVersion)
    .where(eq(protectionPolicyVersion.version, version))
    .limit(1);
  return policy?.id ?? null;
};

const getPolicyVersionForValidation = (
  policy: { version: string } | null
): string => policy?.version ?? CURRENT_PROVIDER_POLICY_VERSION;

const findProviderProfileVersionHistory = async (
  database: Database,
  profileId: string
): Promise<ProviderProfileVersion[]> => {
  const versions = await database
    .select()
    .from(protectionProviderProfileVersion)
    .where(eq(protectionProviderProfileVersion.profileId, profileId))
    .orderBy(asc(protectionProviderProfileVersion.versionNumber))
    .execute();
  return versions;
};

const findProviderRelatedWarnings = async (
  database: Database,
  profileId: string
): Promise<ProviderRelatedWarning[]> => {
  const incidents = await database
    .select({ riskReportId: protectionProviderRiskIncident.riskReportId })
    .from(protectionProviderRiskIncident)
    .where(eq(protectionProviderRiskIncident.providerProfileId, profileId))
    .execute();
  const reportIds = incidents.map(({ riskReportId }) => riskReportId);
  if (reportIds.length === 0) {
    return [];
  }

  const reports = await database
    .select({
      publicSlug: protectionRiskReport.publicSlug,
      publishedAt: protectionRiskReport.publishedAt,
      status: protectionRiskReport.status,
      type: protectionRiskReport.type,
    })
    .from(protectionRiskReport)
    .where(
      and(
        inArray(protectionRiskReport.id, reportIds),
        inArray(protectionRiskReport.status, publicRiskReportStatuses)
      )
    )
    .orderBy(desc(protectionRiskReport.publishedAt))
    .execute();

  const seen = new Set<string>();
  return reports.flatMap((report) => {
    const status = publicRiskReportStatuses.find(
      (publicStatus) => publicStatus === report.status
    );
    if (!report.publicSlug || !status || seen.has(report.publicSlug)) {
      return [];
    }
    seen.add(report.publicSlug);
    return [
      {
        publicPath: createRiskReportPublicPath(report.publicSlug),
        publicSlug: report.publicSlug,
        publishedAt: toIso(report.publishedAt),
        status,
        type: report.type,
      },
    ];
  });
};

const findLatestProviderProfileRevision = async (
  database: Database,
  profileId: string
): Promise<ProviderProfileRevision | null> => {
  const [revision] = await database
    .select()
    .from(protectionProviderProfileRevision)
    .where(eq(protectionProviderProfileRevision.profileId, profileId))
    .orderBy(desc(protectionProviderProfileRevision.revisionNumber))
    .limit(1);
  return revision ?? null;
};

const getProviderProfilePublicView = async (
  database: Database,
  profile: ProviderProfile
) => {
  const [version, history, relatedWarnings] = await Promise.all([
    findLatestProviderProfileVersion(database, profile.id),
    findProviderProfileVersionHistory(database, profile.id),
    findProviderRelatedWarnings(database, profile.id),
  ]);
  return toProviderProfileView(profile, version, history, relatedWarnings);
};

const ensureProviderProfileVersion = async (
  database: Database,
  profile: ProviderProfile
): Promise<ProviderProfileVersion> => {
  const existing = await findLatestProviderProfileVersion(database, profile.id);
  if (existing) {
    return existing;
  }

  const [application] = await database
    .select({ policyVersionId: protectionProviderApplication.policyVersionId })
    .from(protectionProviderApplication)
    .where(eq(protectionProviderApplication.id, profile.applicationId))
    .limit(1);

  const [created] = await database
    .insert(protectionProviderProfileVersion)
    .values({
      displayName: profile.displayName,
      officialChannels: profile.officialChannels,
      paymentAccount: null,
      policyVersionId: application?.policyVersionId ?? null,
      profileId: profile.id,
      profileSlug: profile.profileSlug,
      publishedAt: profile.publishedAt,
      recommendedTransactionLimit: 0,
      services: profile.services,
      sourceApplicationId: profile.applicationId,
      status: profile.status,
      verifiedAt: profile.verifiedAt,
      versionNumber: 1,
    })
    .returning();

  if (!created) {
    throw new ORPCError("CONFLICT", {
      message: "Provider profile version could not be created",
    });
  }
  return created;
};

export const getProviderApplicationSnapshot = async (
  database: Database,
  providerUserId: string
) => {
  const [application, profile] = await Promise.all([
    findProviderApplication(database, providerUserId),
    findProviderProfile(database, providerUserId),
  ]);

  const [publicProfile, profileRevision] = profile
    ? await Promise.all([
        getProviderProfilePublicView(database, profile),
        findLatestProviderProfileRevision(database, profile.id),
      ])
    : [null, null];

  return {
    application: application ? toProviderApplicationView(application) : null,
    profileRevision: profileRevision
      ? toProviderProfileRevisionView(profileRevision)
      : null,
    publicProfile,
  };
};

const throwApplicationMutationError = (error: unknown): never => {
  if (error instanceof ORPCError) {
    throw error;
  }

  throw new ORPCError("BAD_REQUEST", {
    message:
      error instanceof Error
        ? error.message
        : "Provider application data is invalid",
  });
};

export const saveProviderApplicationDraft = async (
  database: Database,
  providerUserId: string,
  input: Record<string, unknown>
) => {
  const existing = await findProviderApplication(database, providerUserId);
  await assertProviderApplicationEligibility(database, providerUserId);
  if (existing?.status === "PENDING_REVIEW") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Provider application is already pending review",
    });
  }
  if (existing?.status === "APPROVED") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Approved Provider data can only change through a revision",
    });
  }
  if (existing?.status === "REJECTED") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Rejected Provider applications cannot be edited",
    });
  }

  const now = new Date();
  const { policyAccepted, ...draftFields } = input;
  let policyAcceptedAt = existing?.policyAcceptedAt;
  if (policyAccepted === true) {
    policyAcceptedAt = now;
  } else if (policyAccepted === false) {
    policyAcceptedAt = null;
  }
  const policyVersionId =
    "policyVersion" in draftFields
      ? await findPolicyVersionId(database, draftFields.policyVersion)
      : (existing?.policyVersionId ?? null);

  if (existing) {
    const [updated] = await database
      .update(protectionProviderApplication)
      .set({
        ...draftFields,
        policyAcceptedAt,
        policyVersionId,
        updatedAt: now,
      })
      .where(eq(protectionProviderApplication.id, existing.id))
      .returning();

    if (!updated) {
      throw new ORPCError("CONFLICT", {
        message: "Provider draft changed concurrently",
      });
    }
  } else {
    const [created] = await database
      .insert(protectionProviderApplication)
      .values({
        ...draftFields,
        policyAcceptedAt,
        policyVersionId,
        providerUserId,
        status: "DRAFT",
      })
      .returning();

    if (!created) {
      throw new ORPCError("CONFLICT", {
        message: "Provider draft could not be created",
      });
    }
  }

  return getProviderApplicationSnapshot(database, providerUserId);
};

export const submitProviderApplication = async (
  database: Database,
  providerUserId: string,
  input: unknown
) => {
  const now = new Date();
  const currentPolicy = await findCurrentPolicyVersion(database, now);
  let submission;
  try {
    submission = validateProviderApplicationSubmission(
      input,
      now,
      currentPolicy?.version ?? CURRENT_PROVIDER_POLICY_VERSION
    );
  } catch (error) {
    return throwApplicationMutationError(error);
  }

  const existing = await findProviderApplication(database, providerUserId);
  await assertProviderApplicationEligibility(database, providerUserId);
  if (existing?.status === "PENDING_REVIEW") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Provider application is already pending review",
    });
  }
  if (existing?.status === "APPROVED") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Approved Provider data requires a revision workflow",
    });
  }
  if (existing?.status === "REJECTED") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Rejected Provider applications cannot be resubmitted",
    });
  }

  const { policyAccepted: _policyAccepted, ...submissionFields } = submission;
  const policyVersionId = currentPolicy?.id ?? null;
  const result = await database.transaction(async (transaction) => {
    let application: ProviderApplication | undefined;
    const nextRevisionCount =
      existing?.status === "CHANGES_REQUESTED"
        ? existing.revisionCount + 1
        : (existing?.revisionCount ?? 0);

    if (existing) {
      assertProviderApplicationTransition(existing.status, "PENDING_REVIEW");
      const [updated] = await transaction
        .update(protectionProviderApplication)
        .set({
          ...submissionFields,
          policyAcceptedAt: now,
          policyVersionId,
          reviewReason: null,
          revisionCount: nextRevisionCount,
          status: "PENDING_REVIEW",
          submittedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(protectionProviderApplication.id, existing.id),
            eq(protectionProviderApplication.status, existing.status)
          )
        )
        .returning();
      application = updated;
    } else {
      const [created] = await transaction
        .insert(protectionProviderApplication)
        .values({
          ...submissionFields,
          policyAcceptedAt: now,
          policyVersionId,
          providerUserId,
          revisionCount: 0,
          status: "PENDING_REVIEW",
          submittedAt: now,
        })
        .returning();
      application = created;
    }

    if (!application) {
      throw new ORPCError("CONFLICT", {
        message: "Provider application changed concurrently",
      });
    }

    await createNotificationEvent(transaction, {
      body: "Hồ sơ Đối tác Avin của bạn đã được gửi để xem xét.",
      context: {
        applicationId: application.id,
        revisionCount: application.revisionCount,
      },
      email: {
        htmlBody: "<p>Hồ sơ Đối tác Avin của bạn đã được gửi để xem xét.</p>",
        recipientUserIds: [providerUserId],
        subject: "Avin Check: hồ sơ Provider đã được gửi",
        textBody: "Hồ sơ Đối tác Avin của bạn đã được gửi để xem xét.",
      },
      eventType: "protection_provider_application.submitted",
      recipients: [
        { targetPath: "/avin-check/workspace", userId: providerUserId },
        ...(await listNotificationRecipientsByRole(transaction, {
          role: "ADMIN",
          targetPath: "/avin-check/providers",
        })),
      ],
      sourceId: `${application.id}:${application.revisionCount}:submitted`,
      sourceType: "PROTECTION_PROVIDER_APPLICATION",
      title: "Hồ sơ Provider mới",
    });

    return application;
  });

  return getProviderApplicationSnapshot(database, result.providerUserId);
};

export const listProviderApplications = async (
  database: Database,
  input?: { search?: string; status?: ProviderApplicationStatus }
) => {
  const rows = await database
    .select({
      applicant: user,
      application: protectionProviderApplication,
    })
    .from(protectionProviderApplication)
    .innerJoin(user, eq(protectionProviderApplication.providerUserId, user.id))
    .orderBy(desc(protectionProviderApplication.createdAt));
  const normalizedSearch = input?.search?.trim().toLowerCase();

  return rows.flatMap(({ applicant, application }) => {
    if (input?.status && application.status !== input.status) {
      return [];
    }
    if (
      normalizedSearch &&
      ![
        applicant.name,
        applicant.email,
        application.fullName,
        application.services,
      ]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalizedSearch))
    ) {
      return [];
    }
    return [toAdminApplicationView(application, applicant)];
  });
};

export const getProviderApplicationForAdmin = async (
  database: Database,
  applicationId: string
) => {
  const [row] = await database
    .select({
      applicant: user,
      application: protectionProviderApplication,
      profile: protectionProviderProfile,
    })
    .from(protectionProviderApplication)
    .innerJoin(user, eq(protectionProviderApplication.providerUserId, user.id))
    .leftJoin(
      protectionProviderProfile,
      eq(
        protectionProviderProfile.applicationId,
        protectionProviderApplication.id
      )
    )
    .where(eq(protectionProviderApplication.id, applicationId))
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND", {
      message: "Provider application does not exist",
    });
  }

  return {
    applicant: {
      email: row.applicant.email,
      id: row.applicant.id,
      name: row.applicant.name,
    },
    application: toProviderApplicationView(row.application),
    publicProfile: row.profile
      ? await getProviderProfilePublicView(database, row.profile)
      : null,
  };
};

export const startProviderProfileRevision = async (
  database: Database,
  providerUserId: string
) => {
  const profile = await findProviderProfile(database, providerUserId);
  if (!profile) {
    throw new ORPCError("NOT_FOUND", {
      message: "Provider profile does not exist",
    });
  }

  const latestRevision = await findLatestProviderProfileRevision(
    database,
    profile.id
  );
  if (latestRevision?.status === "PENDING_REVIEW") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Provider profile revision is already pending review",
    });
  }
  if (
    latestRevision &&
    ["DRAFT", "CHANGES_REQUESTED"].includes(latestRevision.status)
  ) {
    return toProviderProfileRevisionView(latestRevision);
  }

  const baseVersion = await ensureProviderProfileVersion(database, profile);
  const currentPolicy = await findCurrentPolicyVersion(database, new Date());
  const [created] = await database
    .insert(protectionProviderProfileRevision)
    .values({
      baseVersionId: baseVersion.id,
      fullName: baseVersion.displayName,
      officialChannels: baseVersion.officialChannels,
      operatingSince: null,
      policyVersion: currentPolicy?.version ?? CURRENT_PROVIDER_POLICY_VERSION,
      policyVersionId: currentPolicy?.id ?? baseVersion.policyVersionId ?? null,
      profileId: profile.id,
      providerUserId,
      revisionNumber: (latestRevision?.revisionNumber ?? 0) + 1,
      services: baseVersion.services,
      status: "DRAFT",
    })
    .returning();

  if (!created) {
    throw new ORPCError("CONFLICT", {
      message: "Provider profile revision could not be created",
    });
  }
  return toProviderProfileRevisionView(created);
};

export const saveProviderProfileRevisionDraft = async (
  database: Database,
  providerUserId: string,
  input: Record<string, unknown>
) => {
  const profile = await findProviderProfile(database, providerUserId);
  if (!profile) {
    throw new ORPCError("NOT_FOUND", {
      message: "Provider profile does not exist",
    });
  }

  let revision = await findLatestProviderProfileRevision(database, profile.id);
  if (!revision || ["APPROVED", "REJECTED"].includes(revision.status)) {
    await startProviderProfileRevision(database, providerUserId);
    revision = await findLatestProviderProfileRevision(database, profile.id);
  }
  if (!revision) {
    throw new ORPCError("CONFLICT", {
      message: "Provider profile revision could not be loaded",
    });
  }
  if (revision.status === "PENDING_REVIEW") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Provider profile revision is already pending review",
    });
  }

  const now = new Date();
  const { policyAccepted, ...draftFields } = input;
  const { policyAcceptedAt: existingPolicyAcceptedAt } = revision;
  let policyAcceptedAt = existingPolicyAcceptedAt;
  if (policyAccepted === true) {
    policyAcceptedAt = now;
  } else if (policyAccepted === false) {
    policyAcceptedAt = null;
  }
  const policyVersionId =
    "policyVersion" in draftFields
      ? await findPolicyVersionId(database, draftFields.policyVersion)
      : (revision.policyVersionId ?? null);

  const [updated] = await database
    .update(protectionProviderProfileRevision)
    .set({
      ...draftFields,
      policyAcceptedAt,
      policyVersionId,
      updatedAt: now,
    })
    .where(
      and(
        eq(protectionProviderProfileRevision.id, revision.id),
        eq(protectionProviderProfileRevision.providerUserId, providerUserId),
        eq(protectionProviderProfileRevision.status, revision.status)
      )
    )
    .returning();

  if (!updated) {
    throw new ORPCError("CONFLICT", {
      message: "Provider profile revision changed concurrently",
    });
  }
  return getProviderApplicationSnapshot(database, providerUserId);
};

export const submitProviderProfileRevision = async (
  database: Database,
  providerUserId: string,
  input: unknown
) => {
  const now = new Date();
  const currentPolicy = await findCurrentPolicyVersion(database, now);
  let submission;
  try {
    submission = validateProviderApplicationSubmission(
      input,
      now,
      currentPolicy?.version ?? CURRENT_PROVIDER_POLICY_VERSION
    );
  } catch (error) {
    return throwApplicationMutationError(error);
  }

  const profile = await findProviderProfile(database, providerUserId);
  if (!profile) {
    throw new ORPCError("NOT_FOUND", {
      message: "Provider profile does not exist",
    });
  }
  const existing = await findLatestProviderProfileRevision(
    database,
    profile.id
  );
  if (!existing) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Start a Provider profile revision before submitting it",
    });
  }
  if (existing.status === "PENDING_REVIEW") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Provider profile revision is already pending review",
    });
  }
  if (["APPROVED", "REJECTED"].includes(existing.status)) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Start a new Provider profile revision before submitting it",
    });
  }

  const { policyAccepted: _policyAccepted, ...submissionFields } = submission;
  const policyVersionId = currentPolicy?.id ?? null;
  const result = await database.transaction(async (transaction) => {
    const currentVersion = await findLatestProviderProfileVersion(
      transaction,
      profile.id
    );
    if (!currentVersion || currentVersion.id !== existing.baseVersionId) {
      throw new ORPCError("CONFLICT", {
        message: "Provider profile changed; start a new revision",
      });
    }

    assertProviderApplicationTransition(existing.status, "PENDING_REVIEW");
    const [updated] = await transaction
      .update(protectionProviderProfileRevision)
      .set({
        ...submissionFields,
        policyAcceptedAt: now,
        policyVersionId,
        reviewReason: null,
        status: "PENDING_REVIEW",
        submittedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(protectionProviderProfileRevision.id, existing.id),
          eq(protectionProviderProfileRevision.providerUserId, providerUserId),
          eq(protectionProviderProfileRevision.status, existing.status)
        )
      )
      .returning();

    if (!updated) {
      throw new ORPCError("CONFLICT", {
        message: "Provider profile revision changed concurrently",
      });
    }

    await createNotificationEvent(transaction, {
      body: "Yêu cầu cập nhật profile Provider của bạn đã được gửi để xem xét.",
      context: {
        profileId: profile.id,
        revisionId: updated.id,
        revisionNumber: updated.revisionNumber,
      },
      email: {
        htmlBody:
          "<p>Yêu cầu cập nhật profile Provider của bạn đã được gửi để xem xét.</p>",
        recipientUserIds: [providerUserId],
        subject: "Avin Check: yêu cầu cập nhật profile đã được gửi",
        textBody:
          "Yêu cầu cập nhật profile Provider của bạn đã được gửi để xem xét.",
      },
      eventType: "protection_provider_profile_revision.submitted",
      recipients: [
        { targetPath: "/avin-check/workspace", userId: providerUserId },
        ...(await listNotificationRecipientsByRole(transaction, {
          role: "ADMIN",
          targetPath: "/avin-check/provider-revisions",
        })),
      ],
      sourceId: `${updated.id}:${updated.revisionNumber}:submitted`,
      sourceType: "PROTECTION_PROVIDER_PROFILE_REVISION",
      title: "Yêu cầu cập nhật profile Provider mới",
    });
    const snapshot = await getProviderApplicationSnapshot(
      transaction,
      providerUserId
    );
    return { revision: updated, snapshot };
  });
  return {
    ...result.snapshot,
    profileRevision: toProviderProfileRevisionView(result.revision),
  };
};

const toAdminProfileRevisionView = (
  revision: ProviderProfileRevision,
  applicant: { email: string; id: string; name: string }
) => ({
  applicantEmail: applicant.email,
  applicantId: applicant.id,
  applicantName: applicant.name,
  fullName: revision.fullName,
  id: revision.id,
  profileId: revision.profileId,
  reviewReason: revision.reviewReason,
  revisionNumber: revision.revisionNumber,
  services: revision.services,
  status: revision.status,
  submittedAt: toIso(revision.submittedAt),
});

export const listProviderProfileRevisions = async (
  database: Database,
  input?: { search?: string; status?: ProviderApplicationStatus }
) => {
  const rows = await database
    .select({
      applicant: user,
      revision: protectionProviderProfileRevision,
    })
    .from(protectionProviderProfileRevision)
    .innerJoin(
      user,
      eq(protectionProviderProfileRevision.providerUserId, user.id)
    )
    .orderBy(desc(protectionProviderProfileRevision.createdAt));
  const normalizedSearch = input?.search?.trim().toLowerCase();

  return rows.flatMap(({ applicant, revision }) => {
    if (input?.status && revision.status !== input.status) {
      return [];
    }
    if (
      normalizedSearch &&
      ![applicant.name, applicant.email, revision.fullName, revision.services]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalizedSearch))
    ) {
      return [];
    }
    return [toAdminProfileRevisionView(revision, applicant)];
  });
};

export const getProviderProfileRevisionForAdmin = async (
  database: Database,
  revisionId: string
) => {
  const [row] = await database
    .select({
      applicant: user,
      profile: protectionProviderProfile,
      revision: protectionProviderProfileRevision,
    })
    .from(protectionProviderProfileRevision)
    .innerJoin(
      user,
      eq(protectionProviderProfileRevision.providerUserId, user.id)
    )
    .innerJoin(
      protectionProviderProfile,
      eq(
        protectionProviderProfileRevision.profileId,
        protectionProviderProfile.id
      )
    )
    .where(eq(protectionProviderProfileRevision.id, revisionId))
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND", {
      message: "Provider profile revision does not exist",
    });
  }

  return {
    applicant: {
      email: row.applicant.email,
      id: row.applicant.id,
      name: row.applicant.name,
    },
    profileId: row.profile.id,
    profileRevision: toProviderProfileRevisionView(row.revision),
    publicProfile: await getProviderProfilePublicView(database, row.profile),
  };
};

const escapeHtml = (value: string): string =>
  value.replaceAll(
    /[&<>'"]/gu,
    (character) =>
      ({
        '"': "&quot;",
        "&": "&amp;",
        "'": "&#39;",
        "<": "&lt;",
        ">": "&gt;",
      })[character] ?? character
  );

const getProfileRevisionDecisionNotification = (
  decision: ProviderApplicationDecision
) => {
  if (decision === "APPROVED") {
    return {
      body: "Yêu cầu cập nhật profile Provider của bạn đã được duyệt và phát hành thành version mới.",
      eventType: "protection_provider_profile_revision.approved" as const,
      subject: "Avin Check: cập nhật profile Provider đã được duyệt",
      title: "Cập nhật profile Provider đã được duyệt",
    };
  }
  if (decision === "CHANGES_REQUESTED") {
    return {
      body: "Yêu cầu cập nhật profile Provider cần được bổ sung hoặc chỉnh sửa theo lý do của Reviewer.",
      eventType:
        "protection_provider_profile_revision.changes_requested" as const,
      subject: "Avin Check: cần chỉnh sửa yêu cầu cập nhật profile",
      title: "Yêu cầu cập nhật profile cần chỉnh sửa",
    };
  }
  return {
    body: "Yêu cầu cập nhật profile Provider đã bị từ chối theo lý do của Reviewer.",
    eventType: "protection_provider_profile_revision.rejected" as const,
    subject: "Avin Check: yêu cầu cập nhật profile bị từ chối",
    title: "Yêu cầu cập nhật profile bị từ chối",
  };
};

export const decideProviderProfileRevision = async ({
  database,
  decision,
  reason,
  reviewerUserId,
  revisionId,
}: {
  database: Database;
  decision: ProviderApplicationDecision;
  reason?: string;
  reviewerUserId: string;
  revisionId: string;
}) => {
  const normalizedReason = reason?.trim();
  if (decision !== "APPROVED" && !normalizedReason) {
    throw new ORPCError("BAD_REQUEST", {
      message: "A reason is required for Provider profile changes or rejection",
    });
  }

  const now = new Date();
  const result = await database.transaction(async (transaction) => {
    const [revision] = await transaction
      .select()
      .from(protectionProviderProfileRevision)
      .where(eq(protectionProviderProfileRevision.id, revisionId))
      .limit(1);
    if (!revision) {
      throw new ORPCError("NOT_FOUND", {
        message: "Provider profile revision does not exist",
      });
    }
    if (revision.status !== "PENDING_REVIEW") {
      throw new ORPCError("BAD_REQUEST", {
        message: "Only pending Provider profile revisions can be decided",
      });
    }

    const [profile] = await transaction
      .select()
      .from(protectionProviderProfile)
      .where(eq(protectionProviderProfile.id, revision.profileId))
      .limit(1);
    if (!profile) {
      throw new ORPCError("NOT_FOUND", {
        message: "Provider profile does not exist",
      });
    }

    const currentVersion = await findLatestProviderProfileVersion(
      transaction,
      profile.id
    );
    if (!currentVersion) {
      throw new ORPCError("CONFLICT", {
        message: "Provider profile has no published version",
      });
    }
    const currentPolicy = await findCurrentPolicyVersion(transaction, now);
    if (decision === "APPROVED") {
      if (currentVersion.id !== revision.baseVersionId) {
        throw new ORPCError("CONFLICT", {
          message: "Provider profile changed; review the latest revision",
        });
      }
      try {
        validateProviderApplicationSubmission(
          {
            ageEvidenceReference: revision.ageEvidenceReference,
            fullName: revision.fullName,
            identityEvidenceReference: revision.identityEvidenceReference,
            officialChannelEvidenceReference:
              revision.officialChannelEvidenceReference,
            officialChannels: revision.officialChannels,
            operatingHistoryEvidenceReference:
              revision.operatingHistoryEvidenceReference,
            operatingSince: revision.operatingSince,
            paymentAccount: revision.paymentAccount,
            paymentDisclosureConsent: revision.paymentDisclosureConsent,
            paymentEvidenceReference: revision.paymentEvidenceReference,
            policyAccepted: Boolean(revision.policyAcceptedAt),
            policyVersion: revision.policyVersion,
            services: revision.services,
          },
          now,
          getPolicyVersionForValidation(currentPolicy)
        );
      } catch (error) {
        return throwApplicationMutationError(error);
      }
      await assertNoDuplicateProviderIdentity(transaction, revision);
    }

    assertProviderApplicationTransition(revision.status, decision);
    const [updated] = await transaction
      .update(protectionProviderProfileRevision)
      .set({
        reviewReason: decision === "APPROVED" ? null : normalizedReason,
        reviewedAt: now,
        reviewedByUserId: reviewerUserId,
        status: decision,
        updatedAt: now,
      })
      .where(
        and(
          eq(protectionProviderProfileRevision.id, revisionId),
          eq(protectionProviderProfileRevision.status, "PENDING_REVIEW")
        )
      )
      .returning();
    if (!updated) {
      throw new ORPCError("CONFLICT", {
        message: "Provider profile revision was decided by another Reviewer",
      });
    }

    let profileVersion: ProviderProfileVersion | null = null;
    if (decision === "APPROVED") {
      if (
        typeof updated.fullName !== "string" ||
        typeof updated.services !== "string"
      ) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Approved Provider profile data is incomplete",
        });
      }
      const [createdVersion] = await transaction
        .insert(protectionProviderProfileVersion)
        .values({
          displayName: updated.fullName,
          officialChannels: updated.officialChannels ?? {},
          paymentAccount: updated.paymentAccount ?? null,
          policyVersionId: updated.policyVersionId,
          profileId: profile.id,
          profileSlug: profile.profileSlug,
          publishedAt: now,
          publishedByUserId: reviewerUserId,
          recommendedTransactionLimit:
            currentVersion.recommendedTransactionLimit,
          services: updated.services,
          sourceApplicationId: profile.applicationId,
          status: profile.status,
          verifiedAt: now,
          versionNumber: currentVersion.versionNumber + 1,
        })
        .returning();
      profileVersion = createdVersion ?? null;
      if (!profileVersion) {
        throw new ORPCError("CONFLICT", {
          message: "Provider profile version could not be published",
        });
      }

      const [updatedProfile] = await transaction
        .update(protectionProviderProfile)
        .set({
          displayName: updated.fullName,
          officialChannels: updated.officialChannels ?? {},
          publishedAt: now,
          services: updated.services,
          updatedAt: now,
          verifiedAt: now,
        })
        .where(eq(protectionProviderProfile.id, profile.id))
        .returning();
      if (!updatedProfile) {
        throw new ORPCError("CONFLICT", {
          message: "Provider profile could not be updated",
        });
      }
    }

    const copy = getProfileRevisionDecisionNotification(decision);
    const decisionReason = normalizedReason ?? "Đã đạt yêu cầu xét duyệt.";
    await createNotificationEvent(transaction, {
      body: copy.body,
      context: {
        decision,
        profileId: profile.id,
        revisionId: updated.id,
        revisionNumber: updated.revisionNumber,
      },
      email: {
        htmlBody: `<p>${copy.body}</p><p>Lý do: ${escapeHtml(decisionReason)}</p>`,
        recipientUserIds: [updated.providerUserId],
        subject: copy.subject,
        textBody: `${copy.body} Lý do: ${decisionReason}`,
      },
      eventType: copy.eventType,
      recipients: [
        {
          targetPath: "/avin-check/workspace",
          userId: updated.providerUserId,
        },
      ],
      sourceId: `${updated.id}:${decision}`,
      sourceType: "PROTECTION_PROVIDER_PROFILE_REVISION",
      title: copy.title,
    });

    return {
      profileId: profile.id,
      profileVersion,
      revision: updated,
    };
  });

  const profile = await findProviderProfile(
    database,
    result.revision.providerUserId
  );
  return {
    profileRevision: toProviderProfileRevisionView(result.revision),
    publicProfile: profile
      ? await getProviderProfilePublicView(database, profile)
      : null,
  };
};

export const publishProviderProfileStatusInTransaction = async ({
  database,
  now,
  profileId,
  reviewerUserId,
  status,
  statusReason,
}: {
  database: Database;
  now: Date;
  profileId: string;
  reviewerUserId: string | null;
  status: ProviderProfile["status"];
  statusReason?: string;
}) => {
  const [profile] = await database
    .select()
    .from(protectionProviderProfile)
    .where(eq(protectionProviderProfile.id, profileId))
    .limit(1);
  if (!profile) {
    throw new ORPCError("NOT_FOUND", {
      message: "Provider profile does not exist",
    });
  }
  const currentVersion = await findLatestProviderProfileVersion(
    database,
    profile.id
  );
  if (!currentVersion) {
    throw new ORPCError("CONFLICT", {
      message: "Provider profile has no published version",
    });
  }

  if (currentVersion.status === status && profile.status === status) {
    return { profile, profileVersion: currentVersion };
  }

  const [createdVersion] = await database
    .insert(protectionProviderProfileVersion)
    .values({
      displayName: currentVersion.displayName,
      officialChannels: currentVersion.officialChannels,
      paymentAccount: currentVersion.paymentAccount,
      policyVersionId: currentVersion.policyVersionId,
      profileId: profile.id,
      profileSlug: profile.profileSlug,
      publishedAt: now,
      publishedByUserId: reviewerUserId,
      recommendedTransactionLimit: currentVersion.recommendedTransactionLimit,
      services: currentVersion.services,
      sourceApplicationId: profile.applicationId,
      status,
      statusReason: statusReason?.trim() || null,
      verifiedAt: currentVersion.verifiedAt,
      versionNumber: currentVersion.versionNumber + 1,
    })
    .returning();
  if (!createdVersion) {
    throw new ORPCError("CONFLICT", {
      message: "Provider profile status version could not be published",
    });
  }
  const [updatedProfile] = await database
    .update(protectionProviderProfile)
    .set({
      status,
      statusReason: statusReason?.trim() || null,
      updatedAt: now,
    })
    .where(eq(protectionProviderProfile.id, profile.id))
    .returning();
  if (!updatedProfile) {
    throw new ORPCError("CONFLICT", {
      message: "Provider profile status could not be updated",
    });
  }

  return { profile: updatedProfile, profileVersion: createdVersion };
};

export const publishProviderProfileStatus = ({
  database,
  profileId,
  reviewerUserId,
  status,
  statusReason,
}: {
  database: Database;
  profileId: string;
  reviewerUserId: string;
  status: ProviderProfile["status"];
  statusReason?: string;
}) => {
  const now = new Date();
  return database.transaction(async (transaction) => {
    const result = await publishProviderProfileStatusInTransaction({
      database: transaction,
      now,
      profileId,
      reviewerUserId,
      status,
      statusReason,
    });
    return getProviderProfilePublicView(transaction, result.profile);
  });
};

const getDecisionNotification = (decision: ProviderApplicationDecision) => {
  if (decision === "APPROVED") {
    return {
      body: "Hồ sơ Đối tác Avin của bạn đã được duyệt và profile tối thiểu đã được phát hành.",
      eventType: "protection_provider_application.approved" as const,
      subject: "Avin Check: hồ sơ Provider đã được duyệt",
      title: "Hồ sơ Provider đã được duyệt",
    };
  }
  if (decision === "CHANGES_REQUESTED") {
    return {
      body: "Hồ sơ Đối tác Avin cần được bổ sung hoặc chỉnh sửa theo lý do của Reviewer.",
      eventType: "protection_provider_application.changes_requested" as const,
      subject: "Avin Check: cần chỉnh sửa hồ sơ Provider",
      title: "Hồ sơ Provider cần chỉnh sửa",
    };
  }
  return {
    body: "Hồ sơ Đối tác Avin của bạn đã bị từ chối theo lý do của Reviewer.",
    eventType: "protection_provider_application.rejected" as const,
    subject: "Avin Check: hồ sơ Provider bị từ chối",
    title: "Hồ sơ Provider bị từ chối",
  };
};

export const decideProviderApplication = ({
  applicationId,
  database,
  decision,
  reason,
  reviewerUserId,
}: {
  applicationId: string;
  database: Database;
  decision: ProviderApplicationDecision;
  reason?: string;
  reviewerUserId: string;
}) => {
  const normalizedReason = reason?.trim();
  if (decision !== "APPROVED" && !normalizedReason) {
    throw new ORPCError("BAD_REQUEST", {
      message: "A reason is required for Provider changes or rejection",
    });
  }

  const now = new Date();
  return database.transaction(async (transaction) => {
    const [application] = await transaction
      .select()
      .from(protectionProviderApplication)
      .where(eq(protectionProviderApplication.id, applicationId))
      .limit(1);

    if (!application) {
      throw new ORPCError("NOT_FOUND", {
        message: "Provider application does not exist",
      });
    }
    if (application.status !== "PENDING_REVIEW") {
      throw new ORPCError("BAD_REQUEST", {
        message: "Only pending Provider applications can be decided",
      });
    }

    if (decision === "APPROVED") {
      try {
        const currentPolicy = await findCurrentPolicyVersion(transaction, now);
        validateProviderApplicationSubmission(
          {
            ageEvidenceReference: application.ageEvidenceReference,
            fullName: application.fullName,
            identityEvidenceReference: application.identityEvidenceReference,
            officialChannelEvidenceReference:
              application.officialChannelEvidenceReference,
            officialChannels: application.officialChannels,
            operatingHistoryEvidenceReference:
              application.operatingHistoryEvidenceReference,
            operatingSince: application.operatingSince,
            paymentAccount: application.paymentAccount,
            paymentDisclosureConsent: application.paymentDisclosureConsent,
            paymentEvidenceReference: application.paymentEvidenceReference,
            policyAccepted: Boolean(application.policyAcceptedAt),
            policyVersion: application.policyVersion,
            services: application.services,
          },
          now,
          getPolicyVersionForValidation(currentPolicy)
        );

        await assertNoDuplicateProviderIdentity(transaction, application);
      } catch (error) {
        return throwApplicationMutationError(error);
      }
    }

    assertProviderApplicationTransition(application.status, decision);
    const [updated] = await transaction
      .update(protectionProviderApplication)
      .set({
        reviewReason: decision === "APPROVED" ? null : normalizedReason,
        reviewedAt: now,
        reviewedByUserId: reviewerUserId,
        status: decision,
        updatedAt: now,
      })
      .where(
        and(
          eq(protectionProviderApplication.id, applicationId),
          eq(protectionProviderApplication.status, "PENDING_REVIEW")
        )
      )
      .returning();

    if (!updated) {
      throw new ORPCError("CONFLICT", {
        message: "Provider application was decided by another Reviewer",
      });
    }

    let profile: ProviderProfile | null = null;
    let profileVersion: ProviderProfileVersion | null = null;
    if (decision === "APPROVED") {
      if (
        typeof updated.fullName !== "string" ||
        typeof updated.services !== "string"
      ) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Approved Provider data is incomplete",
        });
      }
      const displayName = updated.fullName;
      const { services } = updated;
      const [createdProfile] = await transaction
        .insert(protectionProviderProfile)
        .values({
          applicationId: updated.id,
          displayName,
          officialChannels: updated.officialChannels ?? {},
          profileSlug: createProviderProfileSlug(
            displayName,
            updated.providerUserId
          ),
          providerUserId: updated.providerUserId,
          services,
          status: "ACTIVE",
          verifiedAt: now,
        })
        .returning();
      profile = createdProfile ?? null;

      if (!profile) {
        throw new ORPCError("CONFLICT", {
          message: "Provider profile could not be published",
        });
      }
      const [createdVersion] = await transaction
        .insert(protectionProviderProfileVersion)
        .values({
          displayName,
          officialChannels: updated.officialChannels ?? {},
          paymentAccount: updated.paymentAccount ?? null,
          policyVersionId: updated.policyVersionId,
          profileId: profile.id,
          profileSlug: profile.profileSlug,
          publishedAt: now,
          publishedByUserId: reviewerUserId,
          recommendedTransactionLimit: 0,
          services,
          sourceApplicationId: updated.id,
          status: "ACTIVE",
          verifiedAt: now,
          versionNumber: 1,
        })
        .returning();
      profileVersion = createdVersion ?? null;
      if (!profileVersion) {
        throw new ORPCError("CONFLICT", {
          message: "Provider profile version could not be published",
        });
      }
    }

    const copy = getDecisionNotification(decision);
    const decisionReason = normalizedReason ?? "Đã đạt yêu cầu xét duyệt.";
    await createNotificationEvent(transaction, {
      body: copy.body,
      context: {
        applicationId: updated.id,
        decision,
      },
      email: {
        htmlBody: `<p>${copy.body}</p><p>Lý do: ${escapeHtml(decisionReason)}</p>`,
        recipientUserIds: [updated.providerUserId],
        subject: copy.subject,
        textBody: `${copy.body} Lý do: ${decisionReason}`,
      },
      eventType: copy.eventType,
      recipients: [
        {
          targetPath: "/avin-check/workspace",
          userId: updated.providerUserId,
        },
      ],
      sourceId: `${updated.id}:${decision}`,
      sourceType: "PROTECTION_PROVIDER_APPLICATION",
      title: copy.title,
    });

    return {
      application: toProviderApplicationView(updated),
      publicProfile:
        profile && profileVersion
          ? toProviderProfileView(profile, profileVersion, [profileVersion])
          : null,
    };
  });
};

export const getPublicProviderProfile = async (
  database: Database,
  profileSlug: string
) => {
  const [profile] = await database
    .select()
    .from(protectionProviderProfile)
    .where(eq(protectionProviderProfile.profileSlug, profileSlug))
    .limit(1);
  if (!profile) {
    throw new ORPCError("NOT_FOUND", {
      message: "Provider profile does not exist",
    });
  }
  return getProviderProfilePublicView(database, profile);
};
