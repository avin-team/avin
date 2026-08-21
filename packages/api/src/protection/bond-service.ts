import {
  protectionProviderBondAccount,
  protectionProviderBondAdjustment,
  protectionProviderProfile,
  protectionProviderProfileVersion,
} from "@avin/db/schema/protection";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq } from "drizzle-orm";

import { createNotificationEvent } from "../notifications/notification";
import type { Context } from "../runtime/context";
import {
  assertBondAdjustmentTransition,
  validateProviderBondAdjustmentRecord,
} from "./bond";
import type {
  BondAdjustmentStatus,
  ProviderBondAdjustmentApprovalInput,
  ProviderBondAdjustmentRecordInput,
  ProviderBondLimitInput,
} from "./bond";
import { getProtectionLaunchConfiguration } from "./configuration";
import { assertProtectionOperationAllowed } from "./launch-gates";

type Database = Context["db"];
type ProviderBondAccount = typeof protectionProviderBondAccount.$inferSelect;
type ProviderBondAdjustment =
  typeof protectionProviderBondAdjustment.$inferSelect;
type ProviderProfile = typeof protectionProviderProfile.$inferSelect;
type ProviderProfileVersion =
  typeof protectionProviderProfileVersion.$inferSelect;

const toIso = (value: Date | null): string | null =>
  value?.toISOString() ?? null;

const throwNotFound = (message: string): never => {
  throw new ORPCError("NOT_FOUND", { message });
};

const throwConflict = (message: string): never => {
  throw new ORPCError("CONFLICT", { message });
};

const findProviderProfile = async (
  database: Database,
  profileId: string,
  lock = false
): Promise<ProviderProfile | null> => {
  const query = database
    .select()
    .from(protectionProviderProfile)
    .where(eq(protectionProviderProfile.id, profileId));
  const rows = lock ? await query.for("update").limit(1) : await query.limit(1);
  return rows[0] ?? null;
};

