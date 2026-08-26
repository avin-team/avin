import {
  protectionProviderApplication,
  protectionProviderBondAccount,
  protectionProviderBondAdjustment,
  protectionProviderDepositIntent,
  protectionProviderProfile,
  protectionProviderProfileVersion,
  protectionPolicyVersion,
} from "@avin/db/schema/protection";
import { sepayPaymentEvent } from "@avin/db/schema/wallet";
import { env } from "@avin/env/server";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, inArray, lte } from "drizzle-orm";

import {
  createNotificationEvent,
  listNotificationRecipientsByRole,
} from "../notifications/notification";
import type { Context } from "../runtime/context";
import { buildVietQrUrl, generatePaymentCode } from "../wallet/sepay";
import type { NormalizedSePayEvent } from "../wallet/sepay";
import {
  PROVIDER_BOND_MINIMUM_AMOUNT,
  PROVIDER_DEPOSIT_INTENT_TTL_MS,
} from "./provider-deposit-intent";
import {
  calculateRecommendedTransactionLimit,
  getProviderTier,
} from "./provider-tier";

type Database = Context["db"];
type ProviderDepositIntent =
  typeof protectionProviderDepositIntent.$inferSelect;

const providerDepositIntentStatuses = [
  "PENDING",
  "MATCHED",
  "MANUAL_REVIEW",
  "REFUND_PENDING",
] as const;

const toView = (intent: ProviderDepositIntent) => ({
  amount: intent.amount,
  applicationId: intent.applicationId,
  expiresAt: intent.expiresAt.toISOString(),
  id: intent.id,
  kind: intent.kind,
  matchedAmount: intent.matchedAmount,
  matchedAt: intent.matchedAt?.toISOString() ?? null,
  paymentCode: intent.paymentCode,
  profileId: intent.profileId,
  providerUserId: intent.providerUserId,
  qrUrl:
    env.SEPAY_BANK_ACCOUNT && env.SEPAY_BANK_CODE && env.SEPAY_BANK_ACCOUNT_NAME
      ? buildVietQrUrl({
          accountName: env.SEPAY_BANK_ACCOUNT_NAME,
          accountNumber: env.SEPAY_BANK_ACCOUNT,
          amount: intent.amount,
          bank: env.SEPAY_BANK_CODE,
          paymentCode: intent.paymentCode,
        })
      : null,
  status: intent.status,
});

