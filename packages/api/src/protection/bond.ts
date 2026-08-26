import { z } from "zod";

export const PROVIDER_BOND_MAXIMUM_VND = 1_000_000_000_000;

export const bondAdjustmentKinds = [
  "DEPOSIT",
  "WITHDRAWAL",
  "SUPPORT_ALLOCATION",
  "CORRECTION",
] as const;

export type BondAdjustmentKind = (typeof bondAdjustmentKinds)[number];

export const bondAdjustmentStatuses = [
  "APPLIED",
  "PENDING_APPROVAL",
  "REJECTED",
] as const;

export type BondAdjustmentStatus = (typeof bondAdjustmentStatuses)[number];

export const bondAdjustmentDecisions = ["APPROVED", "REJECTED"] as const;

export type BondAdjustmentDecision = (typeof bondAdjustmentDecisions)[number];

const boundedAmount = z
  .number()
  .int()
  .min(-PROVIDER_BOND_MAXIMUM_VND)
  .max(PROVIDER_BOND_MAXIMUM_VND);

const requiredText = (max: number) => z.string().trim().min(1).max(max);

export const providerBondAdjustmentRecordInputSchema = z
  .object({
    deltaAmount: boundedAmount,
    evidenceReference: z.string().trim().max(500).optional(),
    externalBankReference: z.string().trim().max(200).optional(),
    idempotencyKey: requiredText(128).min(16),
    kind: z.enum(bondAdjustmentKinds),
    profileId: z.uuid(),
    reason: requiredText(2000),
    sourceId: z.string().trim().max(200).optional(),
    sourceType: z.string().trim().max(100).optional(),
  })
  .superRefine((input, context) => {
    if (input.kind === "DEPOSIT" && input.deltaAmount <= 0) {
      context.addIssue({
        code: "custom",
        message: "A Bond deposit must increase recognized Bond",
        path: ["deltaAmount"],
      });
    }
    if (
      (input.kind === "WITHDRAWAL" || input.kind === "SUPPORT_ALLOCATION") &&
      input.deltaAmount >= 0
    ) {
      context.addIssue({
        code: "custom",
        message: "This Bond adjustment must decrease recognized Bond",
        path: ["deltaAmount"],
      });
    }
    if (input.kind === "CORRECTION" && input.deltaAmount === 0) {
      context.addIssue({
        code: "custom",
        message: "A Bond correction must change recognized Bond",
        path: ["deltaAmount"],
      });
    }
    if (input.deltaAmount > 0 && !input.externalBankReference?.trim()) {
      context.addIssue({
        code: "custom",
        message: "An external bank reference is required for a Bond increase",
        path: ["externalBankReference"],
      });
    }
    if (input.deltaAmount > 0 && !input.evidenceReference?.trim()) {
      context.addIssue({
        code: "custom",
        message: "Evidence is required for a Bond increase",
        path: ["evidenceReference"],
      });
    }
  });

export type ProviderBondAdjustmentRecordInput = z.infer<
  typeof providerBondAdjustmentRecordInputSchema
>;

export const providerBondAdjustmentApprovalInputSchema = z.object({
  adjustmentId: z.uuid(),
  decision: z.enum(bondAdjustmentDecisions),
  reason: z.string().trim().max(2000).optional(),
});

export type ProviderBondAdjustmentApprovalInput = z.infer<
  typeof providerBondAdjustmentApprovalInputSchema
>;

export const providerBondAdjustmentListInputSchema = z
  .object({
    profileId: z.uuid().optional(),
    status: z.enum(bondAdjustmentStatuses).optional(),
  })
  .optional();

export const providerBondProfileIdInputSchema = z.object({
  profileId: z.uuid(),
});

export const providerBondLimitInputSchema = z.object({
  profileId: z.uuid(),
  recommendedTransactionLimit: z
    .number()
    .int()
    .min(0)
    .max(PROVIDER_BOND_MAXIMUM_VND),
});

export type ProviderBondLimitInput = z.infer<
  typeof providerBondLimitInputSchema
>;

export const providerBondAdjustmentIdInputSchema = z.object({
  adjustmentId: z.uuid(),
});

const allowedAdjustmentTransitions: Record<
  BondAdjustmentStatus,
  readonly BondAdjustmentStatus[]
> = {
  APPLIED: [],
  PENDING_APPROVAL: ["APPLIED", "REJECTED"],
  REJECTED: [],
};

export const assertBondAdjustmentTransition = (
  current: BondAdjustmentStatus,
  next: BondAdjustmentStatus
): void => {
  if (!allowedAdjustmentTransitions[current].includes(next)) {
    throw new Error(
      `Bond adjustment transition ${current} -> ${next} is not allowed`
    );
  }
};

export const validateProviderBondAdjustmentRecord = (
  input: unknown
): ProviderBondAdjustmentRecordInput =>
  providerBondAdjustmentRecordInputSchema.parse(input);
