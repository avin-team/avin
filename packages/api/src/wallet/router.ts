import { sepayPaymentEvent } from "@avin/db/schema/wallet";
import { env } from "@avin/env/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  auditedAdminProcedure,
  buyerProcedure,
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
};
