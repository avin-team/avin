import { describe, expect, it } from "vitest";

import { storeProfileFormSchema } from "./store-profile-form-schema";

const validProfile = {
  avatarUrl: "https://cdn.example.com/logo.png",
  bannerUrl: "",
  bio: "Dịch vụ an toàn và minh bạch.",
  slugCustomized: false,
  storeSlug: "avin-store",
  storefrontName: "Avin Store",
};

describe("store profile form schema", () => {
  it("accepts a complete profile", () => {
    expect(storeProfileFormSchema.safeParse(validProfile).success).toBe(true);
  });

  it("requires a valid avatar, name, slug, and description", () => {
    expect(
      storeProfileFormSchema.safeParse({
        ...validProfile,
        avatarUrl: "",
        bio: "",
        storeSlug: "not valid",
        storefrontName: "A",
      }).success
    ).toBe(false);
  });
});
