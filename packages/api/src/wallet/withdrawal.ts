/* eslint-disable no-await-in-loop, react-doctor/async-await-in-loop */

import { db } from "@avin/db";
import { user } from "@avin/db/schema/auth";
import { escrowHold, order, orderItem } from "@avin/db/schema/commerce";
import { bankAccountSchema, sellerApplication } from "@avin/db/schema/seller";
import type { BankAccount } from "@avin/db/schema/seller";
import { sellerEnforcement } from "@avin/db/schema/seller-enforcement";
import {
  ledgerAccount,
  SELLER_WITHDRAWAL_MINIMUM_AMOUNT,
  withdrawalRequest,
} from "@avin/db/schema/wallet";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

import {
  createNotificationEvent,
  listNotificationRecipientsByRole,
} from "../notifications/notification";
import { isSellerEnforced } from "../seller-store/profile";
import type { WalletExecutor } from "./ledger";
import { recordBalancedLedgerTransaction } from "./ledger";
import {
  ensureSellerWalletAccounts,
  reverseLedgerTransactionInTransaction,
} from "./service";

export const WITHDRAWAL_MINIMUM_AMOUNT = SELLER_WITHDRAWAL_MINIMUM_AMOUNT;
export const WITHDRAWAL_IDEMPOTENCY_KEY_MAX_LENGTH = 128;
export const WITHDRAWAL_PAYMENT_REFERENCE_MAX_LENGTH = 255;
export const WITHDRAWAL_REJECTION_REASON_MAX_LENGTH = 500;

const WITHDRAWAL_REFERENCE_LENGTH = 24;
const SELLER_WITHDRAWAL_NOTIFICATION_PATH = "/seller/store?section=finance";

export type WithdrawalStatus =
  (typeof withdrawalRequest.status.enumValues)[number];

export type WithdrawalAction = "APPROVE" | "CANCEL" | "MARK_PAID" | "REJECT";

export interface SellerWalletSummaryView {
  availableBalance: number;
  heldBalance: number;
  pendingBalance: number;
}

export interface WithdrawalRequestView {
  amount: number;
  approvedAt: string | null;
  bankAccount: BankAccount;
  cancelledAt: string | null;
  createdAt: string;
  id: string;
  paidAt: string | null;
  paidTransactionId: string | null;
  paymentReference: string | null;
  rejectionReason: string | null;
  requestTransactionId: string;
  reversalTransactionId: string | null;
  sellerId: string;
  status: WithdrawalStatus;
  updatedAt: string;
}

export interface AdminWithdrawalRequestView {
  amount: number;
  bankAccount: BankAccount;
  createdAt: string;
  id: string;
  paymentReference: string | null;
  sellerEmail: string;
  sellerId: string;
  sellerImage: string | null;
  sellerName: string;
  status: WithdrawalStatus;
}

const createWithdrawalReference = (kind: "PAID" | "REQUEST"): string =>
  `AVTX-WITHDRAWAL-${kind}-${crypto
    .randomUUID()
    .replaceAll("-", "")
    .slice(0, WITHDRAWAL_REFERENCE_LENGTH)
    .toUpperCase()}`;

export const validateWithdrawalAmount = (amount: number): void => {
  if (!Number.isSafeInteger(amount) || amount < WITHDRAWAL_MINIMUM_AMOUNT) {
    throw new Error(
      `Withdrawal amount must be at least ${WITHDRAWAL_MINIMUM_AMOUNT} VND`
    );
  }
};

export const getWithdrawalStatusTransition = (
  status: WithdrawalStatus,
  action: WithdrawalAction
): WithdrawalStatus => {
  const nextStatus: Partial<
    Record<
      WithdrawalStatus,
      Partial<Record<WithdrawalAction, WithdrawalStatus>>
    >
  > = {
    APPROVED: {
      MARK_PAID: "PAID",
      REJECT: "REJECTED",
    },
    REQUESTED: {
      APPROVE: "APPROVED",
      CANCEL: "CANCELLED",
      REJECT: "REJECTED",
    },
  };
  const next = nextStatus[status]?.[action];
  if (!next) {
    throw new Error(`Withdrawal request cannot transition from ${status}`);
  }
  return next;
};

