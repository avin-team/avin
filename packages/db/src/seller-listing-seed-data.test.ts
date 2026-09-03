import { describe, expect, it } from "vitest";

import { parseSellerListingSeedArguments } from "./seller-listing-seed-data";

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
