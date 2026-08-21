import {
  protectionPolicyVersion,
  protectionProviderApplication,
  protectionProviderPolicyAcceptance,
  protectionProviderProfile,
  protectionProviderProfileRevision,
} from "@avin/db/schema/protection";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, lte } from "drizzle-orm";

import { createNotificationEvent } from "../notifications/notification";
import type { Context } from "../runtime/context";
import {
  isPolicyAcceptanceOverdue,
  protectionPolicyVersionIdInputSchema,
  protectionPolicyVersionListInputSchema,
  protectionPolicyVersionPublishInputSchema,
} from "./policy";
import type { ProtectionPolicyVersionPublishInput } from "./policy";
import { publishProviderProfileStatusInTransaction } from "./provider-application-service";

type Database = Context["db"];
type PolicyVersion = typeof protectionPolicyVersion.$inferSelect;
type PolicyAcceptance = typeof protectionProviderPolicyAcceptance.$inferSelect;
type ProviderApplication = typeof protectionProviderApplication.$inferSelect;

const POLICY_SOURCE_TYPE = "PROTECTION_PROVIDER_POLICY";

const toIso = (value: Date | null): string | null =>
  value?.toISOString() ?? null;

const findCurrentProtectionPolicyVersion = async (
  database: Database,
  now: Date
): Promise<PolicyVersion | null> => {
  const [policy] = await database
    .select()
    .from(protectionPolicyVersion)
    .where(lte(protectionPolicyVersion.effectiveAt, now))
    .orderBy(
      desc(protectionPolicyVersion.effectiveAt),
      desc(protectionPolicyVersion.createdAt)
    )
    .limit(1);
  return policy ?? null;
};

const findPolicyVersion = async (
  database: Database,
  policyVersionId: string
): Promise<PolicyVersion | null> => {
  const [policy] = await database
    .select()
    .from(protectionPolicyVersion)
    .where(eq(protectionPolicyVersion.id, policyVersionId))
    .limit(1);
  return policy ?? null;
};

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
) => {
  const [profile] = await database
    .select()
    .from(protectionProviderProfile)
    .where(eq(protectionProviderProfile.providerUserId, providerUserId))
    .limit(1);
  return profile ?? null;
};

const findPolicyAcceptance = async (
  database: Database,
  providerUserId: string,
  policyVersionId: string
): Promise<PolicyAcceptance | null> => {
  const [acceptance] = await database
    .select()
    .from(protectionProviderPolicyAcceptance)
    .where(
      and(
        eq(protectionProviderPolicyAcceptance.providerUserId, providerUserId),
        eq(protectionProviderPolicyAcceptance.policyVersionId, policyVersionId)
      )
    )
    .limit(1);
  return acceptance ?? null;
};

const toAdminProtectionPolicyVersionView = (policy: PolicyVersion) => ({
  createdAt: policy.createdAt.toISOString(),
  effectiveAt: policy.effectiveAt.toISOString(),
  id: policy.id,
  materialChange: policy.materialChange,
  materialChangeMetadata: policy.materialChangeMetadata,
  membershipFeeAmount: policy.membershipFeeAmount,
  minimumBondAmount: policy.minimumBondAmount,
  publishedAt: policy.publishedAt.toISOString(),
  publishedByUserId: policy.publishedByUserId,
  reacceptDeadlineAt: toIso(policy.reacceptDeadlineAt),
  retentionPolicyReference: policy.retentionPolicyReference,
  summary: policy.summary,
  terms: policy.terms,
  title: policy.title,
  version: policy.version,
});

