import { describe, expect, it } from "vitest";

import { disputeResolutionFormSchema } from "./dispute-resolution-form-schema";

describe("dispute resolution form schema", () => {
  it("requires an audit note", () => {
    expect(
      disputeResolutionFormSchema.safeParse({ adminMessage: "", note: " " })
        .success
    ).toBe(false);
  });

  it("accepts an audit note and optional message", () => {
    expect(
      disputeResolutionFormSchema.safeParse({
        adminMessage: "Đã kiểm tra chứng cứ hai bên.",
        note: "Buyer cung cấp chứng từ hợp lệ.",
      }).success
    ).toBe(true);
  });
});
