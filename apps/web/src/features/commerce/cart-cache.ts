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

const createOptimisticCartItem = (
  listing: ListingForCart,
  selectedPackageId?: string | null,
  quantity = 1
): CartView["items"][number] => {
  const servicePackages = listing.servicePackages ?? [];
  const selectedPackage = servicePackages.find(
    (packageItem) => packageItem.id === selectedPackageId
  );
  const packageWarranty = selectedPackage?.warrantyPolicy;
  let { warrantyTerms } = listing;
  if (packageWarranty?.kind === "TIMED" && "terms" in packageWarranty) {
    warrantyTerms = (packageWarranty as { terms?: string }).terms ?? null;
  }

  return {
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
      servicePackages,
      slug: listing.slug,
      thumbnailUrl: listing.thumbnailUrl,
      title: listing.title,
      type: listing.type,
      warrantyDurationHours:
        packageWarranty?.kind === "TIMED"
          ? packageWarranty.durationHours
          : listing.warrantyDurationHours,
      warrantyTerms,
    },
    quantity: listing.type === "COURSE" ? 1 : Math.max(1, quantity),
    selected: true,
    selectedPackageId: selectedPackage?.id ?? selectedPackageId ?? null,
    seller: {
      id: listing.seller.id,
      image: listing.seller.image,
      name: listing.seller.name,
    },
  };
};

export const addCartItemOptimistically = (
  cart: CartView | undefined,
  listing: ListingForCart,
  selectedPackageId?: string | null,
  quantity = 1
): CartView | undefined => {
  const addQty = listing.type === "COURSE" ? 1 : Math.max(1, quantity);

  if (cart?.items.some((item) => item.listing.id === listing.id)) {
    const targetItem = cart.items.find(
      (item) => item.listing.id === listing.id
    );
    if (!targetItem) {
      return cart;
    }
    const newQuantity =
      listing.type === "COURSE" ? 1 : targetItem.quantity + addQty;
    const currentPrice = targetItem.listing.priceAmount ?? 0;
    const quantityDelta = targetItem.selected
      ? newQuantity - targetItem.quantity
      : newQuantity;
    const priceDelta = targetItem.available ? currentPrice * quantityDelta : 0;

    return {
      ...cart,
      items: cart.items.map((item) =>
        item.listing.id === listing.id
          ? {
              ...item,
              quantity: newQuantity,
              selected: true,
              selectedPackageId: selectedPackageId ?? item.selectedPackageId,
            }
          : item
      ),
      selectedCount: targetItem.selected
        ? cart.selectedCount
        : cart.selectedCount + 1,
      selectedTotalAmount: cart.selectedTotalAmount + priceDelta,
    };
  }

  const optimisticItem = createOptimisticCartItem(
    listing,
    selectedPackageId,
    addQty
  );
  const optimisticPrice =
    (optimisticItem.listing.priceAmount ?? 0) * optimisticItem.quantity;

  if (!cart) {
    return {
      id: "optimistic-cart",
      items: [optimisticItem],
      selectedCount: 1,
      selectedTotalAmount: optimisticPrice,
    };
  }

  return {
    ...cart,
    items: [...cart.items, optimisticItem],
    selectedCount: cart.selectedCount + 1,
    selectedTotalAmount: cart.selectedTotalAmount + optimisticPrice,
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
      ? cart.selectedTotalAmount -
        (removedItem.listing.priceAmount ?? 0) * removedItem.quantity
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
    ? (targetItem.listing.priceAmount ?? 0) *
      targetItem.quantity *
      (selected ? 1 : -1)
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

export const setCartItemPackageOptimistically = (
  cart: CartView | undefined,
  listingId: string,
  packageId: string
): CartView | undefined => {
  if (!cart) {
    return cart;
  }

  const targetItem = cart.items.find((item) => item.listing.id === listingId);
  if (!targetItem) {
    return cart;
  }

  const selectedPackage = targetItem.listing.servicePackages?.find(
    (pkg) => pkg.id === packageId
  );
  if (!selectedPackage) {
    return cart;
  }

  const oldPackage = targetItem.listing.servicePackages?.find(
    (pkg) => pkg.id === targetItem.selectedPackageId
  );
  const oldPrice = oldPackage
    ? oldPackage.priceAmount
    : (targetItem.listing.priceAmount ?? 0);
  const newPrice = selectedPackage.priceAmount;
  const priceDelta = (newPrice - oldPrice) * targetItem.quantity;

  return {
    ...cart,
    items: cart.items.map((item) =>
      item.listing.id === listingId
        ? { ...item, selectedPackageId: packageId }
        : item
    ),
    selectedTotalAmount:
      targetItem.selected && targetItem.available
        ? Math.max(0, cart.selectedTotalAmount + priceDelta)
        : cart.selectedTotalAmount,
  };
};

export const setCartItemQuantityOptimistically = (
  cart: CartView | undefined,
  listingId: string,
  quantity: number
): CartView | undefined => {
  if (!cart) {
    return cart;
  }

  const targetItem = cart.items.find((item) => item.listing.id === listingId);
  if (!targetItem) {
    return cart;
  }

  const finalQuantity =
    targetItem.listing.type === "COURSE" ? 1 : Math.max(1, quantity);
  if (targetItem.quantity === finalQuantity) {
    return cart;
  }

  const qtyDelta = finalQuantity - targetItem.quantity;
  const currentPkg = targetItem.listing.servicePackages?.find(
    (pkg) => pkg.id === targetItem.selectedPackageId
  );
  const currentPrice = currentPkg
    ? currentPkg.priceAmount
    : (targetItem.listing.priceAmount ?? 0);
  const priceDelta =
    targetItem.selected && targetItem.available ? currentPrice * qtyDelta : 0;

  return {
    ...cart,
    items: cart.items.map((item) =>
      item.listing.id === listingId
        ? { ...item, quantity: finalQuantity }
        : item
    ),
    selectedTotalAmount: Math.max(0, cart.selectedTotalAmount + priceDelta),
  };
};

export const reconcileCartItemPackageMutation = (
  currentCart: CartView | undefined,
  mutationCart: CartView | undefined,
  listingId: string,
  packageId: string
): CartView | undefined => {
  if (!currentCart) {
    return mutationCart;
  }

  const currentItem = currentCart.items.find(
    (item) => item.listing.id === listingId
  );
  if (currentItem?.selectedPackageId !== packageId) {
    return currentCart;
  }

  return mutationCart;
};
