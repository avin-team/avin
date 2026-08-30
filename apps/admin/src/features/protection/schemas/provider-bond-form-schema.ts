import { z } from "zod";

const bondKinds = [
  "DEPOSIT",
  "WITHDRAWAL",
  "SUPPORT_ALLOCATION",
  "CORRECTION",
] as const;

const signedAmount = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập số tiền.")
  .refine((value) => {
    const amount = Number(value);
    return (
      Number.isInteger(amount) &&
      amount >= -1_000_000_000_000 &&
      amount <= 1_000_000_000_000
    );
  }, "Số tiền phải là số nguyên hợp lệ.");

export const providerBondAdjustmentFormSchema = z
  .object({
    amount: signedAmount,
    evidenceReference: z.string().trim().max(500),
    externalBankReference: z.string().trim().max(200),
    kind: z.enum(bondKinds),
    profileId: z.string().trim().min(1, "Vui lòng chọn Provider."),
    reason: z.string().trim().min(1, "Vui lòng nhập lý do.").max(2000),
  })
  .superRefine((value, context) => {
    const amount = Number(value.amount);
    let delta = amount;
    if (value.kind === "DEPOSIT") {
      delta = Math.abs(amount);
    } else if (value.kind !== "CORRECTION") {
      delta = -Math.abs(amount);
    }
    if (value.kind === "DEPOSIT" && delta <= 0) {
      context.addIssue({
        code: "custom",
        message: "Deposit phải làm tăng Bond.",
        path: ["amount"],
      });
    }
    if (
      (value.kind === "WITHDRAWAL" || value.kind === "SUPPORT_ALLOCATION") &&
      delta >= 0
    ) {
      context.addIssue({
        code: "custom",
        message: "Adjustment này phải làm giảm Bond.",
        path: ["amount"],
      });
    }
    if (value.kind === "CORRECTION" && delta === 0) {
      context.addIssue({
        code: "custom",
        message: "Correction phải thay đổi Bond.",
        path: ["amount"],
      });
    }
    if (delta > 0 && !value.externalBankReference) {
      context.addIssue({
        code: "custom",
        message: "Bond tăng cần external bank reference.",
        path: ["externalBankReference"],
      });
    }
    if (delta > 0 && !value.evidenceReference) {
      context.addIssue({
        code: "custom",
        message: "Bond tăng cần evidence reference.",
        path: ["evidenceReference"],
      });
    }
  });

export const providerDepositIntentDecisionFormSchema = z
  .object({
    decision: z.enum(["MATCH", "REFUND"]),
    matchedAmount: z.string().trim(),
    reason: z
      .string()
      .trim()
      .min(10, "Lý do phải có ít nhất 10 ký tự.")
      .max(2000),
    refundBankReference: z.string().trim().max(200),
    sourceEventIds: z.string().trim(),
  })
  .superRefine((value, context) => {
    if (value.decision === "REFUND" && !value.refundBankReference) {
      context.addIssue({
        code: "custom",
        message: "Cần external bank reference khi hoàn tiền.",
        path: ["refundBankReference"],
      });
    }
    if (value.matchedAmount) {
      const amount = Number(value.matchedAmount);
      if (
        !Number.isInteger(amount) ||
        amount < 1_000_000 ||
        amount > 1_000_000_000_000
      ) {
        context.addIssue({
          code: "custom",
          message: "Số tiền Bond đã nhận không hợp lệ.",
          path: ["matchedAmount"],
        });
      }
    }
    if (value.sourceEventIds) {
      const ids = value.sourceEventIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      if (
        ids.length > 50 ||
        ids.some((id) => !z.uuid().safeParse(id).success)
      ) {
        context.addIssue({
          code: "custom",
          message: "Source event IDs phải là UUID (tối đa 50).",
          path: ["sourceEventIds"],
        });
      }
    }
  });

export type ProviderBondAdjustmentFormValues = z.infer<
  typeof providerBondAdjustmentFormSchema
>;
