import { describe, expect, it } from "vitest";

import type { CartView, ListingForCart } from "./cart-cache";
import {
  addCartItemOptimistically,
  removeCartItemOptimistically,
  setCartItemSelectedOptimistically,
} from "./cart-cache";

const existingItem: CartView["items"][number] = {
  available: true,
  cartItemId: "item-1",
  contractFingerprint: "fingerprint-1",
  listing: {
    categoryId: "category-1",
    description: "Existing listing",
    id: "listing-1",
    images: [],
    priceAmount: 100_000,
    processingTimeHours: 24,
    slug: "listing-1",
    thumbnailUrl: null,
    title: "Existing listing",
    type: "SERVICE",
    warrantyDurationHours: 72,
    warrantyTerms: "Warranty",
  },
  selected: true,
  seller: { id: "seller-1", image: null, name: "Seller" },
};

const cart: CartView = {
  id: "cart-1",
  items: [existingItem],
  selectedCount: 1,
  selectedTotalAmount: 100_000,
};

const listing: ListingForCart = {
  category: { id: "category-1" },
  description: "New listing",
  id: "listing-2",
  images: [],
  priceAmount: 150_000,
  processingTimeHours: 48,
  seller: { id: "seller-1", image: null, name: "Seller" },
  slug: "listing-2",
  thumbnailUrl: null,
  title: "New listing",
  type: "SERVICE",
  warrantyDurationHours: 72,
  warrantyTerms: "Warranty",
};

describe("cart cache optimistic updates", () => {
  it("creates an optimistic cart when the cart query has not resolved yet", () => {
    const nextCart = addCartItemOptimistically(undefined, listing);

    expect(nextCart?.items).toHaveLength(1);
    expect(nextCart?.selectedCount).toBe(1);
    expect(nextCart?.selectedTotalAmount).toBe(150_000);
  });

  it("adds a unique listing and updates the selected summary immediately", () => {
    const nextCart = addCartItemOptimistically(cart, listing);

    expect(nextCart?.items.map((item) => item.listing.id)).toEqual([
      "listing-1",
      "listing-2",
    ]);
    expect(nextCart?.selectedCount).toBe(2);
    expect(nextCart?.selectedTotalAmount).toBe(250_000);
  });

  it("does not increment the count when the listing is already in the cart", () => {
    const nextCart = addCartItemOptimistically(cart, {
      ...listing,
      id: existingItem.listing.id,
    });

    expect(nextCart).toBe(cart);
  });

  it("removes a selected listing and rolls its amount out of the summary", () => {
    const nextCart = removeCartItemOptimistically(
      cart,
      existingItem.listing.id
    );

    expect(nextCart?.items).toHaveLength(0);
    expect(nextCart?.selectedCount).toBe(0);
    expect(nextCart?.selectedTotalAmount).toBe(0);
  });

  it("deselects a listing and rolls its amount out of the summary", () => {
    const nextCart = setCartItemSelectedOptimistically(
      cart,
      existingItem.listing.id,
      false
    );

    expect(nextCart?.items[0]?.selected).toBe(false);
    expect(nextCart?.selectedCount).toBe(0);
    expect(nextCart?.selectedTotalAmount).toBe(0);
  });

  it("keeps the latest selection when the same listing is toggled repeatedly", () => {
    const deselectedCart = setCartItemSelectedOptimistically(
      cart,
      existingItem.listing.id,
      false
    );
    const nextCart = setCartItemSelectedOptimistically(
      deselectedCart,
      existingItem.listing.id,
      true
    );

    expect(nextCart?.items[0]?.selected).toBe(true);
    expect(nextCart?.selectedCount).toBe(1);
    expect(nextCart?.selectedTotalAmount).toBe(100_000);
  });

  it("counts an unavailable selected listing without adding it to the total", () => {
    const unavailableCart: CartView = {
      ...cart,
      items: [{ ...existingItem, available: false, selected: false }],
      selectedCount: 0,
      selectedTotalAmount: 0,
    };

    const nextCart = setCartItemSelectedOptimistically(
      unavailableCart,
      existingItem.listing.id,
      true
    );

    expect(nextCart?.selectedCount).toBe(1);
    expect(nextCart?.selectedTotalAmount).toBe(0);
  });
});
