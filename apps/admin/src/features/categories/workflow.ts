import type {
  CreateSubCategoryInput,
  ParentCategory,
  SubCategory,
} from "./types";

export const validateWarrantyBounds = (
  minHours: number,
  maxHours: number
): void => {
  if (minHours < 0) {
    throw new Error("Minimum warranty hours cannot be negative");
  }
  if (maxHours < minHours) {
    throw new Error(
      "Maximum warranty hours must be greater than or equal to minimum warranty hours"
    );
  }
};

export const validateCommissionRate = (ratePercent: number): void => {
  if (ratePercent < 0 || ratePercent > 100) {
    throw new Error("Commission rate must be between 0% and 100%");
  }
};

export const buildSubCategory = (
  input: CreateSubCategoryInput
): SubCategory => {
  validateCommissionRate(input.commissionRatePercent);
  validateWarrantyBounds(input.minWarrantyHours, input.maxWarrantyHours);

  if (
    input.defaultWarrantyDurationHours < input.minWarrantyHours ||
    input.defaultWarrantyDurationHours > input.maxWarrantyHours
  ) {
    throw new Error(
      `Default warranty duration must be within bounds (${input.minWarrantyHours}h - ${input.maxWarrantyHours}h)`
    );
  }

  const id = `subcat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  return {
    commissionRatePercent: input.commissionRatePercent,
    defaultServiceInputs: [
      {
        id: "field_1",
        key: "requirements",
        label: "Chi tiết yêu cầu",
        required: true,
        type: "text",
      },
    ],
    defaultWarrantyPolicy: {
      durationHours: input.defaultWarrantyDurationHours,
      terms: input.defaultWarrantyTerms.trim(),
    },
    id,
    name: input.name.trim(),
    parentId: input.parentId,
    slug: (input.slug || input.name)
      .trim()
      .toLowerCase()
      .replaceAll(/\s+/gu, "-"),
    sortOrder: 0,
    status: "ACTIVE",
    warrantyBounds: {
      maxHours: input.maxWarrantyHours,
      minHours: input.minWarrantyHours,
    },
  };
};

export const countTotalSubCategories = (
  categories: readonly ParentCategory[]
): number =>
  categories.reduce(
    (total, category) => total + category.subCategories.length,
    0
  );
