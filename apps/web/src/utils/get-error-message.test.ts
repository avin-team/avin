import { describe, expect, it } from "vitest";

import { getErrorMessage } from "./get-error-message";

describe("getErrorMessage", () => {
  it("keeps the server explanation for a rejected listing publication", () => {
    expect(
      getErrorMessage(
        new Error("Store profile must be complete before publishing a listing"),
        "Không thể đăng bán sản phẩm. Vui lòng thử lại."
      )
    ).toBe("Store profile must be complete before publishing a listing");
  });

  it("uses the seller-safe fallback for an unknown failure", () => {
    expect(
      getErrorMessage(null, "Không thể đăng bán sản phẩm. Vui lòng thử lại.")
    ).toBe("Không thể đăng bán sản phẩm. Vui lòng thử lại.");
  });
});