const toIso = (value: Date | null): string | null =>
  value?.toISOString() ?? null;

const mapWithdrawalRequest = (
  request: typeof withdrawalRequest.$inferSelect
): WithdrawalRequestView => ({
  amount: request.amount,
  approvedAt: toIso(request.approvedAt),
  bankAccount: request.bankAccount,
  cancelledAt: toIso(request.cancelledAt),
  createdAt: request.createdAt.toISOString(),
  id: request.id,
  paidAt: toIso(request.paidAt),
  paidTransactionId: request.paidTransactionId,
  paymentReference: request.paymentReference,
  rejectionReason: request.rejectionReason,
  requestTransactionId: request.requestTransactionId,
  reversalTransactionId: request.reversalTransactionId,
  sellerId: request.sellerId,
  status: request.status,
  updatedAt: request.updatedAt.toISOString(),
});

const mapAdminWithdrawalRequest = (
  request: typeof withdrawalRequest.$inferSelect,
  seller: {
    sellerEmail: string;
    sellerImage: string | null;
    sellerName: string;
  }
): AdminWithdrawalRequestView => ({
  amount: request.amount,
  bankAccount: {
    accountName: request.bankAccount.accountName,
    accountNumber: `**** ${request.bankAccount.accountNumber.slice(-4)}`,
    bankName: request.bankAccount.bankName,
  },
  createdAt: request.createdAt.toISOString(),
  id: request.id,
  paymentReference: request.paymentReference,
  sellerEmail: seller.sellerEmail,
  sellerId: request.sellerId,
  sellerImage: seller.sellerImage,
  sellerName: seller.sellerName,
  status: request.status,
});

const getSellerBankAccount = async (
  executor: WalletExecutor,
  sellerId: string
): Promise<BankAccount> => {
  const [application] = await executor
    .select({ bankAccount: sellerApplication.bankAccount })
    .from(sellerApplication)
    .where(
      and(
        eq(sellerApplication.userId, sellerId),
        eq(sellerApplication.status, "APPROVED")
      )
    )
    .orderBy(desc(sellerApplication.createdAt))
    .limit(1);

  const parsed = application?.bankAccount
    ? bankAccountSchema.safeParse(application.bankAccount)
    : null;
  if (!parsed?.success) {
    throw new ORPCError("CONFLICT", {
      message: "Tài khoản ngân hàng đã xác minh của Seller không khả dụng.",
    });
  }
  return parsed.data;
};

const assertSellerCanRequestWithdrawal = async (
  executor: WalletExecutor,
  sellerId: string,
  now: Date
): Promise<void> => {
  const [account] = await executor
    .select({
      role: user.role,
      sellerEnforcementExpiresAt: sellerEnforcement.expiresAt,
      sellerEnforcementState: sellerEnforcement.state,
    })
    .from(user)
    .leftJoin(sellerEnforcement, eq(sellerEnforcement.sellerId, user.id))
    .where(eq(user.id, sellerId))
    .for("update")
    .limit(1);

  if (!account || account.role !== "SELLER" || isSellerEnforced(account, now)) {
    throw new ORPCError("FORBIDDEN", {
      message: "Seller hiện không thể thực hiện thao tác rút tiền.",
    });
  }
};

const findWithdrawalRequest = async (
  executor: WalletExecutor,
  withdrawalRequestId: string,
  sellerId?: string
): Promise<typeof withdrawalRequest.$inferSelect | undefined> => {
  const conditions = [eq(withdrawalRequest.id, withdrawalRequestId)];
  if (sellerId) {
    conditions.push(eq(withdrawalRequest.sellerId, sellerId));
  }
  const [request] = await executor
    .select()
    .from(withdrawalRequest)
    .where(and(...conditions))
    .limit(1);
  return request;
};

