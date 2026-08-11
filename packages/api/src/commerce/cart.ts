import type { db } from "@avin/db";
import { user as userTable } from "@avin/db/schema/auth";
import {
  listing,
  parentCategory,
  servicePackage,
  subCategory,
} from "@avin/db/schema/catalog";
import type { WarrantyPolicy } from "@avin/db/schema/catalog";
import { cart, cartItem } from "@avin/db/schema/commerce";
import type { WarrantyPolicySnapshot } from "@avin/db/schema/commerce";
import { sellerProfile } from "@avin/db/schema/seller";
import { sellerEnforcement } from "@avin/db/schema/seller-enforcement";
import { ORPCError } from "@orpc/server";
import { and, asc, eq, inArray } from "drizzle-orm";

import { isListingPubliclyAvailable } from "../listing/listing-discovery";
import { selectAvailableServicePackage } from "../listing/service-packages";
import { isSellerEnforcementActive } from "../seller-enforcement/policy";
import { parseListingContract, parseServicePackageContract } from "./contracts";

export interface CartPackageView {
  description: string;
  id: string;
  name: string;
  priceAmount: number;
  processingTimeHours: number;
  status: "AVAILABLE" | "UNAVAILABLE";
  warrantyPolicy: WarrantyPolicy;
}

export type CommerceExecutor = Pick<
  typeof db,
  "delete" | "insert" | "select" | "update"
>;

export interface CartItemView {
  available: boolean;
  cartItemId: string;
  contractFingerprint: string | null;
  listing: {
    categoryId: string;
    description: string | null;
    id: string;
    images: string[];
    priceAmount: number | null;
    processingTimeHours: number | null;
    servicePackages?: CartPackageView[];
    slug: string;
    thumbnailUrl: string | null;
    title: string | null;
    type: "COURSE" | "SERVICE";
    warrantyDurationHours: number | null;
    warrantyTerms: string | null;
  };
  selectedPackageId?: string | null;
  selected: boolean;
  seller: {
    id: string;
    image: string | null;
    name: string;
  };
}

export interface CartView {
  id: string;
  items: CartItemView[];
  selectedCount: number;
  selectedTotalAmount: number;
}

const getOrCreateCart = async (
  executor: CommerceExecutor,
  userId: string
): Promise<typeof cart.$inferSelect> => {
  await executor
    .insert(cart)
    .values({ userId })
    .onConflictDoNothing({ target: cart.userId });

  const [found] = await executor
    .select()
    .from(cart)
    .where(eq(cart.userId, userId))
    .limit(1);

  if (!found) {
    throw new Error("Cart was not created");
  }

  return found;
};

const getSelectedServicePackage = <
  T extends { id: string; status: "AVAILABLE" | "UNAVAILABLE" },
>(
  listingType: "COURSE" | "SERVICE",
  selectedPackageId: string | null,
  listingPackages: readonly T[],
  availablePackages: readonly T[]
): T | undefined => {
  if (listingType !== "SERVICE") {
    return undefined;
  }
  if (selectedPackageId) {
    return listingPackages.find(
      (packageItem) => packageItem.id === selectedPackageId
    );
  }
  if (availablePackages.length === 1) {
    return availablePackages[0];
  }
  return undefined;
};

const getTimedWarranty = (
  policy: WarrantyPolicySnapshot | undefined
): { durationHours: number; terms?: string } | null => {
  if (!policy) {
    return null;
  }
  if ("kind" in policy) {
    if (policy.kind !== "TIMED") {
      return null;
    }
    return {
      durationHours: policy.durationHours,
      terms:
        "terms" in policy ? (policy as { terms?: string }).terms : undefined,
    };
  }
  return { durationHours: policy.durationHours, terms: policy.terms };
};

