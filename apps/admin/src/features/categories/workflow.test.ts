import { describe, expect, it } from "vitest";

import type { ParentCategory } from "./types";
import {
  buildSubCategory,
  countTotalSubCategories,
  validateCommissionRate,
  validateWarrantyBounds,
} from "./workflow";

describe("Category workflow", () => {
  it("validates commission rate bounds", () => {
    expect(() => validateCommissionRate(-1)).toThrow(
      "Commission rate must be between 0% and 100%"
    );
    expect(() => validateCommissionRate(101)).toThrow(
      "Commission rate must be between 0% and 100%"
    );
    expect(() => validateCommissionRate(5.5)).not.toThrow();
  });

  it("validates warranty bounds", () => {
    expect(() => validateWarrantyBounds(-10, 50)).toThrow(
      "Minimum warranty hours cannot be negative"
    );
    expect(() => validateWarrantyBounds(100, 50)).toThrow(
      "Maximum warranty hours must be greater than or equal to minimum warranty hours"
    );
    expect(() => validateWarrantyBounds(24, 720)).not.toThrow();
  });

  it("creates a valid sub-category with defaults", () => {
    const subCategory = buildSubCategory({
      commissionRatePercent: 8,
      defaultWarrantyDurationHours: 72,
      defaultWarrantyTerms: "Bảo hành 1 đổi 1 trong 72h",
      maxWarrantyHours: 720,
      minWarrantyHours: 24,
      name: "Tài khoản Canva Pro",
      parentId: "cat_services",
      slug: "canva-pro",
    });

    expect(subCategory.name).toBe("Tài khoản Canva Pro");
    expect(subCategory.commissionRatePercent).toBe(8);
    expect(subCategory.defaultWarrantyPolicy.durationHours).toBe(72);
    expect(subCategory.status).toBe("ACTIVE");
    expect(subCategory.sortOrder).toBe(0);
  });

  it("counts total subcategories accurately", () => {
    const mockCategories: readonly ParentCategory[] = [
      {
        description: "",
        id: "c1",
        name: "Services",
        slug: "services",
        sortOrder: 1,
        status: "ACTIVE",
        subCategories: [
          {
            commissionRatePercent: 5,
            defaultServiceInputs: [],
            defaultWarrantyPolicy: { durationHours: 24, terms: "" },
            id: "s1",
            name: "S1",
            parentId: "c1",
            slug: "s1",
            sortOrder: 1,
            status: "ACTIVE",
            warrantyBounds: { maxHours: 720, minHours: 24 },
          },
        ],
      },
      {
        description: "",
        id: "c2",
        name: "Courses",
        slug: "courses",
        sortOrder: 2,
        status: "ACTIVE",
        subCategories: [],
      },
    ];

    expect(countTotalSubCategories(mockCategories)).toBe(1);
  });
});