const findCurrentPolicy = async (database: Database, now: Date) => {
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

const expirePendingIntent = async (
  database: Database,
  intent: ProviderDepositIntent,
  now: Date
): Promise<ProviderDepositIntent> => {
  if (intent.status !== "PENDING" || intent.expiresAt > now) {
    return intent;
  }
  const [expired] = await database
    .update(protectionProviderDepositIntent)
    .set({ status: "EXPIRED", updatedAt: now })
    .where(
      and(
        eq(protectionProviderDepositIntent.id, intent.id),
        eq(protectionProviderDepositIntent.status, "PENDING")
      )
    )
    .returning();
  return expired ?? { ...intent, status: "EXPIRED", updatedAt: now };
};

const findActiveIntent = async ({
  applicationId,
  database,
  kind,
  now,
  profileId,
}: {
  applicationId?: string;
  database: Database;
  kind: "APPLICATION" | "TOP_UP";
  now: Date;
  profileId?: string;
}): Promise<ProviderDepositIntent | null> => {
  const conditions = [
    inArray(
      protectionProviderDepositIntent.status,
      providerDepositIntentStatuses
    ),
    eq(protectionProviderDepositIntent.kind, kind),
    applicationId
      ? eq(protectionProviderDepositIntent.applicationId, applicationId)
      : eq(protectionProviderDepositIntent.profileId, profileId ?? ""),
  ];
  const [intent] = await database
    .select()
    .from(protectionProviderDepositIntent)
    .where(and(...conditions))
    .orderBy(desc(protectionProviderDepositIntent.createdAt))
    .limit(1);
  if (!intent) {
    return null;
  }
  return expirePendingIntent(database, intent, now);
};

const createIntent = async ({
  amount,
  applicationId,
  database,
  kind,
  now,
  profileId,
  providerUserId,
}: {
  amount: number;
  applicationId?: string;
  database: Database;
  kind: "APPLICATION" | "TOP_UP";
  now: Date;
  profileId?: string;
  providerUserId: string;
}) => {
  if (amount < PROVIDER_BOND_MINIMUM_AMOUNT) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Provider Bond tối thiểu là 1.000.000 VND.",
    });
  }
  const policy = await findCurrentPolicy(database, now);
  if (!policy) {
    throw new ORPCError("CONFLICT", {
      message: "Chưa có phiên bản chính sách Provider đang hiệu lực.",
    });
  }

  const existing = await findActiveIntent({
    applicationId,
    database,
    kind,
    now,
    profileId,
  });
  if (existing?.status === "MATCHED") {
    if (existing.amount === amount) {
      return toView(existing);
    }
    throw new ORPCError("CONFLICT", {
      message:
        "Lệnh Bond đã được đối soát với số tiền khác. Không thể đổi số tiền trong hồ sơ hiện tại.",
    });
  }
  if (existing?.status === "PENDING") {
    if (existing.amount === amount) {
      return toView(existing);
    }
    await database
      .update(protectionProviderDepositIntent)
      .set({
        manualReason: "replaced_by_new_amount",
        status: "EXPIRED",
        updatedAt: now,
      })
      .where(
        and(
          eq(protectionProviderDepositIntent.id, existing.id),
          eq(protectionProviderDepositIntent.status, "PENDING")
        )
      );
  }
  if (
    existing &&
    ["MANUAL_REVIEW", "REFUND_PENDING"].includes(existing.status)
  ) {
    if (existing.amount === amount) {
      return toView(existing);
    }
    throw new ORPCError("CONFLICT", {
      message:
        "Lệnh chuyển khoản hiện tại đang chờ Admin xử lý; không thể tạo lệnh mới với số tiền khác.",
    });
  }

  const [created] = await database
    .insert(protectionProviderDepositIntent)
    .values({
      amount,
      applicationId: applicationId ?? null,
      expiresAt: new Date(now.getTime() + PROVIDER_DEPOSIT_INTENT_TTL_MS),
      kind,
      paymentCode: generatePaymentCode(),
      policyVersionId: policy.id,
      profileId: profileId ?? null,
      providerUserId,
      status: "PENDING",
    })
    .returning();
  if (!created) {
    throw new ORPCError("CONFLICT", {
      message: "Không thể tạo lệnh chuyển khoản Provider.",
    });
  }

  if (applicationId) {
    await database
      .update(protectionProviderApplication)
      .set({
        bondAmount: amount,
        policyVersion: policy.version,
        policyVersionId: policy.id,
        updatedAt: now,
      })
      .where(eq(protectionProviderApplication.id, applicationId));
  }

  return toView(created);
};

export const createProviderApplicationDepositIntent = async ({
  amount,
  database,
  providerUserId,
}: {
  amount: number;
  database: Database;
  providerUserId: string;
}) => {
  const application = await database
    .select({
      id: protectionProviderApplication.id,
      status: protectionProviderApplication.status,
    })
    .from(protectionProviderApplication)
    .where(eq(protectionProviderApplication.providerUserId, providerUserId))
    .limit(1);
  const [existing] = application;
  if (!existing) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Hãy lưu hồ sơ nháp trước khi tạo lệnh chuyển khoản.",
    });
  }
  if (!["DRAFT", "CHANGES_REQUESTED"].includes(existing.status)) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Hồ sơ hiện tại không thể tạo lệnh chuyển khoản mới.",
    });
  }
  return createIntent({
    amount,
    applicationId: existing.id,
    database,
    kind: "APPLICATION",
    now: new Date(),
    providerUserId,
  });
};

