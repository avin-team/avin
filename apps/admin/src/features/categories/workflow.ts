import type { ParentCategory } from "./types";

export {
  validateCommissionRate,
  validateWarrantyBounds,
} from "@avin/api/routers/category-helpers";

export const countTotalSubCategories = (
  categories: readonly ParentCategory[]
): number =>
  categories.reduce(
    (total, category) => total + (category.subCategories?.length ?? 0),
    0
  );