// oxlint-disable-next-line complexity
export const getCart = async (
  executor: CommerceExecutor,
  userId: string,
  now = new Date()
): Promise<CartView> => {
  const cartRow = await getOrCreateCart(executor, userId);
  const rows = await executor
    .select({
      cartItemId: cartItem.id,
      categoryId: subCategory.id,
      categoryStatus: subCategory.status,
      commissionRatePercent: subCategory.commissionRatePercent,
      description: listing.description,
      images: listing.images,
      listingId: listing.id,
      listingPriceAmount: listing.priceAmount,
      listingSlug: listing.slug,
      listingStatus: listing.status,
      listingThumbnailUrl: listing.thumbnailUrl,
      listingTitle: listing.title,
      listingType: listing.type,
      parentCategoryStatus: parentCategory.status,
      processingTimeHours: listing.processingTimeHours,
      selected: cartItem.selected,
      selectedPackageId: cartItem.servicePackageId,
      sellerAvatarUrl: sellerProfile.avatarUrl,
      sellerEnforcementExpiresAt: sellerEnforcement.expiresAt,
      sellerEnforcementState: sellerEnforcement.state,
      sellerId: userTable.id,
      sellerImage: userTable.image,
      sellerName: userTable.name,
      sellerStorefrontName: sellerProfile.storefrontName,
      warrantyDurationHours: listing.warrantyDurationHours,
      warrantyTerms: listing.warrantyTerms,
    })
    .from(cartItem)
    .innerJoin(cart, eq(cartItem.cartId, cart.id))
    .innerJoin(listing, eq(cartItem.listingId, listing.id))
    .innerJoin(subCategory, eq(listing.categoryId, subCategory.id))
    .innerJoin(parentCategory, eq(subCategory.parentId, parentCategory.id))
    .innerJoin(userTable, eq(listing.sellerId, userTable.id))
    .leftJoin(
      sellerEnforcement,
      eq(listing.sellerId, sellerEnforcement.sellerId)
    )
    .leftJoin(sellerProfile, eq(listing.sellerId, sellerProfile.userId))
    .where(and(eq(cart.id, cartRow.id), eq(cart.userId, userId)))
    .orderBy(asc(cartItem.createdAt), asc(cartItem.id));

  const serviceListingIds: string[] = [];
  for (const row of rows) {
    if (row.listingType === "SERVICE") {
      serviceListingIds.push(row.listingId);
    }
  }
  const packageRows =
    serviceListingIds.length > 0
      ? await executor
          .select()
          .from(servicePackage)
          .where(inArray(servicePackage.listingId, serviceListingIds))
      : [];
  const packagesByListing = new Map<string, typeof packageRows>();
  for (const packageRow of packageRows) {
    const packages = packagesByListing.get(packageRow.listingId) ?? [];
    packages.push(packageRow);
    packagesByListing.set(packageRow.listingId, packages);
  }

  const items: CartItemView[] = [];
  for (const row of rows) {
    const sellerAvailable = !isSellerEnforcementActive(
      {
        expiresAt: row.sellerEnforcementExpiresAt,
        state: row.sellerEnforcementState ?? "CLEAR",
      },
      now
    );
    let available =
      sellerAvailable &&
      isListingPubliclyAvailable(
        row.listingStatus,
        row.categoryStatus,
        row.parentCategoryStatus
      );
    const listingSource = {
      categoryId: row.categoryId,
      description: row.description,
      images: row.images,
      sellerId: row.sellerId,
      slug: row.listingSlug,
      thumbnailUrl: row.listingThumbnailUrl,
      title: row.listingTitle,
      type: row.listingType,
    };
    const listingPackages = (
      packagesByListing.get(row.listingId) ?? []
    ).toSorted(
      (left, right) =>
        left.priceAmount - right.priceAmount ||
        left.name.localeCompare(right.name)
    );
    const availablePackages = listingPackages.filter(
      (packageRow) => packageRow.status === "AVAILABLE"
    );
    const selectedPackage = getSelectedServicePackage(
      row.listingType,
      row.selectedPackageId,
      listingPackages,
      availablePackages
    );
    let contract = null as ReturnType<typeof parseListingContract> | null;
    if (available && row.listingType === "SERVICE") {
      if (!selectedPackage || selectedPackage.status !== "AVAILABLE") {
        available = false;
      } else {
        contract = parseServicePackageContract(
          {
            ...listingSource,
          },
          selectedPackage,
          row.commissionRatePercent
        );
      }
    } else if (available) {
      contract = parseListingContract(
        {
          ...listingSource,
          priceAmount: row.listingPriceAmount,
          processingTimeHours: row.processingTimeHours,
          warrantyDurationHours: row.warrantyDurationHours,
          warrantyTerms: row.warrantyTerms,
        },
        row.commissionRatePercent
      );
    }
    const selectedPolicy = selectedPackage?.warrantyPolicy;
    const timedWarranty =
      getTimedWarranty(contract?.warrantyPolicy) ??
      getTimedWarranty(selectedPolicy) ??
      (row.warrantyDurationHours !== null && row.warrantyTerms
        ? {
            durationHours: row.warrantyDurationHours,
            terms: row.warrantyTerms,
          }
        : null);
    const warrantyDurationHours = timedWarranty?.durationHours ?? null;
    const warrantyTerms = timedWarranty?.terms ?? null;
    const summaryPrice =
      row.listingType === "SERVICE"
        ? (availablePackages[0]?.priceAmount ?? null)
        : row.listingPriceAmount;

    items.push({
      available,
      cartItemId: row.cartItemId,
      contractFingerprint: contract?.fingerprint ?? null,
      listing: {
        categoryId: row.categoryId,
        description: row.description,
        id: row.listingId,
        images: row.images ?? [],
        priceAmount: contract?.priceAmount ?? summaryPrice,
        processingTimeHours:
          contract?.processingTimeHours ??
          selectedPackage?.processingTimeHours ??
          row.processingTimeHours,
        servicePackages: listingPackages.map((packageRow) => ({
          description: packageRow.description,
          id: packageRow.id,
          name: packageRow.name,
          priceAmount: packageRow.priceAmount,
          processingTimeHours: packageRow.processingTimeHours,
          status: packageRow.status,
          warrantyPolicy: packageRow.warrantyPolicy,
        })),
        slug: row.listingSlug,
        thumbnailUrl: row.listingThumbnailUrl,
        title: row.listingTitle,
        type: row.listingType,
        warrantyDurationHours,
        warrantyTerms,
      },
      selected: row.selected,
      selectedPackageId: selectedPackage?.id ?? row.selectedPackageId,
      seller: {
        id: row.sellerId,
        image: row.sellerAvatarUrl ?? row.sellerImage,
        name: row.sellerStorefrontName ?? row.sellerName,
      },
    });
  }

  const selectedItems = items.filter((item) => item.selected);
  return {
    id: cartRow.id,
    items,
    selectedCount: selectedItems.length,
    selectedTotalAmount: selectedItems.reduce(
      (total, item) =>
        total + (item.available ? (item.listing.priceAmount ?? 0) : 0),
      0
    ),
  };
};

