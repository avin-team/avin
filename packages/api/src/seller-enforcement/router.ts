import { z } from "zod";

import {
  adminProcedure,
  auditedAdminProcedure,
  sellerProcedure,
} from "../access/procedures";
import {
  changeSellerEnforcement,
  correctSellerEnforcementDecision,
  correctSellerEnforcementReason,
  getSellerEnforcementAppeal,
  getSellerEnforcementAppealEvidenceUrl,
  getEnforcementRemediationItems,
  getSellerEnforcementSellerAppeal,
  getSellerEnforcementSellerView,
  getSellerEnforcementView,
  listAdminSellers,
  listSellerEnforcementActions,
  listSellerEnforcementAppeals,
  listSellerEnforcementSellerAppeals,
  reviewSellerEnforcementAppeal,
  retrySellerEnforcementRemediation,
  SELLER_ENFORCEMENT_ADMIN_NOTE_MAX_LENGTH,
  SELLER_ENFORCEMENT_REASON_MAX_LENGTH,
  sellerEnforcementAppealCommandSchema,
  sellerEnforcementClearCommandSchema,
  sellerEnforcementCommandSchema,
  sellerEnforcementReasonCodeSchema,
  sellerEnforcementReasonCorrectionCommandSchema,
  submitSellerEnforcementAppeal,
} from "./service";

const sellerIdInput = z.object({ sellerId: z.string().trim().min(1) });

const appealReviewInput = z
  .object({
    adminNote: z
      .string()
      .trim()
      .max(SELLER_ENFORCEMENT_ADMIN_NOTE_MAX_LENGTH)
      .nullable()
      .optional(),
    appealId: z.uuid(),
    outcome: z.enum(["UNDER_REVIEW", "UPHELD", "OVERTURNED"]),
    outcomeReason: z.string().trim().max(SELLER_ENFORCEMENT_REASON_MAX_LENGTH),
    reasonCode: sellerEnforcementReasonCodeSchema,
  })
  .partial({ outcomeReason: true })
  .superRefine((input, context) => {
    if (!input.outcomeReason?.trim() && input.outcome !== "UNDER_REVIEW") {
      context.addIssue({
        code: "custom",
        message: "Appeal outcome reason is required",
        path: ["outcomeReason"],
      });
    }
  });