export const getSellerWalletSummary = async (
  executor: WalletExecutor,
  sellerId: string
): Promise<SellerWalletSummaryView> => {
  const [accounts, pending] = await Promise.all([
    executor
      .select({
        accountType: ledgerAccount.accountType,
        balanceAmount: ledgerAccount.balanceAmount,
      })
      .from(ledgerAccount)
      .where(
        and(
          eq(ledgerAccount.userId, sellerId),
          inArray(ledgerAccount.accountType, [
            "SELLER_WALLET_AVAILABLE",
            "SELLER_WALLET_HELD",
          ])
        )
      ),
    executor
      .select({
        amount: sql<number>`coalesce(sum(${escrowHold.amount}), 0)`,
      })
      .from(escrowHold)
      .innerJoin(orderItem, eq(escrowHold.orderItemId, orderItem.id))
      .innerJoin(order, eq(orderItem.orderId, order.id))
      .where(and(eq(order.sellerId, sellerId), eq(escrowHold.status, "HELD"))),
  ]);

  const availableAccount = accounts.find(
    (account) => account.accountType === "SELLER_WALLET_AVAILABLE"
  );
  const heldAccount = accounts.find(
    (account) => account.accountType === "SELLER_WALLET_HELD"
  );

  return {
    availableBalance: availableAccount?.balanceAmount ?? 0,
    heldBalance: heldAccount?.balanceAmount ?? 0,
    pendingBalance: Number(pending[0]?.amount ?? 0),
  };
};

export const listSellerWithdrawalRequests = async (
  executor: WalletExecutor,
  sellerId: string
): Promise<WithdrawalRequestView[]> => {
  const requests = await executor
    .select()
    .from(withdrawalRequest)
    .where(eq(withdrawalRequest.sellerId, sellerId))
    .orderBy(desc(withdrawalRequest.createdAt), desc(withdrawalRequest.id));
  return requests.map(mapWithdrawalRequest);
};

export const listAdminWithdrawalRequests = async ({
  database = db,
  status,
}: {
  database?: typeof db;
  status?: WithdrawalStatus;
} = {}): Promise<AdminWithdrawalRequestView[]> => {
  const rows = await database
    .select({
      request: withdrawalRequest,
      sellerEmail: user.email,
      sellerImage: user.image,
      sellerName: user.name,
    })
    .from(withdrawalRequest)
    .innerJoin(user, eq(withdrawalRequest.sellerId, user.id))
    .where(status ? eq(withdrawalRequest.status, status) : undefined)
    .orderBy(desc(withdrawalRequest.createdAt), desc(withdrawalRequest.id));
  return rows.map((row) =>
    mapAdminWithdrawalRequest(row.request, {
      sellerEmail: row.sellerEmail,
      sellerImage: row.sellerImage,
      sellerName: row.sellerName,
    })
  );
};

export const getWithdrawalRequest = async ({
  database = db,
  sellerId,
  withdrawalRequestId,
}: {
  database?: typeof db;
  sellerId?: string;
  withdrawalRequestId: string;
}): Promise<WithdrawalRequestView> => {
  const request = await findWithdrawalRequest(
    database,
    withdrawalRequestId,
    sellerId
  );
  if (!request) {
    throw new ORPCError("NOT_FOUND", {
      message: "Yêu cầu rút tiền không tồn tại.",
    });
  }
  return mapWithdrawalRequest(request);
};

