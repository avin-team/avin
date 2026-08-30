import { describe, expect, it } from "vitest";

import { providerBondTopUpFormSchema } from "./provider-workspace-schema";

describe("provider workspace form schemas", () => {
  it("accepts a whole-number top-up at or above the minimum", () => {
    expect(
      providerBondTopUpFormSchema.safeParse({ amount: "1000000" }).success
    ).toBe(true);
  });

  it("rejects top-ups below the minimum", () => {
    expect(
      providerBondTopUpFormSchema.safeParse({ amount: "999999" }).success
    ).toBe(false);
  });
});
