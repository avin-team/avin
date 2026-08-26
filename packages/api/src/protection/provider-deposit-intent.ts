import { z } from "zod";

export const PROVIDER_BOND_MINIMUM_AMOUNT = 1_000_000;
export const PROVIDER_DEPOSIT_INTENT_TTL_MS = 24 * 60 * 60 * 1000;

export const providerDepositIntentCreateInputSchema = z.object({
  amount: z
    .number()
    .int()
    .min(PROVIDER_BOND_MINIMUM_AMOUNT)
    .max(1_000_000_000_000),
});

export const providerDepositIntentIdInputSchema = z.object({
  id: z.uuid(),
});

export const providerDepositIntentStatuses = [
  "PENDING",
  "MATCHED",
  "MANUAL_REVIEW",
  "EXPIRED",
  "REFUND_PENDING",
  "REFUNDED",
] as const;

export const providerDepositIntentAdminListInputSchema = z
  .object({
    status: z.enum(providerDepositIntentStatuses).optional(),
  })
  .optional();

export const providerDepositIntentManualDecisionInputSchema = z
  .object({
    decision: z.enum(["MATCH", "REFUND"]),
    id: z.uuid(),
    matchedAmount: z
      .number()
      .int()
      .min(PROVIDER_BOND_MINIMUM_AMOUNT)
      .max(1_000_000_000_000)
      .optional(),
    reason: z.string().trim().min(10).max(2000),
    refundBankReference: z.string().trim().min(1).max(200).optional(),
    refundDestination: z.string().trim().min(1).max(300).optional(),
    sourceEventIds: z.array(z.uuid()).max(50).default([]),
  })
  .superRefine((input, context) => {
    if (input.decision === "REFUND" && !input.refundBankReference) {
      context.addIssue({
        code: "custom",
        message: "Cần external bank reference khi xác nhận đã hoàn Bond",
        path: ["refundBankReference"],
      });
    }
  });

export type ProviderDepositIntentCreateInput = z.infer<
  typeof providerDepositIntentCreateInputSchema
>;

export type ProviderDepositIntentStatus =
  (typeof providerDepositIntentStatuses)[number];
