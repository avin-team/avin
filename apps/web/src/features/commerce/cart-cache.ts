import type { AppRouterClient } from "@avin/api/router";

export type CartView = Awaited<
  ReturnType<AppRouterClient["commerce"]["cart"]["get"]>
>;

export type ListingDetail = Awaited<
  ReturnType<AppRouterClient["listing"]["discovery"]["listingById"]>
>;

export type ListingForCart = Pick<
  ListingDetail,
  | "description"
  | "id"
  | "images"
  | "priceAmount"
  | "processingTimeHours"
  | "serviceInputFields"
  | "slug"
  | "thumbnailUrl"
  | "title"
  | "type"
  | "warrantyDurationHours"
  | "warrantyTerms"
> & {
  category: { id: string };
  seller: { id: string; image: string | null; name: string };
  servicePackages?: ListingDetail["servicePackages"];
};

// oxlint-disable-next-line complexity
export const addCartItemOptimistically = (
  cart: CartView | undefined,
  listing: ListingForCart,
  selectedPackageId?: string | null
): CartView | undefined => {
  if (cart?.items.some((item) => item.listing.id === listing.id)) {
    return cart;
  }

  const servicePackages = listing.servicePackages ?? [];
  const selectedPackage = servicePackages.find(
    (packageItem) => packageItem.id === selectedPackageId
  );
  const packageWarranty = selectedPackage?.warrantyPolicy;
  const optimisticItem: CartView["items"][number] = {
    available: true,
    cartItemId: `optimistic-${listing.id}`,
    contractFingerprint: null,
    listing: {
      categoryId: listing.category.id,
      description: listing.description,
      id: listing.id,
      images: listing.images ?? [],
      priceAmount: selectedPackage?.priceAmount ?? listing.priceAmount,
      processingTimeHours:
        selectedPackage?.processingTimeHours ?? listing.processingTimeHours,
      serviceInputFields:
        selectedPackage?.serviceInputFields ?? listing.serviceInputFields ?? [],
      servicePackages,
      slug: listing.slug,
      thumbnailUrl: listing.thumbnailUrl,
      title: listing.title,
      type: listing.type,
      warrantyDurationHours:
        packageWarranty?.kind === "TIMED"
          ? packageWarranty.durationHours
          : listing.warrantyDurationHours,
      warrantyTerms:
        packageWarranty?.kind === "TIMED"
          ? packageWarranty.terms
          : listing.warrantyTerms,
    },
    selected: true,
    selectedPackageId: selectedPackage?.id ?? selectedPackageId ?? null,
    seller: {
      id: listing.seller.id,
      image: listing.seller.image,
      name: listing.seller.name,
    },
  };

  if (!cart) {
    return {
      id: "optimistic-cart",
      items: [optimisticItem],
      selectedCount: 1,
      selectedTotalAmount:
        selectedPackage?.priceAmount ?? listing.priceAmount ?? 0,
    };
  }

  return {
    ...cart,
    items: [...cart.items, optimisticItem],
    selectedCount: cart.selectedCount + 1,
    selectedTotalAmount:
      cart.selectedTotalAmount +
      (selectedPackage?.priceAmount ?? listing.priceAmount ?? 0),
  };
};

export const removeCartItemOptimistically = (
  cart: CartView | undefined,
  listingId: string
): CartView | undefined => {
  if (!cart) {
    return cart;
  }

  const removedItem = cart.items.find((item) => item.listing.id === listingId);
  if (!removedItem) {
    return cart;
  }

  const selectedCount = removedItem.selected
    ? cart.selectedCount - 1
    : cart.selectedCount;
  const selectedTotalAmount =
    removedItem.selected && removedItem.available
      ? cart.selectedTotalAmount - (removedItem.listing.priceAmount ?? 0)
      : cart.selectedTotalAmount;

  return {
    ...cart,
    items: cart.items.filter((item) => item.listing.id !== listingId),
    selectedCount: Math.max(0, selectedCount),
    selectedTotalAmount: Math.max(0, selectedTotalAmount),
  };
};

export const setCartItemSelectedOptimistically = (
  cart: CartView | undefined,
  listingId: string,
  selected: boolean
): CartView | undefined => {
  if (!cart) {
    return cart;
  }

  const targetItem = cart.items.find((item) => item.listing.id === listingId);
  if (!targetItem || targetItem.selected === selected) {
    return cart;
  }

  const selectedCount = selected
    ? cart.selectedCount + 1
    : cart.selectedCount - 1;
  const priceDelta = targetItem.available
    ? (targetItem.listing.priceAmount ?? 0) * (selected ? 1 : -1)
    : 0;

  return {
    ...cart,
    items: cart.items.map((item) =>
      item.listing.id === listingId ? { ...item, selected } : item
    ),
    selectedCount: Math.max(0, selectedCount),
    selectedTotalAmount: Math.max(0, cart.selectedTotalAmount + priceDelta),
  };
};
