import { describe, expect, it } from "vitest";

import { listingModerationFormSchema } from "./listing-moderation-form-schema";

describe("listing moderation form schema", () => {
  it("requires a reason", () => {
    expect(listingModerationFormSchema.safeParse({ reason: " " }).success).toBe(
      false
    );
  });

  it("accepts a bounded reason", () => {
    expect(
      listingModerationFormSchema.safeParse({ reason: "Vi phạm chính sách." })
        .success
    ).toBe(true);
  });
});