const toProviderProtectionPolicyView = ({
  acceptance,
  application,
  now,
  policy,
  profileStatus,
}: {
  acceptance: PolicyAcceptance | null;
  application: ProviderApplication | null;
  now: Date;
  policy: PolicyVersion;
  profileStatus: string | null;
}) => {
  const legacyAccepted =
    !acceptance &&
    application?.policyAcceptedAt !== null &&
    application?.policyAcceptedAt !== undefined &&
    application.policyVersion === policy.version;
  const acceptedAt = legacyAccepted
    ? (application?.policyAcceptedAt ?? null)
    : (acceptance?.acceptedAt ?? null);
  const accepted = Boolean(acceptance || legacyAccepted);
  const acceptanceOverdue = isPolicyAcceptanceOverdue({
    accepted,
    deadline: policy.reacceptDeadlineAt,
    materialChange: policy.materialChange,
    now,
  });

  return {
    acceptanceOverdue,
    accepted,
    acceptedAt: toIso(acceptedAt),
    effectiveAt: policy.effectiveAt.toISOString(),
    id: policy.id,
    materialChange: policy.materialChange,
    materialChangeMetadata: policy.materialChangeMetadata,
    membershipFeeAmount: policy.membershipFeeAmount,
    minimumBondAmount: policy.minimumBondAmount,
    profileStatus,
    reacceptDeadlineAt: toIso(policy.reacceptDeadlineAt),
    requiresReacceptance: policy.materialChange && !accepted,
    summary: policy.summary,
    terms: policy.terms,
    title: policy.title,
    version: policy.version,
  };
};

export const getCurrentProtectionPolicyVersion = (
  database: Database,
  now = new Date()
) => findCurrentProtectionPolicyVersion(database, now);

export const getAdminProtectionPolicyVersion = async (
  database: Database,
  policyVersionId: string
) => {
  const policy = await findPolicyVersion(database, policyVersionId);
  if (!policy) {
    throw new ORPCError("NOT_FOUND", {
      message: "Protection policy version does not exist",
    });
  }
  return toAdminProtectionPolicyVersionView(policy);
};

export const listAdminProtectionPolicyVersions = async (
  database: Database,
  input?: { currentOnly?: boolean }
) => {
  const parsedInput = protectionPolicyVersionListInputSchema.parse(input);
  if (parsedInput?.currentOnly) {
    const current = await findCurrentProtectionPolicyVersion(
      database,
      new Date()
    );
    return current ? [toAdminProtectionPolicyVersionView(current)] : [];
  }

  const policies = await database
    .select()
    .from(protectionPolicyVersion)
    .orderBy(
      desc(protectionPolicyVersion.effectiveAt),
      desc(protectionPolicyVersion.createdAt)
    )
    .execute();
  return policies.map(toAdminProtectionPolicyVersionView);
};

export const publishProtectionPolicyVersion = async ({
  database,
  input,
  publisherUserId,
}: {
  database: Database;
  input: ProtectionPolicyVersionPublishInput;
  publisherUserId: string;
}) => {
  const parsedInput = protectionPolicyVersionPublishInputSchema.parse(input);
  const [created] = await database
    .insert(protectionPolicyVersion)
    .values({
      effectiveAt: parsedInput.effectiveAt,
      materialChange: parsedInput.materialChange,
      materialChangeMetadata: parsedInput.materialChangeMetadata,
      membershipFeeAmount: parsedInput.membershipFeeAmount,
      minimumBondAmount: parsedInput.minimumBondAmount,
      publishedByUserId: publisherUserId,
      reacceptDeadlineAt: parsedInput.reacceptDeadlineAt ?? null,
      retentionPolicyReference: parsedInput.retentionPolicyReference,
      summary: parsedInput.summary,
      terms: parsedInput.terms,
      title: parsedInput.title,
      version: parsedInput.version,
    })
    .returning();

  if (!created) {
    throw new ORPCError("CONFLICT", {
      message: "Protection policy version could not be published",
    });
  }
  return toAdminProtectionPolicyVersionView(created);
};

export const getProviderProtectionPolicy = async (
  database: Database,
  providerUserId: string,
  now = new Date()
) => {
  const policy = await findCurrentProtectionPolicyVersion(database, now);
  if (!policy) {
    return null;
  }

  const [application, profile, acceptance] = await Promise.all([
    findProviderApplication(database, providerUserId),
    findProviderProfile(database, providerUserId),
    findPolicyAcceptance(database, providerUserId, policy.id),
  ]);

  return toProviderProtectionPolicyView({
    acceptance,
    application,
    now,
    policy,
    profileStatus: profile?.status ?? null,
  });
};

