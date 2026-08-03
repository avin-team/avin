import { z } from "zod";

export const servicePackageFormInputFieldSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  required: z.boolean(),
  type: z.enum(["file", "number", "text", "url"]),
});

export type ServicePackageFormInputField = z.infer<
  typeof servicePackageFormInputFieldSchema
>;

export interface ServicePackageFormState {
  name: string;
  priceAmount: string;
  processingTimeHours: string;
  serviceInputFields: ServicePackageFormInputField[];
  scope: string;
  warrantyDurationHours: string;
  warrantyMode: "NO_WARRANTY" | "TIMED";
  warrantyTerms: string;
}

export const servicePackageFormSchema = z
  .object({
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
    scope: z.string().trim().min(1, "Nhập phạm vi bàn giao."),
    serviceInputFields: z.array(servicePackageFormInputFieldSchema),
    warrantyDurationHours: z.string(),
    warrantyMode: z.enum(["NO_WARRANTY", "TIMED"]),
    warrantyTerms: z.string(),
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
    if (!value.warrantyTerms.trim()) {
      context.addIssue({
        code: "custom",
        message: "Nhập điều khoản bảo hành.",
        path: ["warrantyTerms"],
      });
    }
  });
