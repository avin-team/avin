import { afterEach, describe, expect, it, vi } from "vitest";

import { validateListingImage } from "./listing-image-validation";

describe("validateListingImage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts images at the minimum supported dimensions", async () => {
    const close = vi.fn();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ close, height: 600, width: 800 })
    );

    await expect(validateListingImage(new Blob(["image"]))).resolves.toBe(
      undefined
    );
    expect(close).toHaveBeenCalledOnce();
  });

  it("rejects images smaller than the minimum supported dimensions", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ close: vi.fn(), height: 599, width: 800 })
    );

    await expect(validateListingImage(new Blob(["image"]))).resolves.toBe(
      "Ảnh phải có kích thước tối thiểu 800×600 px."
    );
  });

  it("returns a useful error when the browser cannot decode an image", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockRejectedValue(new Error("invalid image"))
    );

    await expect(validateListingImage(new Blob(["image"]))).resolves.toBe(
      "Không thể đọc kích thước ảnh. Chọn ảnh khác rồi thử lại."
    );
  });
});
