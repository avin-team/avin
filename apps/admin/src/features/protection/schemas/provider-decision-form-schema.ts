import { z } from "zod";

export const providerDecisionFormSchema = z
  .object({
    decision: z.enum(["APPROVED", "CHANGES_REQUESTED", "REJECTED"]),
    reason: z.string().trim().max(2000),
  })
  .superRefine((value, context) => {
    if (value.decision !== "APPROVED" && !value.reason) {
      context.addIssue({
        code: "custom",
        message: "Vui lòng nhập lý do cho quyết định này.",
        path: ["reason"],
      });
    }
  });

export type ProviderDecisionFormValues = z.infer<
  typeof providerDecisionFormSchema
>;
