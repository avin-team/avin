import { describe, expect, it } from "vitest";

import { orderItemReviewFormSchema } from "./order-item-review-schema";

describe("order item review form schema", () => {
  it("accepts a rating and an optional comment", () => {
    expect(
      orderItemReviewFormSchema.safeParse({ comment: "Rất tốt", rating: 5 })
        .success
    ).toBe(true);
  });

  it("rejects ratings outside the supported range", () => {
    expect(
      orderItemReviewFormSchema.safeParse({ comment: "", rating: 6 }).success
    ).toBe(false);
  });
});
