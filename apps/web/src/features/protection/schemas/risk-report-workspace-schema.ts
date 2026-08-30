import { z } from "zod";

export const riskReportWithdrawalFormSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Lý do rút lại phải có tối thiểu 10 ký tự."),
});

export type RiskReportWithdrawalFormValues = z.infer<
  typeof riskReportWithdrawalFormSchema
>;
