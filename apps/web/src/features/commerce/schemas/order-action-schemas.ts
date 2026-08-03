import { z } from "zod";

import { getSafeEvidenceHref } from "@/utils/get-safe-evidence-href";

const reasonSchema = z
  .string()
  .trim()
  .min(1, "Nhập lý do để tiếp tục.")
  .max(5000, "Lý do không được vượt quá 5.000 ký tự.");

const evidenceUrlListSchema = z
  .string()
  .trim()
  .min(1, "Thêm ít nhất một liên kết bằng chứng.")
  .refine(
    (value) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .every((line) => getSafeEvidenceHref(line)),
    "Mỗi bằng chứng phải là một liên kết HTTP hoặc HTTPS."
  );

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
    .min(1, "Nhập ghi chú bàn giao để tiếp tục.")
    .max(20_000, "Ghi chú không được vượt quá 20.000 ký tự."),
  evidence: evidenceUrlListSchema,
});
