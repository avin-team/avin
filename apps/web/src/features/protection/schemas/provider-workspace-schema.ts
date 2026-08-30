import { z } from "zod";

export const providerBondTopUpFormSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập số tiền nạp.")
    .refine(
      (value) => Number.isInteger(Number(value)) && Number(value) >= 1_000_000,
      "Số tiền nạp tối thiểu là 1.000.000 ₫."
    ),
});

export type ProviderBondTopUpFormValues = z.infer<
  typeof providerBondTopUpFormSchema
>;