export const requestWithdrawal = ({
  amount,
  database = db,
  idempotencyKey,
  now = new Date(),
  sellerId,
}: {
  amount: number;
  database?: typeof db;
  idempotencyKey: string;
  now?: Date;
  sellerId: string;
}): Promise<WithdrawalRequestView> => {
  validateWithdrawalAmount(amount);
  const normalizedIdempotencyKey = idempotencyKey.trim();
  if (!normalizedIdempotencyKey) {
    throw new Error("Withdrawal idempotency key is required");
  }

  return database.transaction(async (transaction) => {
    await assertSellerCanRequestWithdrawal(transaction, sellerId, now);

    const [existingRequest] = await transaction
      .select()
      .from(withdrawalRequest)
      .where(
        and(
          eq(withdrawalRequest.sellerId, sellerId),
          eq(withdrawalRequest.idempotencyKey, normalizedIdempotencyKey)
        )
      )
      .limit(1);
    if (existingRequest) {
      if (existingRequest.amount !== amount) {
        throw new ORPCError("CONFLICT", {
          message: "Idempotency key đã được dùng cho một yêu cầu khác.",
        });
      }
      return mapWithdrawalRequest(existingRequest);
    }

    const [bankAccount, accounts] = await Promise.all([
      getSellerBankAccount(transaction, sellerId),
      ensureSellerWalletAccounts(transaction, sellerId),
    ]);
    const [availableAccount] = await transaction
      .select()
      .from(ledgerAccount)
      .where(eq(ledgerAccount.id, accounts.availableAccount.id))
      .for("update")
      .limit(1);
    if (!availableAccount || availableAccount.balanceAmount < amount) {
      throw new ORPCError("CONFLICT", {
        message: "Số dư Available Balance của Seller không đủ.",
      });
    }

    const requestTransaction = await recordBalancedLedgerTransaction(
      transaction,
      {
        amount,
        description: `WITHDRAWAL_REQUEST ${sellerId}`,
        postings: [
          {
            accountId: accounts.availableAccount.id,
            debitAmount: amount,
          },
          {
            accountId: accounts.heldAccount.id,
            creditAmount: amount,
          },
        ],
        reference: createWithdrawalReference("REQUEST"),
        type: "WITHDRAWAL_REQUEST",
      }
    );
    const [createdRequest] = await transaction
      .insert(withdrawalRequest)
      .values({
        amount,
        bankAccount,
        createdAt: now,
        idempotencyKey: normalizedIdempotencyKey,
        requestTransactionId: requestTransaction.id,
        sellerId,
        status: "REQUESTED",
        updatedAt: now,
      })
      .returning();
    if (!createdRequest) {
      throw new Error("Withdrawal request was not created");
    }
    await createNotificationEvent(transaction, {
      actorUserId: sellerId,
      body: `Yêu cầu rút ${amount.toLocaleString("vi-VN")} VND của bạn đã được gửi.`,
      context: { amount, withdrawalRequestId: createdRequest.id },
      email: {
        htmlBody: `<p>Yêu cầu rút ${amount.toLocaleString("vi-VN")} VND của bạn đã được gửi.</p>`,
        recipientUserIds: [sellerId],
        subject: "Avin: Yêu cầu rút tiền đã được gửi",
        textBody: `Yêu cầu rút ${amount.toLocaleString("vi-VN")} VND của bạn đã được gửi.`,
      },
      eventType: "transaction.withdrawal_requested",
      recipients: [
        { targetPath: SELLER_WITHDRAWAL_NOTIFICATION_PATH, userId: sellerId },
        ...(await listNotificationRecipientsByRole(transaction, {
          role: "ADMIN",
          targetPath: "/withdrawals",
        })),
      ],
      sourceId: createdRequest.id,
      sourceType: "WITHDRAWAL_REQUEST",
      title: "Yêu cầu rút tiền mới",
    });
    return mapWithdrawalRequest(createdRequest);
  });
};

