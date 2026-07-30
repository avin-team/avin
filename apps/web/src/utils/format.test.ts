import { describe, expect, it } from "vitest";

import { formatVND } from "./format";

describe("formatVND", () => {
  it("formats integer price into VND currency string", () => {
    expect(formatVND(50_000)).toBe("50.000 ₫");
    expect(formatVND(1_500_000)).toBe("1.500.000 ₫");
    expect(formatVND(0)).toBe("0 ₫");
  });

  it("handles large amounts correctly", () => {
    expect(formatVND(100_000_000)).toBe("100.000.000 ₫");
  });
});
