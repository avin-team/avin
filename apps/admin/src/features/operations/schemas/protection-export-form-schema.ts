import { z } from "zod";

export const protectionExportFormSchema = z.object({
  dataset: z.enum([
    "PROVIDER_APPLICATIONS",
    "RISK_REPORTS",
    "PROVIDER_RESPONSES",
    "WITHDRAWALS",
  ]),
  purpose: z
    .string()
    .trim()
    .min(10, "Mục đích export phải có ít nhất 10 ký tự.")
    .max(500),
});

export type ProtectionExportFormValues = z.infer<
  typeof protectionExportFormSchema
>;
