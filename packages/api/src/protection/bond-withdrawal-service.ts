import {
  protectionProviderBondAccount,
  protectionProviderBondAdjustment,
  protectionProviderBondWithdrawal,
  protectionProviderBondWithdrawalHistory,
  protectionProviderProfile,
  protectionProviderRiskIncident,
  protectionSupportReview,
} from "@avin/db/schema/protection";
import { ORPCError } from "@orpc/server";
import type { SQL } from "drizzle-orm";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";

import {
  createNotificationEvent,
  listNotificationRecipientsByRole,
} from "../notifications/notification";
import type { Context } from "../runtime/context";
import {
  approveProviderBondAdjustment,
  recordProviderBondAdjustment,
} from "./bond-service";
import {
  assertProviderBondWithdrawalTransition,
  PROVIDER_BOND_WITHDRAWAL_COOLING_DAYS,
} from "./bond-withdrawal";
import type {
  ProviderBondWithdrawalApprovalInput,
  ProviderBondWithdrawalRecordInput,
  ProviderBondWithdrawalRequestInput,
} from "./bond-withdrawal";
import { publishProviderProfileStatusInTransaction } from "./provider-application-service";

type Database = Context["db"];
type BondAccount = typeof protectionProviderBondAccount.$inferSelect;
type BondAdjustment = typeof protectionProviderBondAdjustment.$inferSelect;
type Profile = typeof protectionProviderProfile.$inferSelect;
type Withdrawal = typeof protectionProviderBondWithdrawal.$inferSelect;
type WithdrawalHistory =
  typeof protectionProviderBondWithdrawalHistory.$inferSelect;

const WITHDRAWAL_SOURCE_TYPE = "PROTECTION_PROVIDER_BOND_WITHDRAWAL";
const COOLING_PERIOD_MS =
  PROVIDER_BOND_WITHDRAWAL_COOLING_DAYS * 24 * 60 * 60 * 1000;
const OPEN_RISK_INCIDENT_STATUSES = [
  "AWAITING_PROVIDER_RESPONSE",
  "PROVIDER_RESPONDED",
  "RESPONSE_EXPIRED",
  "UNDER_REVIEW",
  "CONFIRMED_FRAUD",
] as const;
const OPEN_SUPPORT_REVIEW_STATUSES = [
  "ELIGIBILITY_REVIEW",
  "ELIGIBLE",
  "PENDING_APPROVAL",
] as const;

const throwConflict = (message: string): never => {
  throw new ORPCError("CONFLICT", { message });
};

const throwBadRequest = (message: string): never => {
  throw new ORPCError("BAD_REQUEST", { message });
};

const toIso = (value: Date | null): string | null =>
  value?.toISOString() ?? null;

const getCoolingEndsAt = (now: Date): Date =>
  new Date(now.getTime() + COOLING_PERIOD_MS);

const findProfileForUpdate = async (
  database: Database,
  profileId: string
): Promise<Profile | null> => {
  const query = database
    .select()
    .from(protectionProviderProfile)
    .where(eq(protectionProviderProfile.id, profileId));
  const [profile] = await query.for("update").limit(1);
  return profile ?? null;
};

const findProfileForProvider = async (
  database: Database,
  providerUserId: string
): Promise<Profile | null> => {
  const [profile] = await database
    .select()
    .from(protectionProviderProfile)
    .where(eq(protectionProviderProfile.providerUserId, providerUserId))
    .limit(1);
  return profile ?? null;
};

const findWithdrawal = async (database: Database, withdrawalId: string) => {
  const [row] = await database
    .select({
      profile: protectionProviderProfile,
      withdrawal: protectionProviderBondWithdrawal,
    })
    .from(protectionProviderBondWithdrawal)
    .innerJoin(
      protectionProviderProfile,
      eq(
        protectionProviderBondWithdrawal.profileId,
        protectionProviderProfile.id
      )
    )
    .where(eq(protectionProviderBondWithdrawal.id, withdrawalId))
    .limit(1);
  return row ?? null;
};

