import { z } from "zod";

export const providerBondWithdrawalRecordFormSchema = z.object({
  externalActionReference: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập external action reference.")
    .max(500),
  privateEvidenceReference: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập private evidence reference.")
    .max(500),
  reason: z.string().trim().min(1, "Vui lòng nhập lý do đối soát.").max(2000),
});

export const createProviderBondWithdrawalApprovalFormSchema = (
  decision: "APPROVED" | "REJECTED"
) =>
  z.object({
    reason:
      decision === "REJECTED"
        ? z.string().trim().min(1, "Vui lòng nhập lý do từ chối.").max(2000)
        : z.string().trim().max(2000),
  });

export const providerBondWithdrawalApprovalFormSchema = z
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

export type ProviderBondWithdrawalRecordFormValues = z.infer<
  typeof providerBondWithdrawalRecordFormSchema
>;
export interface ProviderBondWithdrawalApprovalFormValues {
  reason: string;
}
