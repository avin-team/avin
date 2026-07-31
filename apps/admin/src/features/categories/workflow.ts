import type { ParentCategory } from "./types";

export const validateCommissionRate = (ratePercent: number): void => {
  if (ratePercent < 0 || ratePercent > 100) {
    throw new Error("Commission rate must be between 0% and 100%");
  }
};

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

export const countTotalSubCategories = (
  categories: readonly ParentCategory[]
): number =>
  categories.reduce(
    (total, category) => total + (category.subCategories?.length ?? 0),
    0
  );
