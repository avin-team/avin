import { describe, expect, it } from "vitest";

import { protectionExportFormSchema } from "./protection-export-form-schema";

describe("protectionExportFormSchema", () => {
  it("requires a controlled export purpose", () => {
    expect(
      protectionExportFormSchema.safeParse({
        dataset: "RISK_REPORTS",
        purpose: "Đối soát SLA tuần này",
      }).success
    ).toBe(true);
    expect(
      protectionExportFormSchema.safeParse({
        dataset: "RISK_REPORTS",
        purpose: "ngắn",
      }).success
    ).toBe(false);
  });
});