export const createProviderBondTopUpIntent = async ({
  amount,
  database,
  providerUserId,
}: {
  amount: number;
  database: Database;
  providerUserId: string;
}) => {
  const [profile] = await database
    .select({
      id: protectionProviderProfile.id,
      status: protectionProviderProfile.status,
    })
    .from(protectionProviderProfile)
    .where(eq(protectionProviderProfile.providerUserId, providerUserId))
    .limit(1);
  if (!profile || profile.status !== "ACTIVE") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Chỉ Provider đang hoạt động mới được nạp thêm Bond.",
    });
  }
  return createIntent({
    amount,
    database,
    kind: "TOP_UP",
    now: new Date(),
    profileId: profile.id,
    providerUserId,
  });
};

export const getProviderDepositIntent = async ({
  database,
  providerUserId,
}: {
  database: Database;
  providerUserId: string;
}) => {
  const [intent] = await database
    .select()
    .from(protectionProviderDepositIntent)
    .where(eq(protectionProviderDepositIntent.providerUserId, providerUserId))
    .orderBy(desc(protectionProviderDepositIntent.createdAt))
    .limit(1);
  return intent
    ? toView(await expirePendingIntent(database, intent, new Date()))
    : null;
};

const toAdminView = (intent: ProviderDepositIntent) => ({
  ...toView(intent),
  createdAt: intent.createdAt.toISOString(),
  manualReason: intent.manualReason,
  matchedEventId: intent.matchedEventId,
  matchedSourceEventIds: intent.matchedSourceEventIds,
  refundBankReference: intent.refundBankReference,
  refundDestination: intent.refundDestination,
  refundedAt: intent.refundedAt?.toISOString() ?? null,
  updatedAt: intent.updatedAt.toISOString(),
});

export const listProviderDepositIntentsForAdmin = async (
  database: Database,
  input?: { status?: ProviderDepositIntent["status"] }
) => {
  const rows = input?.status
    ? await database
        .select()
        .from(protectionProviderDepositIntent)
        .where(eq(protectionProviderDepositIntent.status, input.status))
        .orderBy(desc(protectionProviderDepositIntent.createdAt))
    : await database
        .select()
        .from(protectionProviderDepositIntent)
        .orderBy(desc(protectionProviderDepositIntent.createdAt));
  return rows.map(toAdminView);
};

const resolveRefundDestination = async (
  database: Database,
  intent: ProviderDepositIntent
): Promise<string> => {
  if (!intent.applicationId) {
    return "PRIMARY_BANK_ACCOUNT";
  }
  const [application] = await database
    .select({
      registeredBankAccounts:
        protectionProviderApplication.registeredBankAccounts,
    })
    .from(protectionProviderApplication)
    .where(eq(protectionProviderApplication.id, intent.applicationId))
    .limit(1);
  const primary = application?.registeredBankAccounts?.find(
    (account) => account.isPrimary
  );
  return primary
    ? `${primary.bankCode}:${primary.accountNumber}:${primary.accountName}`
    : "PRIMARY_BANK_ACCOUNT";
};

interface ManualDepositDecisionInput {
  decision: "MATCH" | "REFUND";
  id: string;
  matchedAmount?: number;
  reason: string;
  refundBankReference?: string;
  refundDestination?: string;
  sourceEventIds?: string[];
}

