import { describe, expect, it } from "vitest";

import { sellerAppealFormSchema } from "./seller-appeal-form-schema";

describe("seller appeal form schema", () => {
  it("requires a reason", () => {
    expect(
      sellerAppealFormSchema.safeParse({ sellerReason: " " }).success
    ).toBe(false);
  });

  it("accepts a complete appeal", () => {
    expect(
      sellerAppealFormSchema.safeParse({
        sellerReason: "Tôi muốn giải trình quyết định xử lý này.",
      }).success
    ).toBe(true);
  });
});
