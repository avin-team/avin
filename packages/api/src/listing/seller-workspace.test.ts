import { describe, expect, it } from "vitest";

import {
  assertDeletableDraft,
  canAccessListingMedia,
  canUploadListingImage,
} from "./seller-workspace";

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
