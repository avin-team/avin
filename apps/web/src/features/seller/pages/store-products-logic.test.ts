import { describe, expect, it } from "vitest";

import {
  formatSellerListingPrice,
  formatSellerListingPriceSummary,
  getSellerListingActionLabel,
  getSellerListingStatusLabel,
  getSellerListingTypeLabel,
} from "./store-products-logic";

describe("seller product display helpers", () => {
  it("translates listing statuses and types for the seller UI", () => {
    expect(getSellerListingStatusLabel("DRAFT")).toBe("Bản nháp");
    expect(getSellerListingStatusLabel("PUBLISHED")).toBe("Đang bán");
    expect(getSellerListingTypeLabel("COURSE")).toBe("Khóa học");
    expect(getSellerListingTypeLabel("SERVICE")).toBe("Dịch vụ");
  });

  it("formats prices and keeps an explicit empty state", () => {
    expect(formatSellerListingPrice(300_000)).toBe("300.000 ₫");
    expect(formatSellerListingPrice(null)).toBe("Chưa đặt giá");
  });

  it("formats price summary for single and multi-package service listings", () => {
    expect(formatSellerListingPriceSummary("COURSE", 500_000)).toBe(
      "500.000 ₫"
    );
    expect(formatSellerListingPriceSummary("SERVICE", null, [])).toBe(
      "Chưa đặt giá"
    );
    expect(
      formatSellerListingPriceSummary("SERVICE", 100_000, [
        { id: "1", name: "Cơ bản", priceAmount: 100_000, status: "AVAILABLE" },
      ])
    ).toBe("Cơ bản: 100.000 ₫");
    expect(
      formatSellerListingPriceSummary("SERVICE", 100_000, [
        { id: "1", name: "Cơ bản", priceAmount: 100_000, status: "AVAILABLE" },
        { id: "2", name: "VIP", priceAmount: 300_000, status: "AVAILABLE" },
      ])
    ).toBe("2 gói · 100.000 ₫ – 300.000 ₫");
  });

  it("uses an action label that matches the listing lifecycle", () => {
    expect(getSellerListingActionLabel("DRAFT")).toBe("Tiếp tục hoàn thiện");
    expect(getSellerListingActionLabel("PUBLISHED")).toBe("Chỉnh sửa");
    expect(getSellerListingActionLabel("PAUSED")).toBe("Chỉnh sửa");
    expect(getSellerListingActionLabel("HIDDEN")).toBe("Xem & chỉnh sửa");
  });
});
