import { z } from "zod";

import { adminProcedure } from "../access/procedures";
import { retryEmailDelivery } from "../notifications/email-delivery";
import {
  getOverviewAnalytics,
  listAuditLogs,
  listDepositReconciliation,
  listEmailDeliveryHealth,
  listTransactions,
} from "./operations";

const listInput = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const operationsRouter = {
  auditLog: adminProcedure
    .input(
      listInput.extend({
        action: z.string().max(200).optional(),
        outcome: z.enum(["FAILURE", "SUCCESS"]).optional(),
        targetType: z.string().max(200).optional(),
      })
    )
    .handler(({ context, input }) =>
      listAuditLogs({ database: context.db, input })
    ),

  emailDelivery: adminProcedure
    .input(
      listInput.extend({
        status: z.enum(["failed", "pending", "retrying", "sent"]).optional(),
      })
    )
    .handler(({ context, input }) =>
      listEmailDeliveryHealth({ database: context.db, input })
    ),

  overviewAnalytics: adminProcedure
    .input(
      z.object({
        timeframe: z.enum(["7d", "30d"]).optional(),
      })
    )
    .handler(({ context, input }) =>
      getOverviewAnalytics({
        database: context.db,
        timeframe: input.timeframe,
      })
    ),

  reconciliation: adminProcedure
    .input(
      listInput.extend({
        status: z
          .enum(["CREDITED", "RECEIVED", "RECONCILED", "UNMATCHED"])
          .optional(),
      })
    )
    .handler(({ context, input }) =>
      listDepositReconciliation({ database: context.db, input })
    ),

  retryEmailDelivery: adminProcedure
    .input(z.object({ deliveryId: z.uuid() }))
    .handler(async ({ context, input }) => {
      const auditEvent = {
        action: "operations.email.retry",
        actorUserId: context.session.user.id,
        metadata: { purpose: "Retry terminal email delivery" },
        targetId: input.deliveryId,
        targetType: "EMAIL_DELIVERY",
      } as const;

      try {
        const result = await retryEmailDelivery({
          database: context.db,
          deliveryId: input.deliveryId,
        });
        await context.audit.record({ ...auditEvent, outcome: "SUCCESS" });
        return result;
      } catch (error) {
        await context.audit.record({ ...auditEvent, outcome: "FAILURE" });
        throw error;
      }
    }),

  transactions: adminProcedure
    .input(
      listInput.extend({
        type: z
          .enum([
            "DEPOSIT",
            "ESCROW_RELEASE",
            "PLATFORM_COMMISSION",
            "PURCHASE_HOLD",
            "REFUND",
            "REVERSAL",
            "SELLER_WALLET_MIGRATION",
            "WITHDRAWAL_PAID",
            "WITHDRAWAL_REQUEST",
          ])
          .optional(),
      })
    )
    .handler(({ context, input }) =>
      listTransactions({ database: context.db, input })
    ),
};