export const cancelWithdrawalRequest = ({
  database = db,
  now = new Date(),
  sellerId,
  withdrawalRequestId,
}: {
  database?: typeof db;
  now?: Date;
  sellerId: string;
  withdrawalRequestId: string;
}): Promise<WithdrawalRequestView> =>
  database.transaction(async (transaction) => {
    const request = await findWithdrawalRequest(
      transaction,
      withdrawalRequestId,
      sellerId
    );
    if (!request) {
      throw new ORPCError("NOT_FOUND", {
        message: "Yêu cầu rút tiền không tồn tại.",
      });
    }
    if (request.status === "CANCELLED") {
      return mapWithdrawalRequest(request);
    }
    await assertSellerCanRequestWithdrawal(transaction, sellerId, now);
    getWithdrawalStatusTransition(request.status, "CANCEL");

    const reversal = await reverseLedgerTransactionInTransaction(transaction, {
      reason: `Withdrawal request ${request.id} cancelled`,
      transactionId: request.requestTransactionId,
    });
    const [updatedRequest] = await transaction
      .update(withdrawalRequest)
      .set({
        cancelledAt: now,
        reversalTransactionId: reversal.reversalId,
        status: "CANCELLED",
        updatedAt: now,
      })
      .where(
        and(
          eq(withdrawalRequest.id, withdrawalRequestId),
          eq(withdrawalRequest.status, "REQUESTED")
        )
      )
      .returning();
    if (!updatedRequest) {
      throw new ORPCError("CONFLICT", {
        message: "Yêu cầu rút tiền vừa được xử lý bởi request khác.",
      });
    }
    await createNotificationEvent(transaction, {
      actorUserId: sellerId,
      body: "Số dư giữ cho yêu cầu rút tiền đã được hoàn lại.",
      context: {
        amount: updatedRequest.amount,
        withdrawalRequestId: updatedRequest.id,
      },
      email: {
        htmlBody: "<p>Số dư giữ cho yêu cầu rút tiền đã được hoàn lại.</p>",
        recipientUserIds: [updatedRequest.sellerId],
        subject: "Avin: Đã hoàn lại số dư rút tiền",
        textBody: "Số dư giữ cho yêu cầu rút tiền đã được hoàn lại.",
      },
      eventType: "transaction.reversal_committed",
      recipients: [
        {
          targetPath: SELLER_WITHDRAWAL_NOTIFICATION_PATH,
          userId: updatedRequest.sellerId,
        },
        ...(await listNotificationRecipientsByRole(transaction, {
          role: "ADMIN",
          targetPath: "/withdrawals",
        })),
      ],
      sourceId: reversal.reversalId,
      sourceType: "LEDGER_TRANSACTION",
      title: "Đã hoàn lại số dư rút tiền",
    });
    return mapWithdrawalRequest(updatedRequest);
  });

export const approveWithdrawalRequest = ({
  adminUserId,
  database = db,
  now = new Date(),
  withdrawalRequestId,
}: {
  adminUserId: string;
  database?: typeof db;
  now?: Date;
  withdrawalRequestId: string;
}): Promise<WithdrawalRequestView> =>
  database.transaction(async (transaction) => {
    const request = await findWithdrawalRequest(
      transaction,
      withdrawalRequestId
    );
    if (!request) {
      throw new ORPCError("NOT_FOUND", {
        message: "Yêu cầu rút tiền không tồn tại.",
      });
    }
    if (request.status === "APPROVED") {
      return mapWithdrawalRequest(request);
    }
    await assertSellerCanRequestWithdrawal(transaction, request.sellerId, now);
    getWithdrawalStatusTransition(request.status, "APPROVE");
    const [updatedRequest] = await transaction
      .update(withdrawalRequest)
      .set({
        approvedAt: now,
        approvedByUserId: adminUserId,
        status: "APPROVED",
        updatedAt: now,
      })
      .where(
        and(
          eq(withdrawalRequest.id, withdrawalRequestId),
          eq(withdrawalRequest.status, "REQUESTED")
        )
      )
      .returning();
    if (!updatedRequest) {
      throw new ORPCError("CONFLICT", {
        message: "Yêu cầu rút tiền vừa được xử lý bởi Admin khác.",
      });
    }
    await createNotificationEvent(transaction, {
      actorUserId: adminUserId,
      body: "Yêu cầu rút tiền của bạn đã được duyệt.",
      context: {
        amount: updatedRequest.amount,
        withdrawalRequestId: updatedRequest.id,
      },
      eventType: "transaction.withdrawal_approved",
      recipients: [
        {
          targetPath: SELLER_WITHDRAWAL_NOTIFICATION_PATH,
          userId: updatedRequest.sellerId,
        },
        ...(await listNotificationRecipientsByRole(transaction, {
          role: "ADMIN",
          targetPath: "/withdrawals",
        })),
      ],
      sourceId: updatedRequest.id,
      sourceType: "WITHDRAWAL_REQUEST",
      title: "Yêu cầu rút tiền đã được duyệt",
    });
    return mapWithdrawalRequest(updatedRequest);
  });