const findWithdrawalForUpdate = async (
  database: Database,
  withdrawalId: string
): Promise<Withdrawal | null> => {
  const query = database
    .select()
    .from(protectionProviderBondWithdrawal)
    .where(eq(protectionProviderBondWithdrawal.id, withdrawalId));
  const [withdrawal] = await query.for("update").limit(1);
  return withdrawal ?? null;
};

const findWithdrawalByProfile = async (
  database: Database,
  profileId: string
): Promise<Withdrawal | null> => {
  const [withdrawal] = await database
    .select()
    .from(protectionProviderBondWithdrawal)
    .where(eq(protectionProviderBondWithdrawal.profileId, profileId))
    .limit(1);
  return withdrawal ?? null;
};

const findBondAccountForUpdate = async (
  database: Database,
  profileId: string
): Promise<BondAccount | null> => {
  const query = database
    .select()
    .from(protectionProviderBondAccount)
    .where(eq(protectionProviderBondAccount.providerProfileId, profileId));
  const [account] = await query.for("update").limit(1);
  return account ?? null;
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

const listWithdrawalHistory = (
  database: Database,
  withdrawalId: string
): Promise<WithdrawalHistory[]> =>
  database
    .select()
    .from(protectionProviderBondWithdrawalHistory)
    .where(
      eq(protectionProviderBondWithdrawalHistory.withdrawalId, withdrawalId)
    )
    .orderBy(asc(protectionProviderBondWithdrawalHistory.createdAt))
    .execute();

const appendWithdrawalHistory = async (
  database: Database,
  withdrawalId: string,
  status: Withdrawal["status"],
  actorUserId: string | null,
  reason: string | null,
  createdAt: Date
): Promise<void> => {
  await database.insert(protectionProviderBondWithdrawalHistory).values({
    actorUserId,
    createdAt,
    reason,
    status,
    withdrawalId,
  });
};

export const getProviderBondWithdrawalBlockers = async (
  database: Database,
  profileId: string,
  excludedBondAdjustmentId?: string | null
) => {
  const bondAdjustmentConditions: SQL[] = [
    eq(protectionProviderBondAdjustment.profileId, profileId),
    eq(protectionProviderBondAdjustment.status, "PENDING_APPROVAL"),
  ];
  if (excludedBondAdjustmentId) {
    bondAdjustmentConditions.push(
      ne(protectionProviderBondAdjustment.id, excludedBondAdjustmentId)
    );
  }

  const [riskIncidents, supportReviews, bondAdjustments] = await Promise.all([
    database
      .select({
        id: protectionProviderRiskIncident.id,
        status: protectionProviderRiskIncident.status,
      })
      .from(protectionProviderRiskIncident)
      .where(
        and(
          eq(protectionProviderRiskIncident.providerProfileId, profileId),
          inArray(
            protectionProviderRiskIncident.status,
            OPEN_RISK_INCIDENT_STATUSES
          )
        )
      ),
    database
      .select({
        id: protectionSupportReview.id,
        status: protectionSupportReview.status,
      })
      .from(protectionSupportReview)
      .where(
        and(
          eq(protectionSupportReview.profileId, profileId),
          inArray(protectionSupportReview.status, OPEN_SUPPORT_REVIEW_STATUSES)
        )
      ),
    database
      .select({
        id: protectionProviderBondAdjustment.id,
        status: protectionProviderBondAdjustment.status,
      })
      .from(protectionProviderBondAdjustment)
      .where(and(...bondAdjustmentConditions)),
  ]);

  return { bondAdjustments, riskIncidents, supportReviews };
};

const blockerMessage = (
  blockers: Awaited<ReturnType<typeof getProviderBondWithdrawalBlockers>>
): string | null => {
  const reasons: string[] = [];
  if (blockers.riskIncidents.length > 0) {
    reasons.push(`${blockers.riskIncidents.length} Risk Report/incident`);
  }
  if (blockers.supportReviews.length > 0) {
    reasons.push(`${blockers.supportReviews.length} Support Review`);
  }
  if (blockers.bondAdjustments.length > 0) {
    reasons.push(`${blockers.bondAdjustments.length} Bond Adjustment`);
  }
  return reasons.length > 0 ? reasons.join(", ") : null;
};

const toHistoryView = (history: WithdrawalHistory) => ({
  actorUserId: history.actorUserId,
  createdAt: history.createdAt.toISOString(),
  id: history.id,
  reason: history.reason,
  status: history.status,
});

const toBondAdjustmentView = (adjustment: BondAdjustment | null) =>
  adjustment
    ? {
        approvedAt: toIso(adjustment.approvedAt),
        approvedByUserId: adjustment.approvedByUserId,
        deltaAmount: adjustment.deltaAmount,
        evidenceReference: adjustment.evidenceReference,
        externalBankReference: adjustment.externalBankReference,
        id: adjustment.id,
        kind: adjustment.kind,
        recordedAt: adjustment.recordedAt.toISOString(),
        recordedByUserId: adjustment.recordedByUserId,
        status: adjustment.status,
      }
    : null;

const toProviderWithdrawalView = (
  row: NonNullable<Awaited<ReturnType<typeof findWithdrawal>>>
) => ({
  completedAt: toIso(row.withdrawal.completedAt),
  coolingEndsAt: row.withdrawal.coolingEndsAt.toISOString(),
  id: row.withdrawal.id,
  profileStatus: row.profile.status,
  recognizedAmountAtRequest: row.withdrawal.recognizedAmountAtRequest,
  rejectionReason: row.withdrawal.rejectionReason,
  requestedAt: row.withdrawal.requestedAt.toISOString(),
  requestedReason: row.withdrawal.requestedReason,
  returnedAmount: row.withdrawal.returnedAmount,
  status: row.withdrawal.status,
  updatedAt: row.withdrawal.updatedAt.toISOString(),
});

const toAdminWithdrawalView = (
  row: NonNullable<Awaited<ReturnType<typeof findWithdrawal>>>,
  history: WithdrawalHistory[],
  blockers: Awaited<ReturnType<typeof getProviderBondWithdrawalBlockers>>,
  bondAdjustment: BondAdjustment | null
) => ({
  approvalReason: row.withdrawal.approvalReason,
  approvedAt: toIso(row.withdrawal.approvedAt),
  approvedByUserId: row.withdrawal.approvedByUserId,
  blockers,
  bondAdjustment: toBondAdjustmentView(bondAdjustment),
  completedAt: toIso(row.withdrawal.completedAt),
  coolingEndsAt: row.withdrawal.coolingEndsAt.toISOString(),
  createdAt: row.withdrawal.createdAt.toISOString(),
  externalActionReference: row.withdrawal.externalActionReference,
  history: history.map(toHistoryView),
  id: row.withdrawal.id,
  privateEvidenceReference: row.withdrawal.privateEvidenceReference,
  profile: {
    displayName: row.profile.displayName,
    id: row.profile.id,
    profileSlug: row.profile.profileSlug,
    providerUserId: row.profile.providerUserId,
    status: row.profile.status,
  },
  providerUserId: row.withdrawal.providerUserId,
  recognizedAmountAtRequest: row.withdrawal.recognizedAmountAtRequest,
  recordedAt: toIso(row.withdrawal.recordedAt),
  recordedByUserId: row.withdrawal.recordedByUserId,
  rejectionReason: row.withdrawal.rejectionReason,
  requestedAt: row.withdrawal.requestedAt.toISOString(),
  requestedReason: row.withdrawal.requestedReason,
  returnedAmount: row.withdrawal.returnedAmount,
  status: row.withdrawal.status,
  updatedAt: row.withdrawal.updatedAt.toISOString(),
});

const getAdminWithdrawalView = async (
  database: Database,
  withdrawalId: string
) => {
  const row = await findWithdrawal(database, withdrawalId);
  if (!row) {
    throw new ORPCError("NOT_FOUND", {
      message: "Provider Bond Withdrawal does not exist",
    });
  }
  const [history, blockers, bondAdjustment] = await Promise.all([
    listWithdrawalHistory(database, withdrawalId),
    getProviderBondWithdrawalBlockers(
      database,
      row.profile.id,
      row.withdrawal.bondAdjustmentId
    ),
    row.withdrawal.bondAdjustmentId
      ? findBondAdjustment(database, row.withdrawal.bondAdjustmentId)
      : Promise.resolve(null),
  ]);
  return toAdminWithdrawalView(row, history, blockers, bondAdjustment);
};

export const getAdminProviderBondWithdrawal = (
  database: Database,
  withdrawalId: string
) => getAdminWithdrawalView(database, withdrawalId);

export const listAdminProviderBondWithdrawals = async (
  database: Database,
  input?: { status?: Withdrawal["status"] }
) => {
  const conditions: SQL[] = [];
  if (input?.status) {
    conditions.push(eq(protectionProviderBondWithdrawal.status, input.status));
  }
  const rows = await database
    .select({ id: protectionProviderBondWithdrawal.id })
    .from(protectionProviderBondWithdrawal)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(protectionProviderBondWithdrawal.createdAt))
    .execute();

  const views = [];
  for (const row of rows) {
    views.push(await getAdminWithdrawalView(database, row.id));
  }
  return views;
};

