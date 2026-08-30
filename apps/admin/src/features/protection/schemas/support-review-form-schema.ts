import { z } from "zod";

const supportChannels = ["FACEBOOK", "ZALO", "OTHER"] as const;
const supportScopes = [
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
const supportOutcomes = [
  "HANDLED_BY_PROVIDER",
  "HANDLED_BY_PROGRAM",
  "UNDER_VERIFICATION",
  "VIOLATION_CONFIRMED",
] as const;
const reconsiderationBases = ["NEW_EVIDENCE", "PROCEDURAL_ERROR"] as const;

const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max);

const numericString = (max: number, message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .refine((value) => {
      const number = Number(value);
      return Number.isInteger(number) && number >= 0 && number <= max;
    }, message);

const dateTimeLocal = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập thời điểm giao dịch.")
  .refine(
    (value) => !Number.isNaN(new Date(value).getTime()),
    "Thời điểm giao dịch không hợp lệ."
  );

export const supportReviewEligibilityFormSchema = z.object({
  actualLoss: numericString(
    2_000_000_000,
    "Verified actual loss phải là số nguyên không âm."
  ),
  approvedServiceConfirmed: z.boolean(),
  channel: z.enum(supportChannels),
  evidenceSufficient: z.boolean(),
  preTransactionVideoPresent: z.boolean(),
  privateEvidenceReference: requiredText(
    500,
    "Vui lòng nhập private evidence reference."
  ),
  profileVersionId: z.string().trim().min(1, "Vui lòng chọn profile version."),
  providerIdentityConfirmed: z.boolean(),
  reason: requiredText(2000, "Vui lòng nhập ghi chú xét điều kiện."),
  registeredPaymentIdentityConfirmed: z.boolean(),
  requiredProcessCompleted: z.boolean(),
  scope: z.enum(supportScopes),
  transactionAt: dateTimeLocal,
  transactionLawfulConfirmed: z.boolean(),
});

export const createSupportReviewOutcomeFormSchema = (cap: number | null) =>
  z
    .object({
      evidenceReference: requiredText(
        500,
        "Vui lòng nhập private evidence reference."
      ),
      externalReference: requiredText(
        500,
        "Vui lòng nhập external action reference."
      ),
      outcome: z.enum(supportOutcomes),
      reason: requiredText(2000, "Vui lòng nhập ghi chú outcome."),
      supportAmount: numericString(
        2_000_000_000,
        "Support amount phải là số nguyên không âm."
      ),
    })
    .superRefine((value, context) => {
      const amount = Number(value.supportAmount);
      if (cap !== null && amount > cap) {
        context.addIssue({
          code: "custom",
          message: "Support amount vượt quá cap được khuyến nghị.",
          path: ["supportAmount"],
        });
      }
      if (amount > 0 && value.outcome !== "HANDLED_BY_PROGRAM") {
        context.addIssue({
          code: "custom",
          message: "Có Bond Allocation thì outcome phải do chương trình xử lý.",
          path: ["outcome"],
        });
      }
    });

export const supportReviewApprovalFormSchema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    reason: z.string().trim().max(2000),
  })
  .superRefine((value, context) => {
    if (value.decision === "REJECTED" && !value.reason) {
      context.addIssue({
        code: "custom",
        message: "Vui lòng nhập lý do từ chối.",
        path: ["reason"],
      });
    }
  });

export const supportReviewReconsiderationFormSchema = z
  .object({
    basis: z.enum(reconsiderationBases),
    evidenceReference: z.string().trim().max(500),
    reason: requiredText(2000, "Vui lòng nhập lý do reconsideration."),
  })
  .superRefine((value, context) => {
    if (value.basis === "NEW_EVIDENCE" && !value.evidenceReference) {
      context.addIssue({
        code: "custom",
        message: "Bằng chứng mới là bắt buộc cho căn cứ này.",
        path: ["evidenceReference"],
      });
    }
  });

export type SupportReviewEligibilityFormValues = z.infer<
  typeof supportReviewEligibilityFormSchema
>;
export type SupportReviewOutcomeFormValues = z.infer<
  ReturnType<typeof createSupportReviewOutcomeFormSchema>
>;