export const rejectWithdrawalRequest = ({
  adminUserId,
  database = db,
  now = new Date(),
  reason,
  withdrawalRequestId,
}: {
  adminUserId: string;
  database?: typeof db;
  now?: Date;
  reason: string;
  withdrawalRequestId: string;
}): Promise<WithdrawalRequestView> => {
  const normalizedReason = reason.trim();
  if (!normalizedReason) {
    throw new Error("Withdrawal rejection reason is required");
  }

  return database.transaction(async (transaction) => {
    const request = await findWithdrawalRequest(
      transaction,
      withdrawalRequestId
    );
    if (!request) {
      throw new ORPCError("NOT_FOUND", {
        message: "Yêu cầu rút tiền không tồn tại.",
      });
    }
    if (request.status === "REJECTED") {
      return mapWithdrawalRequest(request);
    }
    getWithdrawalStatusTransition(request.status, "REJECT");

    const reversal = await reverseLedgerTransactionInTransaction(transaction, {
      reason: normalizedReason,
      transactionId: request.requestTransactionId,
    });
    const [updatedRequest] = await transaction
      .update(withdrawalRequest)
      .set({
        rejectedAt: now,
        rejectedByUserId: adminUserId,
        rejectionReason: normalizedReason,
        reversalTransactionId: reversal.reversalId,
        status: "REJECTED",
        updatedAt: now,
      })
      .where(
        and(
          eq(withdrawalRequest.id, withdrawalRequestId),
          inArray(withdrawalRequest.status, ["REQUESTED", "APPROVED"])
        )
      )
      .returning();
    if (!updatedRequest) {
      throw new ORPCError("CONFLICT", {
        message: "Yêu cầu rút tiền vừa được xử lý bởi request khác.",
      });
    }
    await createNotificationEvent(transaction, {
      actorUserId: adminUserId,
      body: "Yêu cầu rút tiền của bạn đã bị từ chối; số dư đã được hoàn lại.",
      context: {
        amount: updatedRequest.amount,
        reversalTransactionId: reversal.reversalId,
        withdrawalRequestId: updatedRequest.id,
      },
      email: {
        htmlBody:
          "<p>Yêu cầu rút tiền của bạn đã bị từ chối; số dư đã được hoàn lại.</p>",
        recipientUserIds: [updatedRequest.sellerId],
        subject: "Avin: Yêu cầu rút tiền bị từ chối",
        textBody:
          "Yêu cầu rút tiền của bạn đã bị từ chối; số dư đã được hoàn lại.",
      },
      eventType: "transaction.withdrawal_rejected",
      recipients: [
        {
          targetPath: SELLER_WITHDRAWAL_NOTIFICATION_PATH,
          userId: updatedRequest.sellerId,
        },
        ...(await listNotificationRecipientsByRole(transaction, {
          role: "ADMIN",
          targetPath: "/withdrawals",
        })),
      ],
      sourceId: updatedRequest.id,
      sourceType: "WITHDRAWAL_REQUEST",
      title: "Yêu cầu rút tiền bị từ chối",
    });
    await createNotificationEvent(transaction, {
      actorUserId: adminUserId,
      body: "Số dư giữ cho yêu cầu rút tiền đã được hoàn lại.",
      context: {
        amount: updatedRequest.amount,
        withdrawalRequestId: updatedRequest.id,
      },
      eventType: "transaction.reversal_committed",
      recipients: [
        {
          targetPath: SELLER_WITHDRAWAL_NOTIFICATION_PATH,
          userId: updatedRequest.sellerId,
        },
        ...(await listNotificationRecipientsByRole(transaction, {
          role: "ADMIN",
          targetPath: "/withdrawals",
        })),
      ],
      sourceId: reversal.reversalId,
      sourceType: "LEDGER_TRANSACTION",
      title: "Đã hoàn lại số dư rút tiền",
    });
    return mapWithdrawalRequest(updatedRequest);
  });
};

