import { z } from "zod";

export const disputeResolutionFormSchema = z.object({
  adminMessage: z.string().trim().max(2000),
  note: z.string().trim().min(1, "Vui lòng nhập ghi chú quyết định.").max(5000),
});

export type DisputeResolutionFormValues = z.infer<
  typeof disputeResolutionFormSchema
>;
