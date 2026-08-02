import { z } from "zod";

export const DEPOSIT_MINIMUM_AMOUNT = 5000;

export const depositAmountSchema = z.object({
  amount: z
    .number({ error: "Vui lòng nhập số tiền cần nạp." })
    .int()
    .min(DEPOSIT_MINIMUM_AMOUNT, {
      message: "Số tiền nạp tối thiểu là 5.000 ₫.",
    }),
});
