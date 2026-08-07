import {
  sepayPaymentEvent,
  withdrawalRequestStatus,
} from "@avin/db/schema/wallet";
import { env } from "@avin/env/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  auditedAdminProcedure,
  buyerProcedure,
  sellerProcedure,
} from "../access/procedures";
import { reconcileSePayEvent } from "./processor";
import {
  createDepositRequest,
  DEPOSIT_MINIMUM_AMOUNT,
  getDepositStatus,
  getWalletSummary,
  getWalletTransactions,
  reverseLedgerTransaction,
} from "./service";
import type { WalletBankConfiguration } from "./service";
import {
  approveWithdrawalRequest,
  cancelWithdrawalRequest,
  getSellerWalletSummary,
  getWithdrawalRequest,
  listAdminWithdrawalRequests,
  listSellerWithdrawalRequests,
  markWithdrawalRequestPaid,
  rejectWithdrawalRequest,
  requestWithdrawal,
  WITHDRAWAL_IDEMPOTENCY_KEY_MAX_LENGTH,
  WITHDRAWAL_MINIMUM_AMOUNT,
  WITHDRAWAL_PAYMENT_REFERENCE_MAX_LENGTH,
  WITHDRAWAL_REJECTION_REASON_MAX_LENGTH,
} from "./withdrawal";

const walletBankConfiguration: WalletBankConfiguration = {
  accountName: env.SEPAY_BANK_ACCOUNT_NAME ?? "",
  accountNumber: env.SEPAY_BANK_ACCOUNT ?? "",
  bank: env.SEPAY_BANK_CODE ?? "",
};

const createDepositRequestInput = z.object({
  amount: z.number().int().min(DEPOSIT_MINIMUM_AMOUNT),
});

const depositStatusInput = z.object({
  requestId: z.uuid(),
});

const transactionHistoryInput = z.object({
  cursor: z.string().optional(),
});

const reconciliationListInput = z.object({
  status: z
    .enum(["RECEIVED", "UNMATCHED", "CREDITED", "RECONCILED"])
    .optional(),
});

const reconciliationInput = z.object({
  depositRequestId: z.uuid(),
  eventId: z.uuid(),
});

const withdrawalRequestInput = z.object({
  amount: z.number().int().min(WITHDRAWAL_MINIMUM_AMOUNT),
  idempotencyKey: z
    .string()
    .trim()
    .min(1)
    .max(WITHDRAWAL_IDEMPOTENCY_KEY_MAX_LENGTH),
});

const withdrawalRequestIdInput = z.object({
  withdrawalRequestId: z.uuid(),
});

const withdrawalRejectInput = withdrawalRequestIdInput.extend({
  reason: z.string().trim().min(1).max(WITHDRAWAL_REJECTION_REASON_MAX_LENGTH),
});

const withdrawalPaymentInput = withdrawalRequestIdInput.extend({
  paymentReference: z
    .string()
    .trim()
    .min(1)
    .max(WITHDRAWAL_PAYMENT_REFERENCE_MAX_LENGTH),
});

const mapReconciliationEvent = (
  event: typeof sepayPaymentEvent.$inferSelect
) => ({
  accountNumber: event.accountNumber,
  amount: event.amount,
  bankReference: event.bankReference,
  content: event.content,
  currency: event.currency,
  depositRequestId: event.depositRequestId,
  failureReason: event.failureReason,
  gateway: event.gateway,
  id: event.id,
  paymentCode: event.paymentCode,
  processedAt: event.processedAt?.toISOString() ?? null,
  providerEventId: event.providerEventId,
  rawBody: event.rawBody,
  rawPayload: event.rawPayload,
  receivedAt: event.receivedAt.toISOString(),
  source: event.source,
  status: event.status,
  transactionAt: event.transactionAt.toISOString(),
  transferType: event.transferType,
});