export const getProviderBondWithdrawal = async ({
  database,
  providerUserId,
}: {
  database: Database;
  providerUserId: string;
}) => {
  const profile = await findProfileForProvider(database, providerUserId);
  if (!profile) {
    return null;
  }
  const withdrawal = await findWithdrawalByProfile(database, profile.id);
  if (!withdrawal) {
    return null;
  }
  const row = { profile, withdrawal };
  return toProviderWithdrawalView(row);
};

export const requestProviderBondWithdrawal = async ({
  database,
  input,
  now = new Date(),
  providerUserId,
}: {
  database: Database;
  input: ProviderBondWithdrawalRequestInput;
  now?: Date;
  providerUserId: string;
}) => {
  const withdrawalId = await database.transaction(async (transaction) => {
    const profile = await findProfileForProvider(transaction, providerUserId);
    if (!profile) {
      throw new ORPCError("NOT_FOUND", {
        message: "Provider profile does not exist",
      });
    }
    const lockedProfile = await findProfileForUpdate(transaction, profile.id);
    if (!lockedProfile) {
      throw new ORPCError("NOT_FOUND", {
        message: "Provider profile does not exist",
      });
    }

    const existing = await findWithdrawalByProfile(transaction, profile.id);
    if (existing) {
      if (existing.status === "REJECTED") {
        return throwConflict(
          "Provider Bond Withdrawal đã bị từ chối và không thể gửi lại"
        );
      }
      return existing.id;
    }
    if (lockedProfile.status !== "ACTIVE") {
      return throwConflict(
        "Chỉ Provider đang hoạt động mới có thể yêu cầu rút Bond"
      );
    }

    const account = await findBondAccountForUpdate(transaction, profile.id);
    if (!account || account.recognizedAmount <= 0) {
      return throwConflict("Provider không có Recognized Bond để rút");
    }

    const [created] = await transaction
      .insert(protectionProviderBondWithdrawal)
      .values({
        coolingEndsAt: getCoolingEndsAt(now),
        createdAt: now,
        profileId: profile.id,
        providerUserId,
        recognizedAmountAtRequest: account.recognizedAmount,
        requestedAt: now,
        requestedReason: input.reason?.trim() || null,
        status: "COOLING",
        updatedAt: now,
      })
      .returning();
    if (!created) {
      return throwConflict("Provider Bond Withdrawal could not be created");
    }

    await publishProviderProfileStatusInTransaction({
      database: transaction,
      now,
      profileId: profile.id,
      reviewerUserId: null,
      status: "WITHDRAWAL_PENDING",
      statusReason:
        "Provider đã yêu cầu rút Bond; yêu cầu đang trong thời gian cooling 30 ngày.",
    });
    await appendWithdrawalHistory(
      transaction,
      created.id,
      created.status,
      providerUserId,
      input.reason?.trim() || "Provider submitted a Bond Withdrawal request.",
      now
    );
    await createNotificationEvent(transaction, {
      actorUserId: providerUserId,
      body: "Provider đã gửi yêu cầu rút Bond; yêu cầu đang trong cooling 30 ngày.",
      context: { withdrawalId: created.id },
      eventType: "protection_provider_bond.withdrawal_requested",
      now,
      recipients: [
        { targetPath: "/provider", userId: providerUserId },
        ...(await listNotificationRecipientsByRole(transaction, {
          role: "ADMIN",
          targetPath: "/avin-check/bond-withdrawals",
        })),
      ],
      sourceId: created.id,
      sourceType: WITHDRAWAL_SOURCE_TYPE,
      title: "Provider Bond Withdrawal mới",
    });
    return created.id;
  });

  return getAdminWithdrawalView(database, withdrawalId);
};