const syncProviderPolicyAcceptance = async ({
  database,
  policy,
  providerUserId,
  acceptedAt,
}: {
  acceptedAt: Date;
  database: Database;
  policy: PolicyVersion;
  providerUserId: string;
}) => {
  await database
    .update(protectionProviderApplication)
    .set({
      policyAcceptedAt: acceptedAt,
      policyVersion: policy.version,
      policyVersionId: policy.id,
      updatedAt: acceptedAt,
    })
    .where(eq(protectionProviderApplication.providerUserId, providerUserId));

  const [revision] = await database
    .select()
    .from(protectionProviderProfileRevision)
    .where(eq(protectionProviderProfileRevision.providerUserId, providerUserId))
    .orderBy(desc(protectionProviderProfileRevision.revisionNumber))
    .limit(1);
  if (revision && ["DRAFT", "CHANGES_REQUESTED"].includes(revision.status)) {
    await database
      .update(protectionProviderProfileRevision)
      .set({
        policyAcceptedAt: acceptedAt,
        policyVersion: policy.version,
        policyVersionId: policy.id,
        updatedAt: acceptedAt,
      })
      .where(eq(protectionProviderProfileRevision.id, revision.id));
  }
};

export const acceptCurrentProtectionPolicy = async ({
  database,
  now = new Date(),
  policyVersionId,
  providerUserId,
}: {
  database: Database;
  now?: Date;
  policyVersionId: string;
  providerUserId: string;
}) => {
  const parsedInput = protectionPolicyVersionIdInputSchema.parse({
    policyVersionId,
  });
  await database.transaction(async (transaction) => {
    const current = await findCurrentProtectionPolicyVersion(transaction, now);
    if (!current) {
      throw new ORPCError("CONFLICT", {
        message: "No effective Protection policy is available",
      });
    }
    if (current.id !== parsedInput.policyVersionId) {
      throw new ORPCError("CONFLICT", {
        message: "The requested policy is no longer current",
      });
    }

    const existing = await findPolicyAcceptance(
      transaction,
      providerUserId,
      current.id
    );
    if (!existing) {
      const profile = await findProviderProfile(transaction, providerUserId);
      await transaction
        .insert(protectionProviderPolicyAcceptance)
        .values({
          acceptedAt: now,
          policyVersionId: current.id,
          profileId: profile?.id ?? null,
          providerUserId,
          source: "PROVIDER_WORKSPACE",
        })
        .onConflictDoNothing({
          target: [
            protectionProviderPolicyAcceptance.providerUserId,
            protectionProviderPolicyAcceptance.policyVersionId,
          ],
        });
    }
    await syncProviderPolicyAcceptance({
      acceptedAt: now,
      database: transaction,
      policy: current,
      providerUserId,
    });
  });

  return getProviderProtectionPolicy(database, providerUserId, now);
};

const notifyPolicyDeadline = async (
  database: Database,
  policy: PolicyVersion,
  profileId: string,
  providerUserId: string
): Promise<void> => {
  if (!policy.reacceptDeadlineAt) {
    return;
  }
  const body = `Chính sách Avin Check ${policy.version} cần được chấp nhận trước ${policy.reacceptDeadlineAt.toLocaleString("vi-VN")}. Nếu bỏ lỡ hạn, profile Provider sẽ tạm ngưng để chờ xem xét.`;
  await createNotificationEvent(database, {
    body,
    context: {
      deadlineAt: policy.reacceptDeadlineAt.toISOString(),
      policyVersion: policy.version,
      profileId,
    },
    email: {
      htmlBody: `<p>${body}</p>`,
      recipientUserIds: [providerUserId],
      subject: `Avin Check: cần chấp nhận chính sách ${policy.version}`,
      textBody: body,
    },
    eventType: "protection_provider_policy.reacceptance_deadline",
    recipients: [
      { targetPath: "/avin-check/workspace", userId: providerUserId },
    ],
    sourceId: `${policy.id}:${profileId}:deadline`,
    sourceType: POLICY_SOURCE_TYPE,
    title: "Cần chấp nhận chính sách Avin Check",
  });
};

