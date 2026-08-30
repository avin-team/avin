import { describe, expect, it } from "vitest";

import { providerRiskIncidentResponseSchema } from "./provider-risk-incident-response-schema";

describe("providerRiskIncidentResponseSchema", () => {
  it("requires a substantive private response", () => {
    expect(
      providerRiskIncidentResponseSchema.safeParse({ response: "ngắn" }).success
    ).toBe(false);
    expect(
      providerRiskIncidentResponseSchema.safeParse({
        response: "Đây là phản hồi riêng tư có đủ bối cảnh và hướng xử lý.",
      }).success
    ).toBe(true);
  });
});
