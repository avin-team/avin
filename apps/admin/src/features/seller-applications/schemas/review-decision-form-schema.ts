import { z } from "zod";

export const reviewDecisionFormSchema = z.object({
  reason: z.string().trim().max(2000),
});

export type ReviewDecisionFormValues = z.infer<typeof reviewDecisionFormSchema>;
