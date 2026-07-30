import {
  validateCommissionRate,
  validateDefaultWarrantyDuration,
  validateWarrantyBounds,
} from "@avin/api/routers/category-helpers";

import type {
  CreateSubCategoryInput,
  ParentCategory,
  SubCategory,
} from "./types";

export {
  validateCommissionRate,
  validateWarrantyBounds,
} from "@avin/api/routers/category-helpers";

export const buildSubCategory = (
  input: CreateSubCategoryInput
): SubCategory => {
  validateCommissionRate(input.commissionRatePercent);
  validateWarrantyBounds(input.minWarrantyHours, input.maxWarrantyHours);
  validateDefaultWarrantyDuration(
    input.defaultWarrantyDurationHours,
    input.minWarrantyHours,
    input.maxWarrantyHours
  );

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
