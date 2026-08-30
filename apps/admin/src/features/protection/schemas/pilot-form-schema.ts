import { z } from "zod";

export const pilotConfigurationFormSchema = z.object({
  approvalCap: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập approval cap.")
    .refine((value) => {
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed >= 10 && parsed <= 20;
    }, "Approval cap phải nằm trong khoảng 10–20 Provider."),
  enabled: z.boolean(),
});

export const pilotInvitationFormSchema = z.object({
  email: z.string().trim().email("Vui lòng nhập email Provider hợp lệ."),
});

export type PilotConfigurationFormValues = z.infer<
  typeof pilotConfigurationFormSchema
>;
