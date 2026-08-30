import { z } from "zod";

export const sellerEnforcementReasonCodeSchema = z.enum([
  "FINANCIAL_RISK",
  "FRAUD_RISK",
  "FULFILLMENT_RISK",
  "OTHER",
  "POLICY_VIOLATION",
]);

export const sellerEnforcementFormSchema = z.object({
  adminNote: z.string().trim().max(5000),
  confirmEscrowHolds: z.boolean(),
  confirmOrderItems: z.boolean(),
  confirmWithdrawals: z.boolean(),
  expiresAt: z.union([z.date(), z.undefined()]),
  reasonCode: sellerEnforcementReasonCodeSchema,
  sellerReason: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập lý do xử lý vi phạm.")
    .max(2000),
});

export const createSellerEnforcementFormSchema = (
  targetStatus: "ACTIVE" | "SUSPENDED" | "BANNED"
) =>
  sellerEnforcementFormSchema.superRefine((value, context) => {
    if (targetStatus !== "BANNED") {
      return;
    }

    for (const [field, label] of [
      ["confirmOrderItems", "đơn hàng"],
      ["confirmEscrowHolds", "khoản tiền tạm giữ"],
      ["confirmWithdrawals", "yêu cầu rút tiền"],
    ] as const) {
      if (!value[field]) {
        context.addIssue({
          code: "custom",
          message: `Vui lòng xác nhận xử lý ${label}.`,
          path: [field],
        });
      }
    }
  });

export const sellerEnforcementReasonCorrectionFormSchema = z.object({
  adminNote: z.string().trim().max(5000),
  reasonCode: sellerEnforcementReasonCodeSchema,
  sellerReason: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập lý do hiệu chỉnh.")
    .max(2000),
});

export const sellerAppealReviewFormSchema = z
  .object({
    adminNote: z.string().trim().max(5000),
    outcome: z.enum(["UNDER_REVIEW", "UPHELD", "OVERTURNED"]),
    outcomeReason: z.string().trim().max(2000),
    reasonCode: sellerEnforcementReasonCodeSchema,
  })
  .superRefine((value, context) => {
    if (value.outcome !== "UNDER_REVIEW" && !value.outcomeReason) {
      context.addIssue({
        code: "custom",
        message: "Vui lòng nhập lý do kết luận thẩm định.",
        path: ["outcomeReason"],
      });
    }
  });

export type SellerAppealReviewFormValues = z.infer<
  typeof sellerAppealReviewFormSchema
>;
export type SellerEnforcementFormValues = z.infer<
  typeof sellerEnforcementFormSchema
>;
export type SellerEnforcementReasonCorrectionFormValues = z.infer<
  typeof sellerEnforcementReasonCorrectionFormSchema
>;
