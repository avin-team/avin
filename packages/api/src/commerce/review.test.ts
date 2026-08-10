import { describe, expect, it, vi } from "vitest";

import { getReviewForOrderItem } from "./review";

describe("getReviewForOrderItem", () => {
  it("returns null when the order item has no review", async () => {
    const findFirst = vi.fn().mockImplementation(() => Promise.resolve());
    const database = {
      query: {
        review: { findFirst },
      },
    } as unknown as Parameters<typeof getReviewForOrderItem>[0]["database"];

    await expect(
      getReviewForOrderItem({
        database,
        orderItemId: "3231bed2-514d-41d9-bb89-24f89c07fb4c",
      })
    ).resolves.toBeNull();
  });
});
