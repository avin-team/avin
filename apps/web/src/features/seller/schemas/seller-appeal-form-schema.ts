import { z } from "zod";

export const sellerAppealFormSchema = z.object({
  sellerReason: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập lý do giải trình khiếu nại.")
    .max(2000),
});

export type SellerAppealFormValues = z.infer<typeof sellerAppealFormSchema>;
