import { describe, expect, it } from "vitest";

import { validateCommissionRate, validateWarrantyBounds } from "./workflow";

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
});
