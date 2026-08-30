import { z } from "zod";

export const listingModerationFormSchema = z.object({
  reason: z.string().trim().min(1, "Vui lòng nhập lý do xử lý.").max(2000),
});

export type ListingModerationFormValues = z.infer<
  typeof listingModerationFormSchema
>;
