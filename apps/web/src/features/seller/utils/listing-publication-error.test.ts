import { describe, expect, it } from "vitest";

import { getListingPublicationErrorMessage } from "./listing-publication-error";

describe("getListingPublicationErrorMessage", () => {
  it("explains when the store profile blocks publication", () => {
    expect(
      getListingPublicationErrorMessage(
        new Error("Store profile must be complete before publishing a listing"),
        "Không thể đăng bán sản phẩm. Vui lòng thử lại."
      )
    ).toBe(
      "Hoàn tất hồ sơ gian hàng (tên, địa chỉ, mô tả và ảnh đại diện) trước khi đăng bán."
    );
  });

  it("keeps an unfamiliar server reason visible", () => {
    expect(
      getListingPublicationErrorMessage(
        new Error("Listing title is required"),
        "Không thể đăng bán sản phẩm. Vui lòng thử lại."
      )
    ).toBe("Listing title is required");
  });

  it("explains when a Service listing has no available package", () => {
    expect(
      getListingPublicationErrorMessage(
        new Error("A published Service listing must have an available package"),
        "Không thể đăng bán sản phẩm. Vui lòng thử lại."
      )
    ).toBe(
      "Bật trạng thái khả dụng cho ít nhất một gói giá trước khi đăng bán."
    );
  });
});