const refundProviderDepositIntent = async ({
  database,
  input,
  intent,
  now,
}: {
  database: Database;
  input: ManualDepositDecisionInput;
  intent: ProviderDepositIntent;
  now: Date;
}) => {
  if (intent.kind === "TOP_UP") {
    throw new ORPCError("BAD_REQUEST", {
      message:
        "Khoản top-up phải dùng quy trình rút Bond; không hoàn trực tiếp từ hàng đợi đối soát.",
    });
  }
  if (intent.status === "REFUNDED") {
    throw new ORPCError("CONFLICT", {
      message: "Provider deposit intent đã được hoàn tiền.",
    });
  }
  const refundBankReference = input.refundBankReference?.trim();
  if (!refundBankReference) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Cần external bank reference khi xác nhận đã hoàn Bond.",
    });
  }
  const refundDestination =
    input.refundDestination?.trim() ||
    (await resolveRefundDestination(database, intent));
  const [refunded] = await database
    .update(protectionProviderDepositIntent)
    .set({
      manualReason: input.reason,
      refundBankReference,
      refundDestination,
      refundedAt: now,
      status: "REFUNDED",
      updatedAt: now,
    })
    .where(
      and(
        eq(protectionProviderDepositIntent.id, intent.id),
        inArray(protectionProviderDepositIntent.status, [
          "PENDING",
          "MANUAL_REVIEW",
          "EXPIRED",
          "REFUND_PENDING",
        ])
      )
    )
    .returning();
  if (!refunded) {
    throw new ORPCError("CONFLICT", {
      message: "Provider deposit intent đã thay đổi; hãy tải lại hàng đợi.",
    });
  }
  return toAdminView(refunded);
};

const resolveManualMatchedAmount = async ({
  database,
  input,
  intent,
}: {
  database: Database;
  input: ManualDepositDecisionInput;
  intent: ProviderDepositIntent;
}): Promise<{ amount: number; sourceEventIds: string[] }> => {
  const sourceEventIds = [...new Set(input.sourceEventIds)];
  let amount = input.matchedAmount ?? intent.amount;
  if (sourceEventIds.length === 0) {
    return { amount, sourceEventIds };
  }
  const sourceEvents = await database
    .select()
    .from(sepayPaymentEvent)
    .where(inArray(sepayPaymentEvent.id, sourceEventIds))
    .for("update");
  if (sourceEvents.length !== sourceEventIds.length) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Một hoặc nhiều SePay source event không tồn tại.",
    });
  }
  for (const sourceEvent of sourceEvents) {
    if (
      sourceEvent.transferType !== "in" ||
      sourceEvent.status === "CREDITED" ||
      sourceEvent.ledgerTransactionId ||
      (sourceEvent.providerDepositIntentId &&
        sourceEvent.providerDepositIntentId !== intent.id)
    ) {
      throw new ORPCError("CONFLICT", {
        message:
          "Source event đã được dùng cho wallet hoặc Provider Deposit Intent khác.",
      });
    }
  }
  const sourceTotal = sourceEvents.reduce(
    (total, sourceEvent) => total + sourceEvent.amount,
    0
  );
  if (
    input.matchedAmount !== undefined &&
    input.matchedAmount !== sourceTotal
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Matched amount phải bằng tổng các source event.",
    });
  }
  amount = sourceTotal;
  return { amount, sourceEventIds };
};

const assertApplicationCanBeMatched = async (
  database: Database,
  intent: ProviderDepositIntent
): Promise<void> => {
  if (intent.kind !== "APPLICATION" || !intent.applicationId) {
    return;
  }
  const [application] = await database
    .select({ status: protectionProviderApplication.status })
    .from(protectionProviderApplication)
    .where(eq(protectionProviderApplication.id, intent.applicationId))
    .limit(1);
  if (application?.status === "APPROVED") {
    throw new ORPCError("CONFLICT", {
      message: "Hồ sơ Provider đã duyệt không thể đối soát lại tiền đăng ký.",
    });
  }
};

