import { z } from "zod";

const reasonSchema = z
  .string()
  .trim()
  .min(1, "Nhập lý do để tiếp tục.")
  .max(5000, "Lý do không được vượt quá 5.000 ký tự.");

export const buyerDisputeSchema = z.object({
  reason: reasonSchema,
});

export const sellerCancellationSchema = z.object({
  reason: reasonSchema,
});

export const sellerDeliverySchema = z.object({
  deliveryNote: z
    .string()
    .trim()
    .max(1000, "Mô tả không được vượt quá 1.000 ký tự."),
});
