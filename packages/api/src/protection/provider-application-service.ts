import { user } from "@avin/db/schema/auth";
import {
  protectionProviderApplication,
  protectionProviderProfile,
} from "@avin/db/schema/protection";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";

import {
  createNotificationEvent,
  listNotificationRecipientsByRole,
} from "../notifications/notification";
import type { Context } from "../runtime/context";
import {
  assertProviderApplicationTransition,
  createProviderProfileSlug,
  validateProviderApplicationSubmission,
} from "./provider-application";
import type {
  ProviderApplicationDecision,
  ProviderApplicationStatus,
} from "./provider-application";

type Database = Context["db"];
type ProviderApplication = typeof protectionProviderApplication.$inferSelect;
type ProviderProfile = typeof protectionProviderProfile.$inferSelect;

const providerProfilePath = (profileSlug: string): string =>
  `/avin-check/provider/${profileSlug}`;

const toIso = (value: Date | null): string | null =>
  value?.toISOString() ?? null;

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
  providerUserId: application.providerUserId,
  reviewReason: application.reviewReason,
  reviewedAt: toIso(application.reviewedAt),
  revisionCount: application.revisionCount,
  services: application.services,
  status: application.status,
  submittedAt: toIso(application.submittedAt),
  updatedAt: application.updatedAt.toISOString(),
});

export const toProviderProfileView = (profile: ProviderProfile) => ({
  displayName: profile.displayName,
  id: profile.id,
  officialChannels: profile.officialChannels,
  profileSlug: profile.profileSlug,
  publicUrl: providerProfilePath(profile.profileSlug),
  publishedAt: profile.publishedAt.toISOString(),
  services: profile.services,
  status: profile.status,
  verifiedAt: profile.verifiedAt.toISOString(),
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

export const getProviderApplicationSnapshot = async (
  database: Database,
  providerUserId: string
) => {
  const [application, profile] = await Promise.all([
    findProviderApplication(database, providerUserId),
    findProviderProfile(database, providerUserId),
  ]);

  return {
    application: application ? toProviderApplicationView(application) : null,
    publicProfile: profile ? toProviderProfileView(profile) : null,
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

  if (existing) {
    const [updated] = await database
      .update(protectionProviderApplication)
      .set({
        ...draftFields,
        policyAcceptedAt,
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
  let submission;
  try {
    submission = validateProviderApplicationSubmission(input);
  } catch (error) {
    return throwApplicationMutationError(error);
  }

  const existing = await findProviderApplication(database, providerUserId);
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

  const now = new Date();
  const { policyAccepted: _policyAccepted, ...submissionFields } = submission;
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
        { targetPath: "/provider", userId: providerUserId },
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
    publicProfile: row.profile ? toProviderProfileView(row.profile) : null,
  };
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
          now
        );
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
      recipients: [{ targetPath: "/provider", userId: updated.providerUserId }],
      sourceId: `${updated.id}:${decision}`,
      sourceType: "PROTECTION_PROVIDER_APPLICATION",
      title: copy.title,
    });

    return {
      application: toProviderApplicationView(updated),
      publicProfile: profile ? toProviderProfileView(profile) : null,
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
  return toProviderProfileView(profile);
};