export const decideProviderDepositIntentManually = ({
  database,
  input,
  reviewerUserId,
}: {
  database: Database;
  input: ManualDepositDecisionInput;
  reviewerUserId: string;
}) => {
  const now = new Date();
  return database.transaction(async (transaction) => {
    const [intent] = await transaction
      .select()
      .from(protectionProviderDepositIntent)
      .where(eq(protectionProviderDepositIntent.id, input.id))
      .for("update")
      .limit(1);
    if (!intent) {
      throw new ORPCError("NOT_FOUND", {
        message: "Provider deposit intent does not exist.",
      });
    }

    if (input.decision === "REFUND") {
      return refundProviderDepositIntent({
        database: transaction,
        input,
        intent,
        now,
      });
    }
    if (!["PENDING", "MANUAL_REVIEW", "EXPIRED"].includes(intent.status)) {
      throw new ORPCError("CONFLICT", {
        message:
          "Provider deposit intent không còn ở trạng thái có thể đối soát.",
      });
    }
    const { amount, sourceEventIds } = await resolveManualMatchedAmount({
      database: transaction,
      input,
      intent,
    });
    if (amount < PROVIDER_BOND_MINIMUM_AMOUNT) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Tổng Bond được đối soát phải đạt tối thiểu 1.000.000 VND.",
      });
    }
    await assertApplicationCanBeMatched(transaction, intent);
    const manualEventId = `manual:${reviewerUserId}:${intent.id}:${now.getTime()}`;
    const [matched] = await transaction
      .update(protectionProviderDepositIntent)
      .set({
        manualReason: input.reason,
        matchedAmount: amount,
        matchedAt: now,
        matchedEventId: manualEventId,
        matchedSourceEventIds: sourceEventIds,
        status: "MATCHED",
        updatedAt: now,
      })
      .where(
        and(
          eq(protectionProviderDepositIntent.id, intent.id),
          inArray(protectionProviderDepositIntent.status, [
            "PENDING",
            "MANUAL_REVIEW",
            "EXPIRED",
          ])
        )
      )
      .returning();
    if (!matched) {
      throw new ORPCError("CONFLICT", {
        message: "Provider deposit intent đã thay đổi; hãy tải lại hàng đợi.",
      });
    }
    if (sourceEventIds.length > 0) {
      await transaction
        .update(sepayPaymentEvent)
        .set({
          processedAt: now,
          providerDepositIntentId: intent.id,
          reconciledByUserId: reviewerUserId,
          status: "RECONCILED",
        })
        .where(inArray(sepayPaymentEvent.id, sourceEventIds));
    }
    // oxlint-disable-next-line no-use-before-define
    await applyMatchedProviderDeposit({
      amount,
      database: transaction,
      eventId: manualEventId,
      intent,
      now,
      recordedByUserId: reviewerUserId,
    });
    return toAdminView(matched);
  });
};

const isExactIncomingMatch = ({
  event,
  intent,
  now,
  receivingAccountNumber,
}: {
  event: NormalizedSePayEvent;
  intent: ProviderDepositIntent;
  now: Date;
  receivingAccountNumber: string;
}): string | null => {
  if (event.accountNumber !== receivingAccountNumber) {
    return "receiving_account_mismatch";
  }
  if (event.transferType !== "in") {
    return "not_an_incoming_transfer";
  }
  if (event.currency !== "VND") {
    return "currency_mismatch";
  }
  if (intent.status !== "PENDING") {
    return "deposit_intent_already_processed";
  }
  if (intent.expiresAt <= now) {
    return "deposit_intent_expired";
  }
  if (!event.paymentCode || event.paymentCode !== intent.paymentCode) {
    return "payment_code_mismatch";
  }
  if (event.amount !== intent.amount) {
    return "amount_mismatch";
  }
  return null;
};