export const recordProviderBondWithdrawal = async ({
  database,
  input,
  now = new Date(),
  recorderUserId,
}: {
  database: Database;
  input: ProviderBondWithdrawalRecordInput;
  now?: Date;
  recorderUserId: string;
}) => {
  const snapshot = await database.transaction(async (transaction) => {
    const withdrawal = await findWithdrawalForUpdate(
      transaction,
      input.withdrawalId
    );
    if (!withdrawal) {
      throw new ORPCError("NOT_FOUND", {
        message: "Provider Bond Withdrawal does not exist",
      });
    }
    if (withdrawal.status === "PENDING_APPROVAL") {
      return null;
    }
    if (withdrawal.status !== "COOLING") {
      return throwConflict(
        "Chỉ yêu cầu Bond Withdrawal đang cooling mới được ghi nhận"
      );
    }
    if (now.getTime() < withdrawal.coolingEndsAt.getTime()) {
      return throwConflict("Provider Bond Withdrawal chưa hết cooling 30 ngày");
    }

    const profile = await findProfileForUpdate(
      transaction,
      withdrawal.profileId
    );
    if (!profile || profile.status !== "WITHDRAWAL_PENDING") {
      return throwConflict(
        "Provider profile không còn ở trạng thái withdrawal pending"
      );
    }
    const blockers = await getProviderBondWithdrawalBlockers(
      transaction,
      withdrawal.profileId
    );
    const reason = blockerMessage(blockers);
    if (reason) {
      return throwConflict(`Withdrawal đang bị freeze bởi: ${reason}`);
    }
    const account = await findBondAccountForUpdate(
      transaction,
      withdrawal.profileId
    );
    if (!account) {
      return throwConflict("Provider Bond account does not exist");
    }
    return {
      profileId: withdrawal.profileId,
      returnedAmount: account.recognizedAmount,
    };
  });

  let bondAdjustmentId: string | null = null;
  if (snapshot && snapshot.returnedAmount > 0) {
    const bond = await recordProviderBondAdjustment({
      database,
      input: {
        deltaAmount: -snapshot.returnedAmount,
        evidenceReference: input.privateEvidenceReference,
        externalBankReference: input.externalActionReference,
        idempotencyKey: `provider-bond-withdrawal-${input.withdrawalId}`,
        kind: "WITHDRAWAL",
        profileId: snapshot.profileId,
        reason: input.reason,
        sourceId: input.withdrawalId,
        sourceType: WITHDRAWAL_SOURCE_TYPE,
      },
      now,
      recordedByUserId: recorderUserId,
    });
    const adjustment = bond.adjustments.find(
      (candidate) =>
        candidate.idempotencyKey ===
        `provider-bond-withdrawal-${input.withdrawalId}`
    );
    if (!adjustment) {
      return throwConflict(
        "Provider Bond Withdrawal adjustment could not be linked"
      );
    }
    bondAdjustmentId = adjustment.id;
  }

  await database.transaction(async (transaction) => {
    const withdrawal = await findWithdrawalForUpdate(
      transaction,
      input.withdrawalId
    );
    if (!withdrawal) {
      throw new ORPCError("NOT_FOUND", {
        message: "Provider Bond Withdrawal does not exist",
      });
    }
    if (withdrawal.status === "PENDING_APPROVAL") {
      return;
    }
    if (withdrawal.status !== "COOLING") {
      return throwConflict("Provider Bond Withdrawal changed before recording");
    }
    assertProviderBondWithdrawalTransition(
      withdrawal.status,
      "PENDING_APPROVAL"
    );
    const [updated] = await transaction
      .update(protectionProviderBondWithdrawal)
      .set({
        bondAdjustmentId,
        externalActionReference: input.externalActionReference.trim(),
        privateEvidenceReference: input.privateEvidenceReference.trim(),
        recordedAt: now,
        recordedByUserId: recorderUserId,
        returnedAmount: snapshot?.returnedAmount ?? null,
        status: "PENDING_APPROVAL",
        updatedAt: now,
      })
      .where(
        and(
          eq(protectionProviderBondWithdrawal.id, input.withdrawalId),
          eq(protectionProviderBondWithdrawal.status, "COOLING")
        )
      )
      .returning();
    if (!updated) {
      throwConflict("Provider Bond Withdrawal was recorded by another Admin");
    }
    await appendWithdrawalHistory(
      transaction,
      input.withdrawalId,
      "PENDING_APPROVAL",
      recorderUserId,
      input.reason.trim(),
      now
    );
    await createNotificationEvent(transaction, {
      actorUserId: recorderUserId,
      body: "Yêu cầu rút Bond đã hết cooling và đang chờ Protection Manager duyệt.",
      context: { withdrawalId: input.withdrawalId },
      eventType: "protection_provider_bond.withdrawal_pending_approval",
      now,
      recipients: [
        { targetPath: "/provider", userId: withdrawal.providerUserId },
        ...(await listNotificationRecipientsByRole(transaction, {
          role: "ADMIN",
          targetPath: "/avin-check/bond-withdrawals",
        })),
      ],
      sourceId: input.withdrawalId,
      sourceType: WITHDRAWAL_SOURCE_TYPE,
      title: "Provider Bond Withdrawal chờ duyệt",
    });
  });

  return getAdminWithdrawalView(database, input.withdrawalId);
};

