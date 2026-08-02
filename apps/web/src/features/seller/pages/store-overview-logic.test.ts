import { describe, expect, it } from "vitest";

import { getStoreProfileCompletion } from "./store-overview-logic";

describe("getStoreProfileCompletion", () => {
  it("marks a profile complete without requiring a banner", () => {
    expect(
      getStoreProfileCompletion({
        avatarUrl: "https://example.com/avatar.png",
        bio: "Dịch vụ số",
        storeSlug: "dich-vu-so",
        storefrontName: "Dịch vụ số",
      })
    ).toEqual({
      completedFields: 4,
      isComplete: true,
      percentage: 100,
    });
  });

  it("counts missing required values toward the completion percentage", () => {
    expect(
      getStoreProfileCompletion({
        avatarUrl: "https://example.com/avatar.png",
        bio: "",
        storeSlug: "dich-vu-so",
        storefrontName: "Dịch vụ số",
      })
    ).toEqual({
      completedFields: 3,
      isComplete: false,
      percentage: 75,
    });
  });
});