const applyMatchedProviderDeposit = async ({
  database,
  intent,
  amount,
  eventId,
  bankReference,
  now,
  recordedByUserId,
}: {
  database: Database;
  intent: ProviderDepositIntent;
  amount: number;
  eventId: string;
  bankReference?: string;
  now: Date;
  recordedByUserId: string;
}): Promise<void> => {
  if (intent.kind === "APPLICATION" && intent.applicationId) {
    const [application] = await database
      .select({
        id: protectionProviderApplication.id,
        policyAcceptedAt: protectionProviderApplication.policyAcceptedAt,
        providerUserId: protectionProviderApplication.providerUserId,
        revisionCount: protectionProviderApplication.revisionCount,
        status: protectionProviderApplication.status,
      })
      .from(protectionProviderApplication)
      .where(eq(protectionProviderApplication.id, intent.applicationId))
      .limit(1);

    if (
      application &&
      ["DRAFT", "CHANGES_REQUESTED"].includes(application.status)
    ) {
      const nextRevisionCount =
        application.status === "CHANGES_REQUESTED"
          ? application.revisionCount + 1
          : application.revisionCount;

      await database
        .update(protectionProviderApplication)
        .set({
          bondAmount: amount,
          depositIntentId: intent.id,
          policyAcceptedAt: application.policyAcceptedAt ?? now,
          recognizedBondAmount: amount,
          reviewReason: null,
          revisionCount: nextRevisionCount,
          status: "PENDING_REVIEW",
          submittedAt: now,
          updatedAt: now,
        })
        .where(eq(protectionProviderApplication.id, intent.applicationId));

      await createNotificationEvent(database, {
        body: "Hồ sơ Đối tác Avin của bạn đã được gửi để xem xét sau khi xác nhận thanh toán.",
        context: {
          applicationId: application.id,
          revisionCount: nextRevisionCount,
        },
        email: {
          htmlBody:
            "<p>Hồ sơ Đối tác Avin của bạn đã được gửi để xem xét sau khi xác nhận thanh toán.</p>",
          recipientUserIds: [application.providerUserId],
          subject: "Avin Check: hồ sơ Provider đã được gửi",
          textBody:
            "Hồ sơ Đối tác Avin của bạn đã được gửi để xem xét sau khi xác nhận thanh toán.",
        },
        eventType: "protection_provider_application.submitted",
        recipients: [
          {
            targetPath: "/avin-check/workspace",
            userId: application.providerUserId,
          },
          ...(await listNotificationRecipientsByRole(database, {
            role: "ADMIN",
            targetPath: "/avin-check/providers",
          })),
        ],
        sourceId: `${application.id}:${nextRevisionCount}:submitted`,
        sourceType: "PROTECTION_PROVIDER_APPLICATION",
        title: "Hồ sơ Provider mới",
      });
      return;
    }

    await database
      .update(protectionProviderApplication)
      .set({
        bondAmount: amount,
        depositIntentId: intent.id,
        recognizedBondAmount: amount,
        updatedAt: now,
      })
      .where(eq(protectionProviderApplication.id, intent.applicationId));
    return;
  }

  if (intent.kind !== "TOP_UP" || !intent.profileId) {
    return;
  }

  const accountQuery = database
    .select()
    .from(protectionProviderBondAccount)
    .where(
      eq(protectionProviderBondAccount.providerProfileId, intent.profileId)
    )
    .for("update")
    .limit(1);
  const profileQuery = database
    .select()
    .from(protectionProviderProfile)
    .where(eq(protectionProviderProfile.id, intent.profileId))
    .for("update")
    .limit(1);
  const policyQuery = intent.policyVersionId
    ? database
        .select()
        .from(protectionPolicyVersion)
        .where(eq(protectionPolicyVersion.id, intent.policyVersionId))
        .limit(1)
    : Promise.resolve([]);
  const currentVersionQuery = database
    .select()
    .from(protectionProviderProfileVersion)
    .where(eq(protectionProviderProfileVersion.profileId, intent.profileId))
    .orderBy(desc(protectionProviderProfileVersion.versionNumber))
    .limit(1);
  const [[account], [profile], policyRows, [currentVersion]] =
    await Promise.all([
      accountQuery,
      profileQuery,
      policyQuery,
      currentVersionQuery,
    ]);
  const policy = policyRows[0] ?? null;
  if (!account || !profile || !currentVersion || !policy) {
    throw new ORPCError("CONFLICT", {
      message: "Provider Bond data is incomplete for top-up.",
    });
  }
  const recognizedAmount = account.recognizedAmount + amount;
  const tier = getProviderTier(recognizedAmount, policy);
  const recommendedTransactionLimit = calculateRecommendedTransactionLimit({
    percentage: policy.recommendedLimitPercentage,
    recognizedBondAmount: recognizedAmount,
    rounding: policy.recommendedLimitRounding,
  });
  await database
    .update(protectionProviderBondAccount)
    .set({ recognizedAmount, updatedAt: now })
    .where(eq(protectionProviderBondAccount.id, account.id));
  await database.insert(protectionProviderBondAdjustment).values({
    balanceAfter: recognizedAmount,
    balanceBefore: account.recognizedAmount,
    deltaAmount: amount,
    evidenceReference: eventId,
    externalBankReference: bankReference,
    idempotencyKey: `provider-deposit:${intent.id}:${eventId}`,
    kind: "DEPOSIT",
    profileId: profile.id,
    providerUserId: profile.providerUserId,
    reason: "Matched Provider Bond top-up",
    recordedByUserId,
    sourceId: intent.id,
    sourceType: "PROVIDER_DEPOSIT_INTENT",
    status: "APPLIED",
  });
  await database.insert(protectionProviderProfileVersion).values({
    displayName: currentVersion.displayName,
    location: currentVersion.location,
    officialChannels: currentVersion.officialChannels,
    policyVersionId: intent.policyVersionId,
    profileId: profile.id,
    profileSlug: profile.profileSlug,
    publishedAt: now,
    publishedByUserId: recordedByUserId,
    recognizedBondAmount: recognizedAmount,
    recommendedTransactionLimit,
    registeredBankAccounts: currentVersion.registeredBankAccounts,
    services: currentVersion.services,
    sourceApplicationId: profile.applicationId,
    status: profile.status,
    statusReason: profile.statusReason,
    tier,
    verifiedAt: now,
    versionNumber: currentVersion.versionNumber + 1,
  });
};