export const addToCart = async (
  database: typeof db,
  userId: string,
  listingId: string,
  packageId?: string
): Promise<CartView> => {
  await database.transaction(async (transaction) => {
    const found = await transaction
      .select({ id: listing.id, type: listing.type })
      .from(listing)
      .where(eq(listing.id, listingId))
      .limit(1);

    if (!found[0]) {
      throw new ORPCError("NOT_FOUND", {
        message: "Listing không tồn tại.",
      });
    }

    let selectedPackageId: string | null = null;
    if (found[0].type === "SERVICE") {
      const packages = await transaction
        .select()
        .from(servicePackage)
        .where(eq(servicePackage.listingId, listingId));
      selectedPackageId = selectAvailableServicePackage(packages, packageId).id;
    } else if (packageId) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Course listings do not have Service packages.",
      });
    }

    const cartRow = await getOrCreateCart(transaction, userId);
    await transaction
      .insert(cartItem)
      .values({
        cartId: cartRow.id,
        listingId,
        servicePackageId: selectedPackageId,
      })
      .onConflictDoUpdate({
        set: {
          selected: true,
          servicePackageId: selectedPackageId,
          updatedAt: new Date(),
        },
        target: [cartItem.cartId, cartItem.listingId],
      });
    await transaction
      .update(cart)
      .set({ updatedAt: new Date() })
      .where(eq(cart.id, cartRow.id));
  });

  return getCart(database, userId);
};

export const setCartItemPackage = async (
  database: typeof db,
  userId: string,
  listingId: string,
  packageId: string
): Promise<CartView> => {
  await database.transaction(async (transaction) => {
    const [found] = await transaction
      .select({
        cartItemId: cartItem.id,
        listingType: listing.type,
      })
      .from(cartItem)
      .innerJoin(cart, eq(cartItem.cartId, cart.id))
      .innerJoin(listing, eq(cartItem.listingId, listing.id))
      .where(and(eq(cart.userId, userId), eq(cartItem.listingId, listingId)))
      .for("update")
      .limit(1);
    if (!found) {
      throw new ORPCError("NOT_FOUND", {
        message: "Listing không có trong Cart.",
      });
    }
    if (found.listingType !== "SERVICE") {
      throw new ORPCError("BAD_REQUEST", {
        message: "Course listings do not have Service packages.",
      });
    }

    const packages = await transaction
      .select()
      .from(servicePackage)
      .where(eq(servicePackage.listingId, listingId));
    const selected = selectAvailableServicePackage(packages, packageId);
    await transaction
      .update(cartItem)
      .set({ servicePackageId: selected.id, updatedAt: new Date() })
      .where(eq(cartItem.id, found.cartItemId));
  });

  return getCart(database, userId);
};

export const setCartItemSelected = async (
  database: typeof db,
  userId: string,
  listingId: string,
  selected: boolean
): Promise<CartView> => {
  await database.transaction(async (transaction) => {
    const [item] = await transaction
      .select({ cartItemId: cartItem.id })
      .from(cartItem)
      .innerJoin(cart, eq(cartItem.cartId, cart.id))
      .where(and(eq(cart.userId, userId), eq(cartItem.listingId, listingId)))
      .for("update")
      .limit(1);

    if (!item) {
      throw new ORPCError("NOT_FOUND", {
        message: "Listing không có trong Cart.",
      });
    }

    await transaction
      .update(cartItem)
      .set({ selected, updatedAt: new Date() })
      .where(eq(cartItem.id, item.cartItemId));
  });

  return getCart(database, userId);
};

export const removeFromCart = async (
  database: typeof db,
  userId: string,
  listingId: string
): Promise<CartView> => {
  await database.transaction(async (transaction) => {
    const [item] = await transaction
      .select({ cartItemId: cartItem.id })
      .from(cartItem)
      .innerJoin(cart, eq(cartItem.cartId, cart.id))
      .where(and(eq(cart.userId, userId), eq(cartItem.listingId, listingId)))
      .for("update")
      .limit(1);

    if (!item) {
      throw new ORPCError("NOT_FOUND", {
        message: "Listing không có trong Cart.",
      });
    }

    await transaction.delete(cartItem).where(eq(cartItem.id, item.cartItemId));
    await transaction
      .update(cart)
      .set({ updatedAt: new Date() })
      .where(eq(cart.userId, userId));
  });

  return getCart(database, userId);
};
