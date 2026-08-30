import { z } from "zod";

const optionalText = z.string();

const requiredText = (message: string) => z.string().trim().min(1, message);

const nonNegativeNumber = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, {
      message,
    });

const percentageNumber = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập tỷ lệ chiết khấu.")
  .refine(
    (value) => Number.isFinite(Number(value)) && Number(value) >= 0,
    "Tỷ lệ chiết khấu không hợp lệ."
  )
  .refine((value) => Number(value) <= 100, "Tỷ lệ chiết khấu tối đa là 100%.");

export const createParentCategoryFormSchema = z.object({
  description: optionalText,
  name: requiredText("Vui lòng nhập tên danh mục."),
  slug: optionalText,
});

export const editParentCategoryFormSchema = z.object({
  description: optionalText,
  name: requiredText("Vui lòng nhập tên danh mục."),
});

const subCategoryFields = {
  commissionRate: percentageNumber,
  maxWarranty: nonNegativeNumber("Thời hạn bảo hành không hợp lệ."),
  minWarranty: nonNegativeNumber("Thời hạn bảo hành không hợp lệ."),
  name: requiredText("Vui lòng nhập tên danh mục."),
  warrantyHours: nonNegativeNumber("Thời hạn bảo hành không hợp lệ."),
  warrantyTerms: requiredText("Vui lòng nhập điều khoản bảo hành."),
};

const subCategoryFormSchema = z.object(subCategoryFields);

const validateWarrantyBounds = (
  value: z.infer<typeof subCategoryFormSchema>,
  context: z.RefinementCtx
) => {
  const minWarranty = Number(value.minWarranty);
  const maxWarranty = Number(value.maxWarranty);
  const warrantyHours = Number(value.warrantyHours);

  if (maxWarranty < minWarranty) {
    context.addIssue({
      code: "custom",
      message:
        "Thời hạn bảo hành tối đa phải lớn hơn hoặc bằng thời hạn tối thiểu.",
      path: ["maxWarranty"],
    });
  }

  if (warrantyHours < minWarranty || warrantyHours > maxWarranty) {
    context.addIssue({
      code: "custom",
      message: "Bảo hành mặc định phải nằm trong khoảng giới hạn.",
      path: ["warrantyHours"],
    });
  }
};

export const createSubCategoryFormSchema = subCategoryFormSchema
  .extend({
    slug: requiredText("Vui lòng nhập URL slug."),
  })
  .superRefine(validateWarrantyBounds);

export const editSubCategoryFormSchema = subCategoryFormSchema.superRefine(
  validateWarrantyBounds
);

export type CreateParentCategoryFormValues = z.infer<
  typeof createParentCategoryFormSchema
>;
export type CreateSubCategoryFormValues = z.infer<
  typeof createSubCategoryFormSchema
>;
export type EditParentCategoryFormValues = z.infer<
  typeof editParentCategoryFormSchema
>;
export type EditSubCategoryFormValues = z.infer<
  typeof editSubCategoryFormSchema
>;
