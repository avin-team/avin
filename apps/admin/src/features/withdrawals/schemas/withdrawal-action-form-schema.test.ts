import { describe, expect, it } from "vitest";

import { createWithdrawalActionFormSchema } from "./withdrawal-action-form-schema";

describe("withdrawal action form schema", () => {
  it("allows approval without an additional value", () => {
    expect(
      createWithdrawalActionFormSchema("APPROVE").safeParse({ value: "" })
        .success
    ).toBe(true);
  });

  it("requires a rejection reason", () => {
    expect(
      createWithdrawalActionFormSchema("REJECT").safeParse({ value: " " })
        .success
    ).toBe(false);
  });

  it("allows bank payment reference to be optional", () => {
    expect(
      createWithdrawalActionFormSchema("MARK_PAID").safeParse({ value: "" })
        .success
    ).toBe(true);
    expect(
      createWithdrawalActionFormSchema("MARK_PAID").safeParse({ value: "TX-1" })
        .success
    ).toBe(true);
  });
});
