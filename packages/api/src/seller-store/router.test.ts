import { describe, expect, it } from "vitest";

import { createStoreSlug, storeProfileInputSchema } from "./profile";
import { sellerStoreRouter } from "./router";

describe("seller store router interface", () => {
  it("exposes the private store profile workflow", () => {
    expect(Object.keys(sellerStoreRouter).toSorted()).toEqual([
      "getProfile",
      "updateProfile",
    ]);
  });
});

describe("store profile contract", () => {
  it("creates a URL-safe initial slug from a store name", () => {
    expect(createStoreSlug("Studio của Ngọc")).toBe("studio-cua-ngoc");
  });

  it("requires the fields needed to complete the private profile", () => {
    expect(
      storeProfileInputSchema.safeParse({
        avatarUrl: "https://example.com/avatar.png",
        bannerUrl: "",
        bio: "Dịch vụ số cho người bán.",
        storeSlug: "studio-cua-ngoc",
        storefrontName: "Studio của Ngọc",
      }).success
    ).toBe(true);

    expect(
      storeProfileInputSchema.safeParse({
        avatarUrl: "",
        bannerUrl: "",
        bio: "Dịch vụ số cho người bán.",
        storeSlug: "Studio Cua Ngoc",
        storefrontName: "Studio của Ngọc",
      }).success
    ).toBe(false);
  });
});
