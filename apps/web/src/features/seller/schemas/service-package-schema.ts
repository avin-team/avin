import { z } from "zod";

export interface ServicePackageFormState {
  description: string;
  name: string;
  priceAmount: string;
  processingTimeHours: string;
  warrantyDurationHours: string;
  warrantyMode: "NO_WARRANTY" | "TIMED";
}

export const servicePackageFormSchema = z
  .object({
    description: z.string().trim().min(1, "Nhập mô tả gói dịch vụ."),
    name: z.string().trim().min(1, "Nhập tên gói dịch vụ."),
    priceAmount: z
      .string()
      .trim()
      .refine(
        (value) => Number.isInteger(Number(value)) && Number(value) > 0,
        "Giá phải là số nguyên dương."
      ),
    processingTimeHours: z
      .string()
      .trim()
      .refine(
        (value) => Number.isInteger(Number(value)) && Number(value) > 0,
        "Thời gian xử lý phải là số nguyên dương."
      ),
    warrantyDurationHours: z.string(),
    warrantyMode: z.enum(["NO_WARRANTY", "TIMED"]),
  })
  .superRefine((value, context) => {
    if (value.warrantyMode !== "TIMED") {
      return;
    }

    if (
      !Number.isInteger(Number(value.warrantyDurationHours)) ||
      Number(value.warrantyDurationHours) <= 0
    ) {
      context.addIssue({
        code: "custom",
        message: "Thời hạn bảo hành phải là số nguyên dương.",
        path: ["warrantyDurationHours"],
      });
    }
  });