const notifyPolicySuspended = async (
  database: Database,
  policy: PolicyVersion,
  profileId: string,
  providerUserId: string
): Promise<void> => {
  const body = `Profile Provider đã tạm ngưng vì chưa chấp nhận chính sách Avin Check ${policy.version} trước hạn. Profile không bị xóa hoặc chuyển giao; vui lòng liên hệ Protection Admin để được xem xét sau khi chấp nhận chính sách.`;
  await createNotificationEvent(database, {
    body,
    context: {
      policyVersion: policy.version,
      profileId,
      status: "SUSPENDED_PENDING_REVIEW",
    },
    email: {
      htmlBody: `<p>${body}</p>`,
      recipientUserIds: [providerUserId],
      subject: "Avin Check: profile Provider tạm ngưng",
      textBody: body,
    },
    eventType: "protection_provider_policy.suspended",
    recipients: [
      { targetPath: "/avin-check/workspace", userId: providerUserId },
    ],
    sourceId: `${policy.id}:${profileId}:suspended`,
    sourceType: POLICY_SOURCE_TYPE,
    title: "Profile Provider tạm ngưng chờ xem xét",
  });
};

export const enforceProtectionPolicyDeadlines = async ({
  database,
  now = new Date(),
}: {
  database: Database;
  now?: Date;
}) => {
  const [profiles, currentPolicy] = await Promise.all([
    database
      .select()
      .from(protectionProviderProfile)
      .where(eq(protectionProviderProfile.status, "ACTIVE"))
      .execute(),
    findCurrentProtectionPolicyVersion(database, now),
  ]);
  const notifiedProfileIds: string[] = [];
  const suspendedProfileIds: string[] = [];

  if (!currentPolicy?.materialChange || !currentPolicy.reacceptDeadlineAt) {
    return { notifiedProfileIds, suspendedProfileIds };
  }

  for (const profile of profiles) {
    const acceptance = await findPolicyAcceptance(
      database,
      profile.providerUserId,
      currentPolicy.id
    );
    const application = await findProviderApplication(
      database,
      profile.providerUserId
    );
    const accepted = Boolean(
      acceptance ||
      (application?.policyAcceptedAt &&
        application.policyVersion === currentPolicy.version)
    );
    if (accepted) {
      continue;
    }

    if (
      isPolicyAcceptanceOverdue({
        accepted,
        deadline: currentPolicy.reacceptDeadlineAt,
        materialChange: currentPolicy.materialChange,
        now,
      })
    ) {
      const suspended = await database.transaction(async (transaction) => {
        const query = transaction
          .select()
          .from(protectionProviderProfile)
          .where(eq(protectionProviderProfile.id, profile.id));
        const [lockedProfile] = await query.for("update").limit(1);
        if (!lockedProfile || lockedProfile.status !== "ACTIVE") {
          return false;
        }
        const effectivePolicy = await findCurrentProtectionPolicyVersion(
          transaction,
          now
        );
        if (!effectivePolicy || effectivePolicy.id !== currentPolicy.id) {
          return false;
        }
        const deadline = effectivePolicy.reacceptDeadlineAt;
        if (!deadline) {
          return false;
        }
        const currentAcceptance = await findPolicyAcceptance(
          transaction,
          profile.providerUserId,
          effectivePolicy.id
        );
        if (currentAcceptance) {
          return false;
        }
        const currentApplication = await findProviderApplication(
          transaction,
          profile.providerUserId
        );
        const hasLegacyAcceptance = Boolean(
          currentApplication?.policyAcceptedAt &&
          currentApplication.policyVersion === effectivePolicy.version
        );
        if (hasLegacyAcceptance) {
          return false;
        }
        await publishProviderProfileStatusInTransaction({
          database: transaction,
          now,
          profileId: lockedProfile.id,
          reviewerUserId: null,
          status: "SUSPENDED_PENDING_REVIEW",
          statusReason: [
            "Chưa chấp nhận policy",
            effectivePolicy.version,
            "trước hạn",
            deadline.toISOString(),
          ].join(" "),
        });
        await notifyPolicySuspended(
          transaction,
          effectivePolicy,
          lockedProfile.id,
          lockedProfile.providerUserId
        );
        return true;
      });
      if (suspended) {
        suspendedProfileIds.push(profile.id);
      }
      continue;
    }

    await notifyPolicyDeadline(
      database,
      currentPolicy,
      profile.id,
      profile.providerUserId
    );
    notifiedProfileIds.push(profile.id);
  }

  return { notifiedProfileIds, suspendedProfileIds };
};
