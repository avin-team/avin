import { describe, expect, it } from "vitest";

import {
  createSellerListingSlug,
  parseSellerListingSeedArguments,
  SELLER_LISTING_SEEDS,
} from "./seller-listing-seed-data";

const SELLER_PROFILE_ID = "0198aabb-ccdd-7eef-8123-456789abcdef";

describe("parseSellerListingSeedArguments", () => {
  it("parses the seller profile and dry-run flag", () => {
    expect(
      parseSellerListingSeedArguments([
        "--seller-profile-id",
        SELLER_PROFILE_ID,
        "--dry-run",
      ])
    ).toEqual({ dryRun: true, sellerProfileId: SELLER_PROFILE_ID });
  });

  it("requires a valid seller profile UUID", () => {
    expect(() => parseSellerListingSeedArguments([])).toThrow(
      "A valid --seller-profile-id UUID is required"
    );
    expect(() =>
      parseSellerListingSeedArguments(["--seller-profile-id", "not-a-uuid"])
    ).toThrow("A valid --seller-profile-id UUID is required");
  });

  it("rejects duplicate and unknown arguments", () => {
    expect(() =>
      parseSellerListingSeedArguments([
        "--seller-profile-id",
        SELLER_PROFILE_ID,
        "--seller-profile-id",
        SELLER_PROFILE_ID,
      ])
    ).toThrow("--seller-profile-id may only be provided once");
    expect(() => parseSellerListingSeedArguments(["--force"])).toThrow(
      "Unknown argument: --force"
    );
  });
});

describe("SELLER_LISTING_SEEDS", () => {
  it("contains the agreed listing and package counts", () => {
    const packageCount = SELLER_LISTING_SEEDS.reduce(
      (total, seed) => total + seed.packages.length,
      0
    );

    expect(SELLER_LISTING_SEEDS).toHaveLength(12);
    expect(packageCount).toBe(21);
  });

  it("preserves the prices transcribed from the flyer", () => {
    expect(
      SELLER_LISTING_SEEDS.map((seed) =>
        seed.packages.map((packageSeed) => packageSeed.priceAmount)
      )
    ).toEqual([
      [500_000, 700_000],
      [5_000_000, 10_000_000],
      [700_000, 1_200_000],
      [3_000_000, 5_000_000],
      [600_000, 1_000_000],
      [5_000_000, 15_000_000],
      [5_000_000, 10_000_000],
      [2_000_000, 3_000_000],
      [700_000],
      [4_000_000],
      [3_000_000, 4_000_000],
      [4_000_000],
    ]);
  });

  it("uses unique slugs and the agreed package names", () => {
    const slugs = SELLER_LISTING_SEEDS.map((seed) => seed.slugSuffix);

    expect(new Set(slugs).size).toBe(slugs.length);

    for (const seed of SELLER_LISTING_SEEDS) {
      expect(seed.packages[0]?.name).toBe("Gói cơ bản");

      if (seed.packages.length === 2) {
        expect(seed.packages[1]?.name).toBe("Gói nâng cao");
      }
    }
  });

  it("keeps artificial engagement services out of the dataset", () => {
    const titles = SELLER_LISTING_SEEDS.map((seed) => seed.title.toLowerCase());

    expect(titles.some((title) => title.includes("tăng like"))).toBe(false);
    expect(titles.some((title) => title.includes("tăng follow"))).toBe(false);
    expect(titles.some((title) => title.includes("tăng view"))).toBe(false);
  });
});

describe("createSellerListingSlug", () => {
  it("scopes listing slugs to the seller store", () => {
    expect(createSellerListingSlug("cua-hang-an", "mo-khoa-facebook")).toBe(
      "cua-hang-an-mo-khoa-facebook"
    );
  });
});