export const markWithdrawalRequestPaid = ({
  adminUserId,
  database = db,
  now = new Date(),
  paymentReference,
  withdrawalRequestId,
}: {
  adminUserId: string;
  database?: typeof db;
  now?: Date;
  paymentReference: string;
  withdrawalRequestId: string;
}): Promise<WithdrawalRequestView> => {
  const normalizedPaymentReference = paymentReference.trim();
  if (!normalizedPaymentReference) {
    throw new Error("Withdrawal payment reference is required");
  }

  return database.transaction(async (transaction) => {
    const request = await findWithdrawalRequest(
      transaction,
      withdrawalRequestId
    );
    if (!request) {
      throw new ORPCError("NOT_FOUND", {
        message: "Yêu cầu rút tiền không tồn tại.",
      });
    }
    if (request.status === "PAID") {
      if (request.paymentReference !== normalizedPaymentReference) {
        throw new ORPCError("CONFLICT", {
          message: "Yêu cầu rút tiền đã được ghi nhận với reference khác.",
        });
      }
      return mapWithdrawalRequest(request);
    }
    await assertSellerCanRequestWithdrawal(transaction, request.sellerId, now);
    getWithdrawalStatusTransition(request.status, "MARK_PAID");

    const accounts = await ensureSellerWalletAccounts(
      transaction,
      request.sellerId
    );
    const [heldAccount] = await transaction
      .select()
      .from(ledgerAccount)
      .where(eq(ledgerAccount.id, accounts.heldAccount.id))
      .for("update")
      .limit(1);
    if (!heldAccount || heldAccount.balanceAmount < request.amount) {
      throw new ORPCError("CONFLICT", {
        message: "Số dư Held for Withdrawal của Seller không đủ.",
      });
    }

    const paidTransaction = await recordBalancedLedgerTransaction(transaction, {
      amount: request.amount,
      description: `WITHDRAWAL_PAID ${request.id}`,
      postings: [
        {
          accountId: accounts.heldAccount.id,
          debitAmount: request.amount,
        },
        {
          accountId: accounts.platformAccount.id,
          creditAmount: request.amount,
        },
      ],
      reference: normalizedPaymentReference,
      type: "WITHDRAWAL_PAID",
    });
    const [updatedRequest] = await transaction
      .update(withdrawalRequest)
      .set({
        paidAt: now,
        paidByUserId: adminUserId,
        paidTransactionId: paidTransaction.id,
        paymentReference: normalizedPaymentReference,
        status: "PAID",
        updatedAt: now,
      })
      .where(
        and(
          eq(withdrawalRequest.id, withdrawalRequestId),
          eq(withdrawalRequest.status, "APPROVED")
        )
      )
      .returning();
    if (!updatedRequest) {
      throw new ORPCError("CONFLICT", {
        message: "Yêu cầu rút tiền vừa được xử lý bởi Admin khác.",
      });
    }
    await createNotificationEvent(transaction, {
      actorUserId: adminUserId,
      body: "Yêu cầu rút tiền của bạn đã được đánh dấu là đã thanh toán.",
      context: {
        amount: updatedRequest.amount,
        withdrawalRequestId: updatedRequest.id,
      },
      email: {
        htmlBody:
          "<p>Yêu cầu rút tiền của bạn đã được đánh dấu là đã thanh toán.</p>",
        recipientUserIds: [updatedRequest.sellerId],
        subject: "Avin: Rút tiền đã được thanh toán",
        textBody: "Yêu cầu rút tiền của bạn đã được đánh dấu là đã thanh toán.",
      },
      eventType: "transaction.withdrawal_paid",
      recipients: [
        {
          targetPath: SELLER_WITHDRAWAL_NOTIFICATION_PATH,
          userId: updatedRequest.sellerId,
        },
        ...(await listNotificationRecipientsByRole(transaction, {
          role: "ADMIN",
          targetPath: "/withdrawals",
        })),
      ],
      sourceId: paidTransaction.id,
      sourceType: "LEDGER_TRANSACTION",
      title: "Rút tiền đã thanh toán",
    });
    return mapWithdrawalRequest(updatedRequest);
  });
};