export const processProviderDepositEvent = async ({
  database,
  event,
  now,
  receivingAccountNumber,
}: {
  database: Database;
  event: NormalizedSePayEvent;
  now: Date;
  receivingAccountNumber: string;
}): Promise<null | { intentId: string; matched: boolean; reason?: string }> => {
  if (!event.paymentCode) {
    return null;
  }
  const [intent] = await database
    .select()
    .from(protectionProviderDepositIntent)
    .where(eq(protectionProviderDepositIntent.paymentCode, event.paymentCode))
    .for("update")
    .limit(1);
  if (!intent) {
    return null;
  }

  const mismatchReason = isExactIncomingMatch({
    event,
    intent,
    now,
    receivingAccountNumber,
  });
  if (mismatchReason) {
    await database
      .update(protectionProviderDepositIntent)
      .set({
        manualReason: mismatchReason,
        status: intent.status === "PENDING" ? "MANUAL_REVIEW" : intent.status,
        updatedAt: now,
      })
      .where(eq(protectionProviderDepositIntent.id, intent.id));
    return { intentId: intent.id, matched: false, reason: mismatchReason };
  }

  const [matched] = await database
    .update(protectionProviderDepositIntent)
    .set({
      matchedAmount: event.amount,
      matchedAt: now,
      matchedEventId: event.providerEventId,
      status: "MATCHED",
      updatedAt: now,
    })
    .where(
      and(
        eq(protectionProviderDepositIntent.id, intent.id),
        eq(protectionProviderDepositIntent.status, "PENDING")
      )
    )
    .returning();
  if (!matched) {
    return { intentId: intent.id, matched: false, reason: "concurrent_match" };
  }

  await applyMatchedProviderDeposit({
    amount: event.amount,
    bankReference: event.bankReference ?? undefined,
    database,
    eventId: event.providerEventId,
    intent,
    now,
    recordedByUserId: intent.providerUserId,
  });
  return { intentId: intent.id, matched: true };
};
