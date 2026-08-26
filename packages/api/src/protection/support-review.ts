import { z } from "zod";

export const supportReviewStatuses = [
  "ELIGIBILITY_REVIEW",
  "INELIGIBLE",
  "ELIGIBLE",
  "PENDING_APPROVAL",
  "APPROVED",
  "DECLINED",
] as const;

export type SupportReviewStatus = (typeof supportReviewStatuses)[number];

export const supportReviewPublicOutcomes = [
  "UNDER_VERIFICATION",
  "INELIGIBLE",
  "HANDLED_BY_PROVIDER",
  "HANDLED_BY_PROGRAM",
  "VIOLATION_CONFIRMED",
] as const;

export type SupportReviewPublicOutcome =
  (typeof supportReviewPublicOutcomes)[number];

export const supportTransactionChannels = [
  "FACEBOOK",
  "ZALO",
  "OTHER",
] as const;

export type SupportTransactionChannel =
  (typeof supportTransactionChannels)[number];

export const supportTransactionScopes = [
  "DIRECT",
  "IMPERSONATOR",
  "INDIRECT",
  "GDV",
  "WEBSITE_OPERATED",
  "AGENT_DEPOSIT",
  "LENDING",
  "LOWER_PRIORITY_GROUP",
  "OUT_OF_SCOPE",
] as const;

export type SupportTransactionScope = (typeof supportTransactionScopes)[number];

export const supportReviewReconsiderationBases = [
  "NEW_EVIDENCE",
  "PROCEDURAL_ERROR",
] as const;

export type SupportReviewReconsiderationBase =
  (typeof supportReviewReconsiderationBases)[number];

const requiredText = (max: number) => z.string().trim().min(1).max(max);

const isoDateTime = z.iso.datetime({ offset: true });

export const supportReviewStartInputSchema = z.object({
  incidentId: z.uuid(),
  reason: z.string().trim().max(2000).optional(),
});

export type SupportReviewStartInput = z.infer<
  typeof supportReviewStartInputSchema
>;

export const supportReviewIdInputSchema = z.object({
  reviewId: z.uuid(),
});

export const supportReviewListInputSchema = z
  .object({
    incidentId: z.uuid().optional(),
    profileId: z.uuid().optional(),
    status: z.enum(supportReviewStatuses).optional(),
  })
  .optional();

export const supportReviewEligibilityInputSchema = z.object({
  approvedServiceConfirmed: z.boolean(),
  evidenceSufficient: z.boolean(),
  preTransactionVideoPresent: z.boolean(),
  privateEvidenceReference: requiredText(500),
  providerIdentityConfirmed: z.boolean(),
  reason: requiredText(2000),
  registeredPaymentIdentityConfirmed: z.boolean(),
  requiredProcessCompleted: z.boolean(),
  reviewId: z.uuid(),
  transactionChannel: z.enum(supportTransactionChannels),
  transactionLawfulConfirmed: z.boolean(),
  transactionOccurredAt: isoDateTime,
  transactionProfileVersionId: z.uuid(),
  transactionScope: z.enum(supportTransactionScopes),
  verifiedActualLoss: z.number().int().min(0).max(2_000_000_000),
});

export type SupportReviewEligibilityInput = z.infer<
  typeof supportReviewEligibilityInputSchema
>;

export const supportReviewOutcomeInputSchema = z
  .object({
    externalActionReference: requiredText(500),
    privateEvidenceReference: requiredText(500),
    publicOutcome: z
      .enum(supportReviewPublicOutcomes)
      .refine(
        (outcome) => outcome !== "INELIGIBLE",
        "An eligible Support Review cannot use the INELIGIBLE outcome"
      ),
    reason: requiredText(2000),
    reviewId: z.uuid(),
    supportAmount: z.number().int().min(0).max(2_000_000_000).default(0),
  })
  .superRefine((input, context) => {
    if (
      input.supportAmount > 0 &&
      input.publicOutcome !== "HANDLED_BY_PROGRAM"
    ) {
      context.addIssue({
        code: "custom",
        message:
          "A Bond-backed Support Allocation must be recorded as handled by the program",
        path: ["publicOutcome"],
      });
    }
  });

export type SupportReviewOutcomeInput = z.infer<
  typeof supportReviewOutcomeInputSchema
>;

export const supportReviewDecisionInputSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().trim().max(2000).optional(),
  reviewId: z.uuid(),
});

export type SupportReviewDecisionInput = z.infer<
  typeof supportReviewDecisionInputSchema
>;

export const supportReviewReconsiderInputSchema = z
  .object({
    basis: z.enum(supportReviewReconsiderationBases),
    privateEvidenceReference: z.string().trim().max(500).optional(),
    reason: requiredText(2000),
    reviewId: z.uuid(),
  })
  .superRefine((input, context) => {
    if (
      input.basis === "NEW_EVIDENCE" &&
      !input.privateEvidenceReference?.trim()
    ) {
      context.addIssue({
        code: "custom",
        message: "New evidence is required for this reconsideration",
        path: ["privateEvidenceReference"],
      });
    }
  });

export type SupportReviewReconsiderInput = z.infer<
  typeof supportReviewReconsiderInputSchema
>;

export const supportReviewStatusTransitions: Record<
  SupportReviewStatus,
  readonly SupportReviewStatus[]
> = {
  APPROVED: [],
  DECLINED: ["ELIGIBILITY_REVIEW"],
  ELIGIBILITY_REVIEW: ["INELIGIBLE", "ELIGIBLE"],
  ELIGIBLE: ["PENDING_APPROVAL"],
  INELIGIBLE: ["ELIGIBILITY_REVIEW"],
  PENDING_APPROVAL: ["APPROVED", "DECLINED"],
};

export const assertSupportReviewTransition = (
  current: SupportReviewStatus,
  next: SupportReviewStatus
): void => {
  if (!supportReviewStatusTransitions[current].includes(next)) {
    throw new Error(
      `Support Review transition ${current} -> ${next} is not allowed`
    );
  }
};