const lockWithdrawalForApproval = async (
  database: Database,
  withdrawalId: string
): Promise<Withdrawal | null> => {
  const withdrawal = await findWithdrawalForUpdate(database, withdrawalId);
  if (!withdrawal) {
    throw new ORPCError("NOT_FOUND", {
      message: "Provider Bond Withdrawal does not exist",
    });
  }
  if (["COMPLETED", "REJECTED"].includes(withdrawal.status)) {
    return null;
  }
  if (withdrawal.status !== "PENDING_APPROVAL") {
    return throwConflict("Provider Bond Withdrawal changed before approval");
  }
  return withdrawal;
};

const reconcileWithdrawalBondAdjustment = async ({
  approverUserId,
  database,
  input,
  now,
  withdrawal,
}: {
  approverUserId: string;
  database: Database;
  input: ProviderBondWithdrawalApprovalInput;
  now: Date;
  withdrawal: Withdrawal;
}): Promise<void> => {
  if (!withdrawal.bondAdjustmentId) {
    return;
  }
  const adjustment = await findBondAdjustment(
    database,
    withdrawal.bondAdjustmentId
  );
  if (!adjustment) {
    return;
  }
  const isApproved = input.decision === "APPROVED";
  if (isApproved && adjustment.status === "REJECTED") {
    return throwConflict("Bond Withdrawal adjustment đã bị từ chối");
  }
  if (!isApproved && adjustment.status === "APPLIED") {
    return throwConflict(
      "Bond Withdrawal adjustment đã áp dụng, không thể từ chối"
    );
  }
  if (adjustment.status !== "PENDING_APPROVAL") {
    return;
  }
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
};