export const walletRouter = {
  admin: {
    approveWithdrawal: auditedAdminProcedure("wallet.withdrawal.approve")
      .input(withdrawalRequestIdInput)
      .handler(({ context, input }) =>
        approveWithdrawalRequest({
          adminUserId: context.session.user.id,
          database: context.db,
          withdrawalRequestId: input.withdrawalRequestId,
        })
      ),

    getWithdrawal: adminProcedure
      .input(withdrawalRequestIdInput)
      .handler(({ context, input }) =>
        getWithdrawalRequest({
          database: context.db,
          withdrawalRequestId: input.withdrawalRequestId,
        })
      ),

    listReconciliation: adminProcedure
      .input(reconciliationListInput)
      .handler(async ({ context, input }) => {
        const events = await context.db
          .select()
          .from(sepayPaymentEvent)
          .where(
            input.status
              ? eq(sepayPaymentEvent.status, input.status)
              : undefined
          )
          .orderBy(desc(sepayPaymentEvent.receivedAt))
          .limit(100);

        return events.map(mapReconciliationEvent);
      }),

    listWithdrawals: adminProcedure
      .input(
        z
          .object({
            status: z.enum(withdrawalRequestStatus.enumValues).optional(),
          })
          .optional()
      )
      .handler(({ context, input }) =>
        listAdminWithdrawalRequests({
          database: context.db,
          status: input?.status,
        })
      ),

    markWithdrawalPaid: auditedAdminProcedure("wallet.withdrawal.markPaid")
      .input(withdrawalPaymentInput)
      .handler(({ context, input }) =>
        markWithdrawalRequestPaid({
          adminUserId: context.session.user.id,
          database: context.db,
          paymentReference: input.paymentReference,
          withdrawalRequestId: input.withdrawalRequestId,
        })
      ),

    reconcile: auditedAdminProcedure("wallet.deposit.reconcile")
      .input(reconciliationInput)
      .handler(({ context, input }) =>
        reconcileSePayEvent({
          adminUserId: context.session.user.id,
          database: context.db,
          depositRequestId: input.depositRequestId,
          eventId: input.eventId,
          receivingAccountNumber: env.SEPAY_BANK_ACCOUNT ?? "",
        })
      ),

    rejectWithdrawal: auditedAdminProcedure("wallet.withdrawal.reject")
      .input(withdrawalRejectInput)
      .handler(({ context, input }) =>
        rejectWithdrawalRequest({
          adminUserId: context.session.user.id,
          database: context.db,
          reason: input.reason,
          withdrawalRequestId: input.withdrawalRequestId,
        })
      ),

    reverseTransaction: auditedAdminProcedure("wallet.transaction.reverse")
      .input(
        z.object({
          reason: z.string().trim().min(1).max(500),
          transactionId: z.uuid(),
        })
      )
      .handler(({ context, input }) =>
        reverseLedgerTransaction({
          database: context.db,
          reason: input.reason,
          transactionId: input.transactionId,
        })
      ),
  },

  createDepositRequest: buyerProcedure
    .input(createDepositRequestInput)
    .handler(({ context, input }) =>
      createDepositRequest({
        amount: input.amount,
        bankConfiguration: walletBankConfiguration,
        database: context.db,
        userId: context.session.user.id,
      })
    ),

  getDepositStatus: buyerProcedure
    .input(depositStatusInput)
    .handler(({ context, input }) =>
      getDepositStatus(context.db, context.session.user.id, input.requestId)
    ),

  getSummary: buyerProcedure.handler(({ context }) =>
    getWalletSummary(context.db, context.session.user.id)
  ),

  getTransactions: buyerProcedure
    .input(transactionHistoryInput)
    .handler(({ context, input }) =>
      getWalletTransactions(context.db, context.session.user.id, input.cursor)
    ),

  seller: {
    cancelWithdrawal: sellerProcedure
      .input(withdrawalRequestIdInput)
      .handler(({ context, input }) =>
        cancelWithdrawalRequest({
          database: context.db,
          sellerId: context.session.user.id,
          withdrawalRequestId: input.withdrawalRequestId,
        })
      ),

    getSummary: sellerProcedure.handler(({ context }) =>
      getSellerWalletSummary(context.db, context.session.user.id)
    ),

    getWithdrawal: sellerProcedure
      .input(withdrawalRequestIdInput)
      .handler(({ context, input }) =>
        getWithdrawalRequest({
          database: context.db,
          sellerId: context.session.user.id,
          withdrawalRequestId: input.withdrawalRequestId,
        })
      ),

    listWithdrawals: sellerProcedure.handler(({ context }) =>
      listSellerWithdrawalRequests(context.db, context.session.user.id)
    ),

    requestWithdrawal: sellerProcedure
      .input(withdrawalRequestInput)
      .handler(({ context, input }) =>
        requestWithdrawal({
          amount: input.amount,
          database: context.db,
          idempotencyKey: input.idempotencyKey,
          sellerId: context.session.user.id,
        })
      ),
  },
};