export const sellerEnforcementRouter = {
  admin: {
    appeals: adminProcedure
      .input(
        sellerIdInput.extend({
          limit: z.number().int().positive().max(100).optional(),
        })
      )
      .handler(({ context, input }) =>
        listSellerEnforcementAppeals(context.db, input.sellerId, input.limit)
      ),

    apply: auditedAdminProcedure("seller.enforcement.apply")
      .input(sellerEnforcementCommandSchema)
      .handler(({ context, input }) =>
        changeSellerEnforcement({
          actorUserId: context.session.user.id,
          adminNote: input.adminNote,
          confirmAffectedEscrowHolds: input.confirmAffectedEscrowHolds,
          confirmAffectedOrderItems: input.confirmAffectedOrderItems,
          confirmAffectedWithdrawals: input.confirmAffectedWithdrawals,
          database: context.db,
          expiresAt: input.expiresAt,
          idempotencyKey: input.idempotencyKey,
          nextState: input.state,
          reasonCode: input.reasonCode,
          sellerId: input.sellerId,
          sellerReason: input.sellerReason,
        })
      ),

    correctDecision: auditedAdminProcedure(
      "seller.enforcement.decision.correct"
    )
      .input(sellerEnforcementClearCommandSchema)
      .handler(({ context, input }) =>
        correctSellerEnforcementDecision({
          actorUserId: context.session.user.id,
          adminNote: input.adminNote,
          database: context.db,
          idempotencyKey: input.idempotencyKey,
          reasonCode: input.reasonCode,
          sellerId: input.sellerId,
          sellerReason: input.sellerReason,
        })
      ),

    correctReason: auditedAdminProcedure("seller.enforcement.reason.correct")
      .input(sellerEnforcementReasonCorrectionCommandSchema)
      .handler(({ context, input }) =>
        correctSellerEnforcementReason({
          actorUserId: context.session.user.id,
          adminNote: input.adminNote,
          database: context.db,
          idempotencyKey: input.idempotencyKey,
          reasonCode: input.reasonCode,
          sellerId: input.sellerId,
          sellerReason: input.sellerReason,
        })
      ),

    get: adminProcedure
      .input(sellerIdInput)
      .handler(({ context, input }) =>
        getSellerEnforcementView(context.db, input.sellerId)
      ),

    getAppeal: adminProcedure
      .input(z.object({ appealId: z.uuid() }))
      .handler(({ context, input }) =>
        getSellerEnforcementAppeal({
          appealId: input.appealId,
          database: context.db,
        })
      ),

    getAppealEvidenceUrl: adminProcedure
      .input(z.object({ appealId: z.uuid(), evidenceId: z.uuid() }))
      .handler(({ context, input }) =>
        getSellerEnforcementAppealEvidenceUrl({
          appealId: input.appealId,
          database: context.db,
          evidenceId: input.evidenceId,
        })
      ),

    history: adminProcedure
      .input(
        sellerIdInput.extend({
          limit: z.number().int().positive().max(100).optional(),
        })
      )
      .handler(({ context, input }) =>
        listSellerEnforcementActions(context.db, input.sellerId, input.limit)
      ),

    lift: auditedAdminProcedure("seller.enforcement.lift")
      .input(sellerEnforcementClearCommandSchema)
      .handler(({ context, input }) =>
        changeSellerEnforcement({
          actionType: "LIFT",
          actorUserId: context.session.user.id,
          adminNote: input.adminNote,
          database: context.db,
          idempotencyKey: input.idempotencyKey,
          nextState: "CLEAR",
          reasonCode: input.reasonCode,
          sellerId: input.sellerId,
          sellerReason: input.sellerReason,
        })
      ),

    listSellers: adminProcedure
      .input(
        z
          .object({
            search: z.string().trim().optional(),
            status: z.enum(["ALL", "ACTIVE", "SUSPENDED", "BANNED"]).optional(),
          })
          .optional()
      )
      .handler(({ context, input }) => listAdminSellers(context.db, input)),

    remediationItems: adminProcedure
      .input(z.object({ remediationId: z.uuid() }))
      .handler(({ context, input }) =>
        getEnforcementRemediationItems(context.db, input.remediationId)
      ),

    retryRemediation: auditedAdminProcedure(
      "seller.enforcement.remediation.retry"
    )
      .input(z.object({ remediationId: z.uuid() }))
      .handler(({ context, input }) =>
        retrySellerEnforcementRemediation({
          database: context.db,
          remediationId: input.remediationId,
        })
      ),

    reviewAppeal: auditedAdminProcedure("seller.enforcement.appeal.review")
      .input(appealReviewInput)
      .handler(({ context, input }) =>
        reviewSellerEnforcementAppeal({
          adminNote: input.adminNote,
          appealId: input.appealId,
          database: context.db,
          outcome: input.outcome,
          outcomeReason: input.outcomeReason,
          reasonCode: input.reasonCode,
          reviewerUserId: context.session.user.id,
        })
      ),
  },

  seller: {
    appeals: sellerProcedure
      .input(
        z
          .object({ limit: z.number().int().positive().max(100).optional() })
          .optional()
      )
      .handler(({ context, input }) =>
        listSellerEnforcementSellerAppeals(
          context.db,
          context.session.user.id,
          input?.limit
        )
      ),

    get: sellerProcedure.handler(({ context }) =>
      getSellerEnforcementSellerView(context.db, context.session.user.id)
    ),

    getAppeal: sellerProcedure
      .input(z.object({ appealId: z.uuid() }))
      .handler(({ context, input }) =>
        getSellerEnforcementSellerAppeal({
          appealId: input.appealId,
          database: context.db,
          sellerId: context.session.user.id,
        })
      ),

    getAppealEvidenceUrl: sellerProcedure
      .input(z.object({ appealId: z.uuid(), evidenceId: z.uuid() }))
      .handler(({ context, input }) =>
        getSellerEnforcementAppealEvidenceUrl({
          appealId: input.appealId,
          database: context.db,
          evidenceId: input.evidenceId,
          sellerId: context.session.user.id,
        })
      ),

    submitAppeal: sellerProcedure
      .input(sellerEnforcementAppealCommandSchema)
      .handler(({ context, input }) =>
        submitSellerEnforcementAppeal({
          actionId: input.actionId,
          database: context.db,
          evidence: input.evidence,
          idempotencyKey: input.idempotencyKey,
          sellerId: context.session.user.id,
          sellerReason: input.sellerReason,
        })
      ),
  },
};