const findProviderProfileForUser = async (
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

const findLatestProfileVersion = async (
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

const findBondAccount = async (
  database: Database,
  profileId: string,
  lock = false
): Promise<ProviderBondAccount | null> => {
  const query = database
    .select()
    .from(protectionProviderBondAccount)
    .where(eq(protectionProviderBondAccount.providerProfileId, profileId));
  const rows = lock ? await query.for("update").limit(1) : await query.limit(1);
  return rows[0] ?? null;
};

const ensureBondAccount = async (
  database: Database,
  profile: ProviderProfile
): Promise<ProviderBondAccount> => {
  const existing = await findBondAccount(database, profile.id, true);
  if (existing) {
    return existing;
  }

  const [created] = await database
    .insert(protectionProviderBondAccount)
    .values({
      providerProfileId: profile.id,
      providerUserId: profile.providerUserId,
      recognizedAmount: 0,
    })
    .onConflictDoNothing({
      target: protectionProviderBondAccount.providerProfileId,
    })
    .returning();
  if (created) {
    return created;
  }

  const concurrentAccount = await findBondAccount(database, profile.id, true);
  if (!concurrentAccount) {
    return throwConflict("Provider Bond account could not be initialized");
  }
  return concurrentAccount;
};

const findAdjustment = async (
  database: Database,
  adjustmentId: string,
  lock = false
): Promise<ProviderBondAdjustment | null> => {
  const query = database
    .select()
    .from(protectionProviderBondAdjustment)
    .where(eq(protectionProviderBondAdjustment.id, adjustmentId));
  const rows = lock ? await query.for("update").limit(1) : await query.limit(1);
  return rows[0] ?? null;
};

const findAdjustmentByIdempotencyKey = async (
  database: Database,
  profileId: string,
  idempotencyKey: string
): Promise<ProviderBondAdjustment | null> => {
  const [adjustment] = await database
    .select()
    .from(protectionProviderBondAdjustment)
    .where(
      and(
        eq(protectionProviderBondAdjustment.profileId, profileId),
        eq(protectionProviderBondAdjustment.idempotencyKey, idempotencyKey)
      )
    )
    .limit(1);
  return adjustment ?? null;
};

const listAdjustments = (
  database: Database,
  profileId: string
): Promise<ProviderBondAdjustment[]> =>
  database
    .select()
    .from(protectionProviderBondAdjustment)
    .where(eq(protectionProviderBondAdjustment.profileId, profileId))
    .orderBy(asc(protectionProviderBondAdjustment.createdAt))
    .execute();

const toAdminAdjustmentView = (adjustment: ProviderBondAdjustment) => ({
  approvalReason: adjustment.approvalReason,
  approvedAt: toIso(adjustment.approvedAt),
  approvedByUserId: adjustment.approvedByUserId,
  balanceAfter: adjustment.balanceAfter,
  balanceBefore: adjustment.balanceBefore,
  createdAt: adjustment.createdAt.toISOString(),
  deltaAmount: adjustment.deltaAmount,
  evidenceReference: adjustment.evidenceReference,
  externalBankReference: adjustment.externalBankReference,
  id: adjustment.id,
  idempotencyKey: adjustment.idempotencyKey,
  kind: adjustment.kind,
  reason: adjustment.reason,
  recordedAt: adjustment.recordedAt.toISOString(),
  recordedByUserId: adjustment.recordedByUserId,
  sourceId: adjustment.sourceId,
  sourceType: adjustment.sourceType,
  status: adjustment.status,
  updatedAt: adjustment.updatedAt.toISOString(),
});

const toProviderAdjustmentView = (adjustment: ProviderBondAdjustment) => ({
  appliedAt:
    adjustment.status === "APPLIED"
      ? toIso(adjustment.approvedAt ?? adjustment.recordedAt)
      : null,
  balanceAfter: adjustment.balanceAfter,
  balanceBefore: adjustment.balanceBefore,
  createdAt: adjustment.createdAt.toISOString(),
  deltaAmount: adjustment.deltaAmount,
  id: adjustment.id,
  kind: adjustment.kind,
  reason: adjustment.reason,
  status: adjustment.status,
});

const toAdminBondView = (
  profile: ProviderProfile,
  account: ProviderBondAccount,
  version: ProviderProfileVersion | null,
  adjustments: ProviderBondAdjustment[]
) => ({
  adjustments: adjustments.map(toAdminAdjustmentView),
  profile: {
    displayName: profile.displayName,
    id: profile.id,
    profileSlug: profile.profileSlug,
    providerUserId: profile.providerUserId,
    status: profile.status,
  },
  recognizedAmount: account.recognizedAmount,
  recommendedTransactionLimit: version?.recommendedTransactionLimit ?? 0,
  updatedAt: account.updatedAt.toISOString(),
});

const toProviderBondView = (
  profile: ProviderProfile,
  account: ProviderBondAccount | null,
  version: ProviderProfileVersion | null,
  adjustments: ProviderBondAdjustment[]
) => ({
  adjustments: adjustments.map(toProviderAdjustmentView),
  profileId: profile.id,
  profileSlug: profile.profileSlug,
  recognizedAmount: account?.recognizedAmount ?? 0,
  recommendedTransactionLimit: version?.recommendedTransactionLimit ?? 0,
  status: profile.status,
  updatedAt: account ? account.updatedAt.toISOString() : null,
});

const isSameOptionalText = (
  stored: string | null,
  requested?: string
): boolean => stored === (requested?.trim() || null);

const assertSameAdjustmentRequest = (
  existing: ProviderBondAdjustment,
  input: ProviderBondAdjustmentRecordInput
): void => {
  if (
    existing.kind !== input.kind ||
    existing.deltaAmount !== input.deltaAmount ||
    existing.reason !== input.reason.trim() ||
    !isSameOptionalText(existing.evidenceReference, input.evidenceReference) ||
    !isSameOptionalText(
      existing.externalBankReference,
      input.externalBankReference
    ) ||
    !isSameOptionalText(existing.sourceId, input.sourceId) ||
    !isSameOptionalText(existing.sourceType, input.sourceType)
  ) {
    throwConflict(
      "Bond adjustment idempotency key was already used for another request"
    );
  }
};

const assertPositiveAdjustmentIsAllowed = (): void => {
  assertProtectionOperationAllowed(
    getProtectionLaunchConfiguration(),
    "PROVIDER_BOND_RECOGNITION"
  );
};

const reconcileRecommendedTransactionLimit = async ({
  database,
  now,
  profileId,
  recognizedAmount,
}: {
  database: Database;
  now: Date;
  profileId: string;
  recognizedAmount: number;
}): Promise<ProviderProfileVersion | null> => {
  const profile = await findProviderProfile(database, profileId, true);
  if (!profile) {
    return throwNotFound("Provider profile does not exist");
  }
  const currentVersion = await findLatestProfileVersion(database, profile.id);
  if (!currentVersion) {
    return throwConflict("Provider profile has no published version");
  }
  if (currentVersion.recommendedTransactionLimit <= recognizedAmount) {
    return currentVersion;
  }

  const [loweredVersion] = await database
    .insert(protectionProviderProfileVersion)
    .values({
      displayName: currentVersion.displayName,
      officialChannels: currentVersion.officialChannels,
      paymentAccount: currentVersion.paymentAccount,
      profileId: profile.id,
      profileSlug: profile.profileSlug,
      publishedAt: now,
      publishedByUserId: null,
      recommendedTransactionLimit: recognizedAmount,
      services: currentVersion.services,
      sourceApplicationId: profile.applicationId,
      status: currentVersion.status,
      statusReason: null,
      verifiedAt: currentVersion.verifiedAt,
      versionNumber: currentVersion.versionNumber + 1,
    })
    .returning();
  if (!loweredVersion) {
    return throwConflict("Recommended Transaction Limit could not be lowered");
  }

  await createNotificationEvent(database, {
    body: "Recommended Transaction Limit của profile đã được hạ để không vượt quá Provider Bond được công nhận.",
    context: {
      profileId: profile.id,
      versionId: loweredVersion.id,
    },
    eventType: "protection_provider_bond.limit_lowered",
    recipients: [{ targetPath: "/provider", userId: profile.providerUserId }],
    sourceId: `${profile.id}:${loweredVersion.id}`,
    sourceType: "PROTECTION_PROVIDER_BOND",
    title: "Recommended Transaction Limit đã được cập nhật",
  });

  return loweredVersion;
};

const getAdminBondView = async (
  database: Database,
  profile: ProviderProfile,
  ensureAccount = false
) => {
  const account = ensureAccount
    ? await ensureBondAccount(database, profile)
    : ((await findBondAccount(database, profile.id)) ?? {
        createdAt: profile.createdAt,
        id: `${profile.id}:bond`,
        providerProfileId: profile.id,
        providerUserId: profile.providerUserId,
        recognizedAmount: 0,
        updatedAt: profile.updatedAt,
      });
  const [version, adjustments] = await Promise.all([
    findLatestProfileVersion(database, profile.id),
    listAdjustments(database, profile.id),
  ]);
  return toAdminBondView(profile, account, version, adjustments);
};

export const getProviderBondForAdmin = async (
  database: Database,
  profileId: string
) => {
  const profile = await findProviderProfile(database, profileId);
  if (!profile) {
    return throwNotFound("Provider profile does not exist");
  }
  return getAdminBondView(database, profile, true);
};

export const listProviderBondsForAdmin = async (database: Database) => {
  const profiles = await database
    .select()
    .from(protectionProviderProfile)
    .orderBy(desc(protectionProviderProfile.updatedAt))
    .execute();
  return Promise.all(
    profiles.map((profile) => getAdminBondView(database, profile))
  );
};

export const getProviderBondForProvider = async ({
  database,
  providerUserId,
}: {
  database: Database;
  providerUserId: string;
}) => {
  const profile = await findProviderProfileForUser(database, providerUserId);
  if (!profile) {
    return null;
  }
  const [account, version, adjustments] = await Promise.all([
    findBondAccount(database, profile.id),
    findLatestProfileVersion(database, profile.id),
    listAdjustments(database, profile.id),
  ]);
  return toProviderBondView(profile, account, version, adjustments);
};

const applyRecognizedBondBalance = async ({
  account,
  balanceAfter,
  database,
  now,
  profileId,
}: {
  account: ProviderBondAccount;
  balanceAfter: number;
  database: Database;
  now: Date;
  profileId: string;
}): Promise<void> => {
  const [updatedAccount] = await database
    .update(protectionProviderBondAccount)
    .set({ recognizedAmount: balanceAfter, updatedAt: now })
    .where(eq(protectionProviderBondAccount.id, account.id))
    .returning();
  if (!updatedAccount) {
    return throwConflict("Provider Bond balance could not be updated");
  }
  await reconcileRecommendedTransactionLimit({
    database,
    now,
    profileId,
    recognizedAmount: balanceAfter,
  });
};

const insertProviderBondAdjustment = async ({
  account,
  database,
  input,
  now,
  profile,
  recordedByUserId,
}: {
  account: ProviderBondAccount;
  database: Database;
  input: ProviderBondAdjustmentRecordInput;
  now: Date;
  profile: ProviderProfile;
  recordedByUserId: string;
}): Promise<ProviderBondAdjustment> => {
  const isApplied = input.kind === "DEPOSIT";
  const balanceAfter = isApplied
    ? account.recognizedAmount + input.deltaAmount
    : null;
  if (balanceAfter !== null && balanceAfter < 0) {
    return throwConflict("Provider Bond cannot become negative");
  }

  const [adjustment] = await database
    .insert(protectionProviderBondAdjustment)
    .values({
      balanceAfter,
      balanceBefore: isApplied ? account.recognizedAmount : null,
      deltaAmount: input.deltaAmount,
      evidenceReference: input.evidenceReference?.trim() || null,
      externalBankReference: input.externalBankReference?.trim() || null,
      idempotencyKey: input.idempotencyKey.trim(),
      kind: input.kind,
      profileId: profile.id,
      providerUserId: profile.providerUserId,
      reason: input.reason.trim(),
      recordedAt: now,
      recordedByUserId,
      sourceId: input.sourceId?.trim() || null,
      sourceType: input.sourceType?.trim() || null,
      status: isApplied ? "APPLIED" : "PENDING_APPROVAL",
      updatedAt: now,
    })
    .returning();
  if (!adjustment) {
    return throwConflict("Bond adjustment could not be recorded");
  }

  if (isApplied && balanceAfter !== null) {
    await applyRecognizedBondBalance({
      account,
      balanceAfter,
      database,
      now,
      profileId: profile.id,
    });
  }
  return adjustment;
};

export const recordProviderBondAdjustment = async ({
  database,
  input,
  recordedByUserId,
  now = new Date(),
}: {
  database: Database;
  input: ProviderBondAdjustmentRecordInput;
  now?: Date;
  recordedByUserId: string;
}) => {
  const validatedInput = validateProviderBondAdjustmentRecord(input);
  const result = await database.transaction(async (transaction) => {
    const profile = await findProviderProfile(
      transaction,
      validatedInput.profileId,
      true
    );
    if (!profile) {
      return throwNotFound("Provider profile does not exist");
    }

    const account = await ensureBondAccount(transaction, profile);
    const existing = await findAdjustmentByIdempotencyKey(
      transaction,
      profile.id,
      validatedInput.idempotencyKey.trim()
    );
    if (existing) {
      assertSameAdjustmentRequest(existing, validatedInput);
      return { adjustment: existing, profileId: profile.id };
    }

    if (validatedInput.deltaAmount > 0) {
      assertPositiveAdjustmentIsAllowed();
    }

    const adjustment = await insertProviderBondAdjustment({
      account,
      database: transaction,
      input: validatedInput,
      now,
      profile,
      recordedByUserId,
    });

    return { adjustment, profileId: profile.id };
  });

  return getProviderBondForAdmin(database, result.profileId);
};

export const approveProviderBondAdjustment = async ({
  database,
  input,
  reviewerUserId,
  now = new Date(),
}: {
  database: Database;
  input: ProviderBondAdjustmentApprovalInput;
  now?: Date;
  reviewerUserId: string;
}) => {
  const result = await database.transaction(async (transaction) => {
    const adjustment = await findAdjustment(
      transaction,
      input.adjustmentId,
      true
    );
    if (!adjustment) {
      return throwNotFound("Bond adjustment does not exist");
    }
    if (adjustment.status !== "PENDING_APPROVAL") {
      return { profileId: adjustment.profileId };
    }
    if (adjustment.recordedByUserId === reviewerUserId) {
      throw new ORPCError("FORBIDDEN", {
        message: "The Admin who recorded a Bond decrease cannot approve it",
      });
    }

    const nextStatus: BondAdjustmentStatus =
      input.decision === "APPROVED" ? "APPLIED" : "REJECTED";
    assertBondAdjustmentTransition(adjustment.status, nextStatus);
    const approvalReason = input.reason?.trim() || null;
    if (input.decision === "REJECTED" && !approvalReason) {
      throw new ORPCError("BAD_REQUEST", {
        message: "A reason is required to reject a Bond adjustment",
      });
    }

    if (input.decision === "REJECTED") {
      const [rejected] = await transaction
        .update(protectionProviderBondAdjustment)
        .set({
          approvalReason,
          approvedAt: now,
          approvedByUserId: reviewerUserId,
          status: "REJECTED",
          updatedAt: now,
        })
        .where(
          and(
            eq(protectionProviderBondAdjustment.id, adjustment.id),
            eq(protectionProviderBondAdjustment.status, "PENDING_APPROVAL")
          )
        )
        .returning();
      if (!rejected) {
        throwConflict("Bond adjustment was decided by another Manager");
      }
      return { profileId: adjustment.profileId };
    }

    if (adjustment.deltaAmount > 0) {
      assertPositiveAdjustmentIsAllowed();
    }
    const profile = await findProviderProfile(
      transaction,
      adjustment.profileId,
      true
    );
    if (!profile) {
      return throwNotFound("Provider profile does not exist");
    }
    const account = await ensureBondAccount(transaction, profile);
    const balanceAfter = account.recognizedAmount + adjustment.deltaAmount;
    if (balanceAfter < 0) {
      return throwConflict(
        "Provider Bond balance is insufficient for this adjustment"
      );
    }

    const [applied] = await transaction
      .update(protectionProviderBondAdjustment)
      .set({
        approvalReason,
        approvedAt: now,
        approvedByUserId: reviewerUserId,
        balanceAfter,
        balanceBefore: account.recognizedAmount,
        status: "APPLIED",
        updatedAt: now,
      })
      .where(
        and(
          eq(protectionProviderBondAdjustment.id, adjustment.id),
          eq(protectionProviderBondAdjustment.status, "PENDING_APPROVAL")
        )
      )
      .returning();
    if (!applied) {
      return throwConflict("Bond adjustment was decided by another Manager");
    }

    const [updatedAccount] = await transaction
      .update(protectionProviderBondAccount)
      .set({ recognizedAmount: balanceAfter, updatedAt: now })
      .where(eq(protectionProviderBondAccount.id, account.id))
      .returning();
    if (!updatedAccount) {
      return throwConflict("Provider Bond balance could not be updated");
    }
    await reconcileRecommendedTransactionLimit({
      database: transaction,
      now,
      profileId: profile.id,
      recognizedAmount: balanceAfter,
    });
    return { profileId: profile.id };
  });

  return getProviderBondForAdmin(database, result.profileId);
};

export const publishProviderRecommendedTransactionLimit = async ({
  database,
  input,
  publisherUserId,
  now = new Date(),
}: {
  database: Database;
  input: ProviderBondLimitInput;
  now?: Date;
  publisherUserId: string;
}) => {
  const result = await database.transaction(async (transaction) => {
    const profile = await findProviderProfile(
      transaction,
      input.profileId,
      true
    );
    if (!profile) {
      return throwNotFound("Provider profile does not exist");
    }
    const account = await ensureBondAccount(transaction, profile);
    if (input.recommendedTransactionLimit > account.recognizedAmount) {
      throwConflict(
        "Recommended Transaction Limit cannot exceed recognized Provider Bond"
      );
    }
    const currentVersion = await findLatestProfileVersion(
      transaction,
      profile.id
    );
    if (!currentVersion) {
      return throwConflict("Provider profile has no published version");
    }
    if (
      currentVersion.recommendedTransactionLimit ===
      input.recommendedTransactionLimit
    ) {
      return { profileId: profile.id };
    }

    const [publishedVersion] = await transaction
      .insert(protectionProviderProfileVersion)
      .values({
        displayName: currentVersion.displayName,
        officialChannels: currentVersion.officialChannels,
        paymentAccount: currentVersion.paymentAccount,
        profileId: profile.id,
        profileSlug: profile.profileSlug,
        publishedAt: now,
        publishedByUserId: publisherUserId,
        recommendedTransactionLimit: input.recommendedTransactionLimit,
        services: currentVersion.services,
        sourceApplicationId: profile.applicationId,
        status: currentVersion.status,
        statusReason: null,
        verifiedAt: currentVersion.verifiedAt,
        versionNumber: currentVersion.versionNumber + 1,
      })
      .returning();
    if (!publishedVersion) {
      return throwConflict(
        "Recommended Transaction Limit could not be published"
      );
    }
    await createNotificationEvent(transaction, {
      body: "Recommended Transaction Limit trên profile Avin Check đã được cập nhật bởi Quản lý hệ thống.",
      context: {
        profileId: profile.id,
        versionId: publishedVersion.id,
      },
      eventType: "protection_provider_bond.limit_updated",
      recipients: [{ targetPath: "/provider", userId: profile.providerUserId }],
      sourceId: `${profile.id}:${publishedVersion.id}`,
      sourceType: "PROTECTION_PROVIDER_BOND",
      title: "Recommended Transaction Limit đã được cập nhật",
    });
    return { profileId: profile.id };
  });

  return getProviderBondForAdmin(database, result.profileId);
};
