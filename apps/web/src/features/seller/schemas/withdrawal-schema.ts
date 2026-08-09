import { z } from "zod";

export const SELLER_WITHDRAWAL_MINIMUM_AMOUNT = 5000;

export const sellerWithdrawalSchema = z.object({
  amount: z.number().int().min(SELLER_WITHDRAWAL_MINIMUM_AMOUNT),
});
