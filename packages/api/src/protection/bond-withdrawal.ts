import { z } from "zod";

export const providerBondWithdrawalStatuses = [
  "COOLING",
  "PENDING_APPROVAL",
  "COMPLETED",
  "REJECTED",
] as const;

export type ProviderBondWithdrawalStatus =
  (typeof providerBondWithdrawalStatuses)[number];

export const providerBondWithdrawalDecisions = [
  "APPROVED",
  "REJECTED",
] as const;

export type ProviderBondWithdrawalDecision =
  (typeof providerBondWithdrawalDecisions)[number];

export const PROVIDER_BOND_WITHDRAWAL_COOLING_DAYS = 30;

const requiredText = (max: number) => z.string().trim().min(1).max(max);

export const providerBondWithdrawalRequestInputSchema = z.object({
  reason: z.string().trim().max(2000).optional(),
});

export type ProviderBondWithdrawalRequestInput = z.infer<
  typeof providerBondWithdrawalRequestInputSchema
>;

export const providerBondWithdrawalIdInputSchema = z.object({
  withdrawalId: z.uuid(),
});

export const providerBondWithdrawalListInputSchema = z
  .object({
    status: z.enum(providerBondWithdrawalStatuses).optional(),
  })
  .optional();

export const providerBondWithdrawalRecordInputSchema =
  providerBondWithdrawalIdInputSchema.extend({
    externalActionReference: requiredText(500),
    privateEvidenceReference: requiredText(500),
    reason: requiredText(2000),
  });

export type ProviderBondWithdrawalRecordInput = z.infer<
  typeof providerBondWithdrawalRecordInputSchema
>;

export const providerBondWithdrawalApprovalInputSchema =
  providerBondWithdrawalIdInputSchema
    .extend({
      decision: z.enum(providerBondWithdrawalDecisions),
      reason: z.string().trim().max(2000).optional(),
    })
    .superRefine((input, context) => {
      if (input.decision === "REJECTED" && !input.reason) {
        context.addIssue({
          code: "custom",
          message: "A reason is required to reject a Provider Bond Withdrawal",
          path: ["reason"],
        });
      }
    });

export type ProviderBondWithdrawalApprovalInput = z.infer<
  typeof providerBondWithdrawalApprovalInputSchema
>;

export const providerBondWithdrawalStatusTransitions: Record<
  ProviderBondWithdrawalStatus,
  readonly ProviderBondWithdrawalStatus[]
> = {
  COMPLETED: [],
  COOLING: ["PENDING_APPROVAL"],
  PENDING_APPROVAL: ["COMPLETED", "REJECTED"],
  REJECTED: [],
};

export const assertProviderBondWithdrawalTransition = (
  current: ProviderBondWithdrawalStatus,
  next: ProviderBondWithdrawalStatus
): void => {
  if (!providerBondWithdrawalStatusTransitions[current].includes(next)) {
    throw new Error(
      `Provider Bond Withdrawal transition ${current} -> ${next} is not allowed`
    );
  }
};
