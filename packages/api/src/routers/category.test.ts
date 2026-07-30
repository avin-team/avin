import { describe, expect, it } from "vitest";

import {
  generateSlug,
  validateCommissionRate,
  validateWarrantyBounds,
} from "./category-helpers";

describe("category-helpers", () => {
  describe("generateSlug", () => {
    it("converts Vietnamese text with accents to clean ASCII slug", () => {
      expect(generateSlug("Dịch Vụ Game")).toBe("dich-vu-game");
      expect(generateSlug("Khóa Học Online 101!")).toBe("khoa-hoc-online-101");
      expect(generateSlug("  Top-up  &  Recharge  ")).toBe("top-up-recharge");
    });
  });

  describe("validateCommissionRate", () => {
    it("accepts valid rates between 0 and 100", () => {
      expect(() => validateCommissionRate(0)).not.toThrow();
      expect(() => validateCommissionRate(15.5)).not.toThrow();
      expect(() => validateCommissionRate(100)).not.toThrow();
    });

    it("rejects negative rates or rates above 100", () => {
      expect(() => validateCommissionRate(-1)).toThrow(
        "Commission rate must be between 0% and 100%"
      );
      expect(() => validateCommissionRate(101)).toThrow(
        "Commission rate must be between 0% and 100%"
      );
    });
  });

  describe("validateWarrantyBounds", () => {
    it("accepts valid min and max hours", () => {
      expect(() => validateWarrantyBounds(0, 720)).not.toThrow();
      expect(() => validateWarrantyBounds(24, 24)).not.toThrow();
    });

    it("rejects negative minHours or maxHours < minHours", () => {
      expect(() => validateWarrantyBounds(-1, 10)).toThrow(
        "Minimum warranty hours cannot be negative"
      );
      expect(() => validateWarrantyBounds(48, 24)).toThrow(
        "Maximum warranty hours must be greater than or equal to minimum warranty hours"
      );
    });
  });
});
