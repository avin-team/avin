import type { ServiceInputFieldType } from "@avin/db/schema/catalog";
import { describe, expect, it } from "vitest";

import {
  assertDeletableDraft,
  assertPublishable,
  canAccessListingMedia,
  canUploadListingImage,
} from "./seller-workspace";

describe("seller workspace listing publication rules", () => {
  const validCategory = {
    warrantyBounds: {
      maxHours: 720,
      minHours: 24,
    },
  };

  const validListing = {
    description: "Full service account setup and configuration",
    images: ["https://storage.avin.internal/listing-1/1.jpg"],
    priceAmount: 150_000,
    processingTimeHours: 12,
    slug: "account-setup-xyz123",
    thumbnailUrl: "https://storage.avin.internal/listing-1/1.jpg",
    title: "Premium Account Setup",
    warrantyDurationHours: 48,
    warrantyTerms: "Free replacement within 48 hours",
  };

  it("passes validation when all publication fields are valid and within warranty bounds", () => {
    expect(() => assertPublishable(validListing, validCategory)).not.toThrow();
  });

  it("rejects publication when title is missing or empty", () => {
    expect(() =>
      assertPublishable({ ...validListing, title: "   " }, validCategory)
    ).toThrow("Listing title is required");
  });

  it("rejects publication when description is missing", () => {
    expect(() =>
      assertPublishable({ ...validListing, description: "" }, validCategory)
    ).toThrow("Listing description is required");
  });

  it("rejects publication when price is not a positive integer VND amount", () => {
    expect(() =>
      assertPublishable({ ...validListing, priceAmount: 0 }, validCategory)
    ).toThrow("Listing price must be a positive integer VND amount");

    expect(() =>
      assertPublishable({ ...validListing, priceAmount: 12.5 }, validCategory)
    ).toThrow("Listing price must be a positive integer VND amount");
  });

  it("rejects publication when Processing Expectation is missing or non-positive", () => {
    expect(() =>
      assertPublishable(
        { ...validListing, processingTimeHours: null },
        validCategory
      )
    ).toThrow("Processing Expectation (in hours) must be a positive integer");

    expect(() =>
      assertPublishable(
        { ...validListing, processingTimeHours: -5 },
        validCategory
      )
    ).toThrow("Processing Expectation (in hours) must be a positive integer");
  });

  it("rejects publication when primary image is missing", () => {
    expect(() =>
      assertPublishable(
        { ...validListing, images: [], thumbnailUrl: null },
        validCategory
      )
    ).toThrow("Listing must have a designated primary image");
  });

  it("rejects publication when warranty duration is below category min hours", () => {
    expect(() =>
      assertPublishable(
        { ...validListing, warrantyDurationHours: 12 },
        validCategory
      )
    ).toThrow("must be within category bounds (24h - 720h)");
  });

  it("rejects publication when warranty duration exceeds category max hours", () => {
    expect(() =>
      assertPublishable(
        { ...validListing, warrantyDurationHours: 1000 },
        validCategory
      )
    ).toThrow("must be within category bounds (24h - 720h)");
  });

  it("rejects publication when warranty terms are empty", () => {
    expect(() =>
      assertPublishable({ ...validListing, warrantyTerms: "  " }, validCategory)
    ).toThrow("Warranty terms are required");
  });

  it("rejects publication when service input fields are invalid", () => {
    expect(() =>
      assertPublishable(
        {
          ...validListing,
          serviceInputFields: [
            {
              id: "f1",
              key: "invalid",
              label: "Invalid",
              required: true,
              type: "unknown" as unknown as ServiceInputFieldType,
            },
          ],
        },
        validCategory
      )
    ).toThrow("All service input fields must be valid");
  });
});

describe("listing media access security rules (ADR 0009)", () => {
  const activeCategory = {
    parentCategory: { status: "ACTIVE" },
    status: "ACTIVE",
  };

  const hiddenCategory = {
    parentCategory: { status: "ACTIVE" },
    status: "HIDDEN",
  };

  const listingItem = {
    category: activeCategory,
    sellerId: "seller-123",
    status: "PUBLISHED",
  };

  it("allows Admin to access media for any listing regardless of status or category status", () => {
    const adminUser = { id: "admin-1", role: "ADMIN" };
    expect(
      canAccessListingMedia(adminUser, {
        category: hiddenCategory,
        sellerId: "seller-123",
        status: "DRAFT",
      })
    ).toBe(true);
  });

  it("allows the owner Seller to access media for their own non-public listing", () => {
    const ownerUser = { id: "seller-123", role: "SELLER" };
    expect(
      canAccessListingMedia(ownerUser, {
        category: hiddenCategory,
        sellerId: "seller-123",
        status: "DRAFT",
      })
    ).toBe(true);
  });

  it("allows public Buyers access ONLY when listing is PUBLISHED and category & parent are ACTIVE", () => {
    const buyerUser = { id: "buyer-456", role: "BUYER" };
    expect(canAccessListingMedia(buyerUser, listingItem)).toBe(true);
    expect(canAccessListingMedia(null, listingItem)).toBe(true);
  });

  it("denies public Buyers access when listing is not PUBLISHED or category is not ACTIVE", () => {
    const buyerUser = { id: "buyer-456", role: "BUYER" };
    expect(
      canAccessListingMedia(buyerUser, {
        ...listingItem,
        status: "DRAFT",
      })
    ).toBe(false);

    expect(
      canAccessListingMedia(buyerUser, {
        ...listingItem,
        category: hiddenCategory,
      })
    ).toBe(false);
  });
});

describe("listing image upload authorization rules", () => {
  it("allows an eligible seller to upload for a non-archived owned listing", () => {
    expect(
      canUploadListingImage("seller-123", {
        sellerId: "seller-123",
        status: "DRAFT",
      })
    ).toBe(true);
  });

  it("denies uploads for another seller's listing or an archived listing", () => {
    expect(
      canUploadListingImage("seller-123", {
        sellerId: "seller-456",
        status: "DRAFT",
      })
    ).toBe(false);
    expect(
      canUploadListingImage("seller-123", {
        sellerId: "seller-123",
        status: "ARCHIVED",
      })
    ).toBe(false);
  });
});

describe("draft deletion rules", () => {
  it("allows only an unpublished draft to be deleted", () => {
    expect(() => assertDeletableDraft({ status: "DRAFT" })).not.toThrow();
  });

  it("rejects deleting any listing that has left the draft state", () => {
    expect(() => assertDeletableDraft({ status: "PUBLISHED" })).toThrow(
      "Only draft listings can be deleted"
    );
    expect(() => assertDeletableDraft({ status: "PAUSED" })).toThrow(
      "Only draft listings can be deleted"
    );
  });
});
