import { describe, expect, it } from "vitest";

import { checkoutInputSchema } from "./checkout-input";
import {
  fingerprintCheckoutRequest,
  parseListingContract,
  parseServicePackageContract,
} from "./contracts";

const listing = {
  categoryId: "category-1",
  description: "A useful service",
  images: ["https://example.com/listing.png"],
  priceAmount: 100_000,
  processingTimeHours: 24,
  sellerId: "seller-1",
  slug: "useful-service",
  thumbnailUrl: "https://example.com/listing.png",
  title: "Useful service",
  type: "SERVICE" as const,
  warrantyDurationHours: 48,
  warrantyTerms: "Fix defects during the warranty window.",
};

describe("Listing contract checkout helpers", () => {
  it("fingerprints equivalent checkout input independent of item ordering", () => {
    const first = fingerprintCheckoutRequest({
      confirmMaterialChanges: false,
      items: [
        {
          contractFingerprint: "a".repeat(64),
          listingId: "listing-b",
        },
        {
          contractFingerprint: "b".repeat(64),
          listingId: "listing-a",
        },
      ],
    });
    const second = fingerprintCheckoutRequest({
      confirmMaterialChanges: false,
      items: [
        {
          contractFingerprint: "b".repeat(64),
          listingId: "listing-a",
        },
        {
          contractFingerprint: "a".repeat(64),
          listingId: "listing-b",
        },
      ],
    });

    expect(first).toBe(second);
  });

  it("normalizes a Listing contract for a snapshot and review fingerprint", () => {
    const parsed = parseListingContract(listing, "10.00");

    expect(parsed.priceAmount).toBe(100_000);
    expect(parsed.warrantyPolicy.durationHours).toBe(48);
    expect(parsed.fingerprint).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("fingerprints the selected Service package into the checkout contract", () => {
    const parsed = parseServicePackageContract(
      listing,
      {
        description: "A larger delivered result",
        id: "package-1",
        name: "Premium",
        priceAmount: 250_000,
        processingTimeHours: 72,
        warrantyPolicy: {
          durationHours: 72,
          kind: "TIMED",
        },
      },
      "10.00"
    );

    expect(parsed.priceAmount).toBe(250_000);
    expect(parsed.servicePackageSnapshot?.name).toBe("Premium");
    expect(parsed.servicePackageSnapshot?.description).toBe(
      "A larger delivered result"
    );
    expect(parsed.fingerprint).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("rejects duplicate Listings and applies safe Checkout defaults", () => {
    const listingId = "00000000-0000-4000-8000-000000000001";
    const result = checkoutInputSchema.safeParse({
      idempotencyKey: "checkout-key-123456",
      items: [
        {
          contractFingerprint: "a".repeat(64),
          listingId,
        },
        {
          contractFingerprint: "b".repeat(64),
          listingId,
        },
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.error.issues).toContainEqual(
      expect.objectContaining({ path: ["items", 1, "listingId"] })
    );

    const valid = checkoutInputSchema.parse({
      idempotencyKey: "checkout-key-123456",
      items: [
        {
          contractFingerprint: "a".repeat(64),
          listingId,
        },
      ],
    });
    expect(valid.confirmMaterialChanges).toBe(false);
    expect(valid.items[0]?.packageId).toBeUndefined();
  });
});
