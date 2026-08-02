import type { db } from "@avin/db";
import { user as userTable } from "@avin/db/schema/auth";
import { listing, parentCategory, subCategory } from "@avin/db/schema/catalog";
import type { ServiceInputField } from "@avin/db/schema/catalog";
import { cart, cartItem } from "@avin/db/schema/commerce";
import { ORPCError } from "@orpc/server";
import { and, asc, eq } from "drizzle-orm";

import { isListingPubliclyAvailable } from "../listing/listing-discovery";
import { parseListingContract } from "./contracts";

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
    serviceInputFields: ServiceInputField[];
    slug: string;
    thumbnailUrl: string | null;
    title: string | null;
    type: "COURSE" | "SERVICE";
    warrantyDurationHours: number | null;
    warrantyTerms: string | null;
  };
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
      sellerBanned: userTable.banned,
      sellerBanExpires: userTable.banExpires,
      sellerId: userTable.id,
      sellerImage: userTable.image,
      sellerName: userTable.name,
      selected: cartItem.selected,
      serviceInputFields: listing.serviceInputFields,
      warrantyDurationHours: listing.warrantyDurationHours,
      warrantyTerms: listing.warrantyTerms,
    })
    .from(cartItem)
    .innerJoin(cart, eq(cartItem.cartId, cart.id))
    .innerJoin(listing, eq(cartItem.listingId, listing.id))
    .innerJoin(subCategory, eq(listing.categoryId, subCategory.id))
    .innerJoin(parentCategory, eq(subCategory.parentId, parentCategory.id))
    .innerJoin(userTable, eq(listing.sellerId, userTable.id))
    .where(and(eq(cart.id, cartRow.id), eq(cart.userId, userId)))
    .orderBy(asc(cartItem.createdAt), asc(cartItem.id));

  const items: CartItemView[] = [];
  for (const row of rows) {
    const sellerAvailable =
      !row.sellerBanned &&
      (row.sellerBanExpires === null || row.sellerBanExpires <= now);
    const available =
      sellerAvailable &&
      isListingPubliclyAvailable(
        row.listingStatus,
        row.categoryStatus,
        row.parentCategoryStatus
      );
    const contract = available
      ? parseListingContract(
          {
            categoryId: row.categoryId,
            description: row.description,
            images: row.images,
            priceAmount: row.listingPriceAmount,
            processingTimeHours: row.processingTimeHours,
            sellerId: row.sellerId,
            serviceInputFields: row.serviceInputFields,
            slug: row.listingSlug,
            thumbnailUrl: row.listingThumbnailUrl,
            title: row.listingTitle,
            type: row.listingType,
            warrantyDurationHours: row.warrantyDurationHours,
            warrantyTerms: row.warrantyTerms,
          },
          row.commissionRatePercent
        )
      : null;

    items.push({
      available,
      cartItemId: row.cartItemId,
      contractFingerprint: contract?.fingerprint ?? null,
      listing: {
        categoryId: row.categoryId,
        description: row.description,
        id: row.listingId,
        images: row.images ?? [],
        priceAmount: row.listingPriceAmount,
        processingTimeHours: row.processingTimeHours,
        serviceInputFields: contract?.serviceInputFields ?? [],
        slug: row.listingSlug,
        thumbnailUrl: row.listingThumbnailUrl,
        title: row.listingTitle,
        type: row.listingType,
        warrantyDurationHours: row.warrantyDurationHours,
        warrantyTerms: row.warrantyTerms,
      },
      selected: row.selected,
      seller: {
        id: row.sellerId,
        image: row.sellerImage,
        name: row.sellerName,
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
  listingId: string
): Promise<CartView> => {
  await database.transaction(async (transaction) => {
    const found = await transaction
      .select({ id: listing.id })
      .from(listing)
      .where(eq(listing.id, listingId))
      .limit(1);

    if (!found[0]) {
      throw new ORPCError("NOT_FOUND", {
        message: "Listing không tồn tại.",
      });
    }

    const cartRow = await getOrCreateCart(transaction, userId);
    await transaction
      .insert(cartItem)
      .values({ cartId: cartRow.id, listingId })
      .onConflictDoNothing({
        target: [cartItem.cartId, cartItem.listingId],
      });
    await transaction
      .update(cart)
      .set({ updatedAt: new Date() })
      .where(eq(cart.id, cartRow.id));
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
