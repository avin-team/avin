import { z } from "zod";

export const providerRiskIncidentResponseSchema = z.object({
  response: z
    .string()
    .trim()
    .min(20, "Phản hồi phải có ít nhất 20 ký tự.")
    .max(5000),
});

export type ProviderRiskIncidentResponseValues = z.infer<
  typeof providerRiskIncidentResponseSchema
>;