const assertWithdrawalHasNoApprovalBlockers = async (
  database: Database,
  withdrawal: Withdrawal
): Promise<void> => {
  const blockers = await getProviderBondWithdrawalBlockers(
    database,
    withdrawal.profileId,
    withdrawal.bondAdjustmentId
  );
  const reason = blockerMessage(blockers);
  if (reason) {
    return throwConflict(`Withdrawal đang bị freeze bởi: ${reason}`);
  }
};

const applyProviderBondWithdrawalDecision = async ({
  approverUserId,
  database,
  input,
  now,
}: {
  approverUserId: string;
  database: Database;
  input: ProviderBondWithdrawalApprovalInput;
  now: Date;
}): Promise<void> => {
  const withdrawal = await lockWithdrawalForApproval(
    database,
    input.withdrawalId
  );
  if (!withdrawal) {
    return;
  }
  const profile = await findProfileForUpdate(database, withdrawal.profileId);
  if (!profile) {
    throw new ORPCError("NOT_FOUND", {
      message: "Provider profile does not exist",
    });
  }

  const isApproved = input.decision === "APPROVED";
  if (isApproved) {
    await assertWithdrawalHasNoApprovalBlockers(database, withdrawal);
  }
  const nextStatus = isApproved ? "COMPLETED" : "REJECTED";
  assertProviderBondWithdrawalTransition(withdrawal.status, nextStatus);
  const decisionReason = input.reason?.trim() || null;
  const notification = isApproved
    ? {
        body: "Provider Bond Withdrawal đã được duyệt; việc hoàn trả được ghi nhận off-platform.",
        eventType: "protection_provider_bond.withdrawal_completed" as const,
        title: "Provider Bond Withdrawal đã hoàn tất",
      }
    : {
        body: "Provider Bond Withdrawal đã bị từ chối; profile được mở lại.",
        eventType: "protection_provider_bond.withdrawal_rejected" as const,
        title: "Provider Bond Withdrawal bị từ chối",
      };
  await publishProviderProfileStatusInTransaction({
    database,
    now,
    profileId: profile.id,
    reviewerUserId: approverUserId,
    status: isApproved ? "WITHDRAWN" : "ACTIVE",
    statusReason: isApproved
      ? "Provider đã hoàn tất quy trình rút khỏi chương trình."
      : decisionReason || "Provider Bond Withdrawal bị từ chối.",
  });
  const [updated] = await database
    .update(protectionProviderBondWithdrawal)
    .set({
      approvalReason: decisionReason,
      approvedAt: now,
      approvedByUserId: approverUserId,
      completedAt: isApproved ? now : null,
      rejectionReason: isApproved ? null : decisionReason,
      status: nextStatus,
      updatedAt: now,
    })
    .where(
      and(
        eq(protectionProviderBondWithdrawal.id, input.withdrawalId),
        eq(protectionProviderBondWithdrawal.status, "PENDING_APPROVAL")
      )
    )
    .returning();
  if (!updated) {
    throwConflict("Provider Bond Withdrawal was decided by another Manager");
  }
  await appendWithdrawalHistory(
    database,
    input.withdrawalId,
    nextStatus,
    approverUserId,
    decisionReason,
    now
  );
  await createNotificationEvent(database, {
    actorUserId: approverUserId,
    ...notification,
    context: { withdrawalId: input.withdrawalId },
    now,
    recipients: [
      { targetPath: "/provider", userId: withdrawal.providerUserId },
      ...(await listNotificationRecipientsByRole(database, {
        role: "ADMIN",
        targetPath: "/avin-check/bond-withdrawals",
      })),
    ],
    sourceId: input.withdrawalId,
    sourceType: WITHDRAWAL_SOURCE_TYPE,
  });
};

