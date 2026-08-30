import { z } from "zod";

export const providerRiskIncidentDecisionFormSchema = z.object({
  reason: z.string().trim().min(1, "Vui lòng nhập lý do quyết định.").max(2000),
});

export const providerRiskIncidentLinkFormSchema = z.object({
  profileId: z.string().trim().min(1, "Vui lòng chọn Provider profile."),
});

export type ProviderRiskIncidentDecisionFormValues = z.infer<
  typeof providerRiskIncidentDecisionFormSchema
>;
