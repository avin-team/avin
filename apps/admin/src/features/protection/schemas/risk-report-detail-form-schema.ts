import { z } from "zod";

export const riskReportDerivativeFormSchema = z
  .object({
    metadataRemoved: z.boolean(),
    unrelatedPiiRedacted: z.boolean(),
    watermarkApplied: z.boolean(),
  })
  .superRefine((value, context) => {
    for (const [field, checked] of Object.entries(value)) {
      if (!checked) {
        context.addIssue({
          code: "custom",
          message: "Cần xác nhận đủ ba bước kiểm tra derivative.",
          path: [field],
        });
      }
    }
  });

export const createRiskReportDecisionFormSchema = (
  decision: "REJECTED" | "PUBLISHED"
) =>
  z.object({
    reason:
      decision === "REJECTED"
        ? z.string().trim().min(1, "Vui lòng nhập lý do từ chối.").max(2000)
        : z.string().trim().max(2000),
  });

export type RiskReportDerivativeFormValues = z.infer<
  typeof riskReportDerivativeFormSchema
>;