export const approveProviderBondWithdrawal = async ({
  approverUserId,
  database,
  input,
  now = new Date(),
}: {
  approverUserId: string;
  database: Database;
  input: ProviderBondWithdrawalApprovalInput;
  now?: Date;
}) => {
  const row = await findWithdrawal(database, input.withdrawalId);
  if (!row) {
    throw new ORPCError("NOT_FOUND", {
      message: "Provider Bond Withdrawal does not exist",
    });
  }
  if (["COMPLETED", "REJECTED"].includes(row.withdrawal.status)) {
    return getAdminWithdrawalView(database, input.withdrawalId);
  }
  if (row.withdrawal.status !== "PENDING_APPROVAL") {
    return throwConflict(
      "Chỉ Provider Bond Withdrawal đang chờ duyệt mới được quyết định"
    );
  }
  if (row.withdrawal.recordedByUserId === approverUserId) {
    throw new ORPCError("FORBIDDEN", {
      message:
        "Admin đã ghi nhận Bond decrease không thể tự phê duyệt withdrawal",
    });
  }
  if (input.decision === "REJECTED" && !input.reason?.trim()) {
    return throwBadRequest("Cần lý do khi từ chối Provider Bond Withdrawal");
  }

  await reconcileWithdrawalBondAdjustment({
    approverUserId,
    database,
    input,
    now,
    withdrawal: row.withdrawal,
  });

  await database.transaction((transaction) =>
    applyProviderBondWithdrawalDecision({
      approverUserId,
      database: transaction,
      input,
      now,
    })
  );

  return getAdminWithdrawalView(database, input.withdrawalId);
};
