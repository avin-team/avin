import { describe, expect, it } from "vitest";

import {
  formatSellerListingPrice,
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
});
