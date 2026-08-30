import { z } from "zod";

export const riskReportCorrectionFormSchema = z.object({
  authorityEvidenceReference: z
    .string()
    .trim()
    .min(1, "Vui lòng cung cấp tham chiếu bằng chứng quyền sở hữu."),
  reason: z
    .string()
    .trim()
    .min(20, "Nội dung đính chính phải có tối thiểu 20 ký tự.")
    .max(5000),
  reportId: z.string().trim().min(1, "Vui lòng nhập mã Risk Report."),
  requesterRelationship: z.enum(["SUBJECT", "AUTHORIZED_REPRESENTATIVE"]),
});

export type RiskReportCorrectionFormValues = z.infer<
  typeof riskReportCorrectionFormSchema
>;
