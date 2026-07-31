import { describe, expect, it } from "vitest";

import { sellerApplicationRouter } from "./router";

describe("seller application router interface", () => {
  it("exposes the complete onboarding workflow", () => {
    expect(Object.keys(sellerApplicationRouter).toSorted()).toEqual([
      "getProfile",
      "requestPhoneOtp",
      "submitApplication",
      "updateDraftProfile",
      "verifyPhoneOtp",
    ]);
  });
});
