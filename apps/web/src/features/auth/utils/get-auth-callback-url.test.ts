import { describe, expect, it } from "vitest";

import { getAuthCallbackUrl } from "@/features/auth/utils/get-auth-callback-url";

describe("getAuthCallbackUrl", () => {
  it("resolves the callback against the frontend origin", () => {
    expect(getAuthCallbackUrl("/", "http://localhost:3001")).toBe(
      "http://localhost:3001/"
    );
  });
});
