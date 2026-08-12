import { db } from "@avin/db";
import { listing, servicePackage, subCategory } from "@avin/db/schema/catalog";
import { sellerProfile } from "@avin/db/schema/seller";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull } from "drizzle-orm";

import { createNotificationEvent } from "../notifications/notification";
import { assertStoreProfileComplete } from "../seller-store/public-visibility";
import {
  assertCourseListingContract,
  assertListingPresentation,
  getPrimaryListingImage,
} from "./listing-publication-contract";
import { assertEligibleSeller } from "./seller-listing-access";
import {
  assertServicePackagesPublishable,
  parseServicePackageDraft,
  toLegacyServicePackageDraft,
} from "./service-packages";

type Database = typeof db;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type PublicationExecutor = Database | Transaction;

interface SellerListingCommand {
  database?: Database;
  listingId: string;
  sellerId: string;
}

interface RestoreListingCommand {
  database?: Database;
  listingId: string;
}

type ListingRow = NonNullable<
  Awaited<ReturnType<Database["query"]["listing"]["findFirst"]>>
>;

type CategoryRow = NonNullable<
  Awaited<ReturnType<Database["query"]["subCategory"]["findFirst"]>>
>;

const getActiveCategory = async (
  executor: PublicationExecutor,
  categoryId: string
): Promise<CategoryRow> => {
  const category = await executor.query.subCategory.findFirst({
    where: and(
      eq(subCategory.id, categoryId),
      eq(subCategory.status, "ACTIVE")
    ),
    with: { parentCategory: { columns: { status: true } } },
  });
  if (!category || category.parentCategory.status !== "ACTIVE") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Listing category must be active",
    });
  }
  return category;
};

const assertStoreReadyForPublication = async (
  executor: PublicationExecutor,
  sellerId: string
): Promise<void> => {
  const profile = await executor.query.sellerProfile.findFirst({
    where: eq(sellerProfile.userId, sellerId),
  });
  assertStoreProfileComplete(profile);
};

const prepareServicePackages = async (
  executor: PublicationExecutor,
  listingItem: ListingRow,
  category: CategoryRow,
  missingPackageMessage: string
): Promise<void> => {
  assertListingPresentation(listingItem);
  let packages = await executor.query.servicePackage.findMany({
    where: eq(servicePackage.listingId, listingItem.id),
  });
  if (packages.length === 0) {
    const legacyDraft = toLegacyServicePackageDraft(listingItem);
    if (!legacyDraft) {
      throw new ORPCError("BAD_REQUEST", { message: missingPackageMessage });
    }
    const packageDraft = parseServicePackageDraft(legacyDraft, category);
    await executor.insert(servicePackage).values({
      listingId: listingItem.id,
      ...packageDraft,
    });
    packages = await executor.query.servicePackage.findMany({
      where: eq(servicePackage.listingId, listingItem.id),
    });
  }
  assertServicePackagesPublishable(packages, category);
};

const markServicePackagesPublished = async (
  executor: PublicationExecutor,
  listingId: string,
  publishedAt: Date
): Promise<void> => {
  await executor
    .update(servicePackage)
    .set({ firstPublishedAt: publishedAt, updatedAt: publishedAt })
    .where(
      and(
        eq(servicePackage.listingId, listingId),
        isNull(servicePackage.firstPublishedAt)
      )
    );
};

const transitionToPublished = async (
  executor: PublicationExecutor,
  listingItem: ListingRow,
  publishedAt: Date
): Promise<ListingRow> => {
  const [published] = await executor
    .update(listing)
    .set({
      status: "PUBLISHED",
      thumbnailUrl: getPrimaryListingImage(
        listingItem.images,
        listingItem.thumbnailUrl
      ),
      updatedAt: publishedAt,
    })
    .where(eq(listing.id, listingItem.id))
    .returning();
  if (!published) {
    throw new ORPCError("NOT_FOUND", { message: "Listing not found" });
  }
  if (listingItem.type === "SERVICE") {
    await markServicePackagesPublished(executor, listingItem.id, publishedAt);
  }
  return published;
};

const preparePublication = async (
  executor: PublicationExecutor,
  listingItem: ListingRow,
  missingPackageMessage: string
): Promise<void> => {
  const category = await getActiveCategory(executor, listingItem.categoryId);
  if (listingItem.type === "SERVICE") {
    await prepareServicePackages(
      executor,
      listingItem,
      category,
      missingPackageMessage
    );
    return;
  }
  assertCourseListingContract(listingItem, category);
};

export const publishListing = ({
  database = db,
  listingId,
  sellerId,
}: SellerListingCommand): Promise<ListingRow> =>
  database.transaction(async (transaction) => {
    await assertEligibleSeller(transaction, sellerId);
    await assertStoreReadyForPublication(transaction, sellerId);
    const draft = await transaction.query.listing.findFirst({
      where: and(
        eq(listing.id, listingId),
        eq(listing.sellerId, sellerId),
        eq(listing.status, "DRAFT")
      ),
    });
    if (!draft) {
      throw new ORPCError("NOT_FOUND", { message: "Draft listing not found" });
    }
    await preparePublication(
      transaction,
      draft,
      "A Service listing must define at least one package before publishing"
    );
    return transitionToPublished(transaction, draft, new Date());
  });

export const resumeListing = ({
  database = db,
  listingId,
  sellerId,
}: SellerListingCommand): Promise<ListingRow> =>
  database.transaction(async (transaction) => {
    await assertEligibleSeller(transaction, sellerId);
    await assertStoreReadyForPublication(transaction, sellerId);
    const found = await transaction.query.listing.findFirst({
      where: and(eq(listing.id, listingId), eq(listing.sellerId, sellerId)),
    });
    if (!found) {
      throw new ORPCError("NOT_FOUND", { message: "Listing not found" });
    }
    if (found.status !== "PAUSED") {
      throw new ORPCError("BAD_REQUEST", {
        message: "Only paused listings can be resumed",
      });
    }
    await preparePublication(
      transaction,
      found,
      "A Service listing must define at least one package before publishing"
    );
    return transitionToPublished(transaction, found, new Date());
  });

export const restoreListing = ({
  database = db,
  listingId,
}: RestoreListingCommand): Promise<ListingRow> =>
  database.transaction(async (transaction) => {
    const found = await transaction.query.listing.findFirst({
      where: eq(listing.id, listingId),
    });
    if (!found) {
      throw new ORPCError("NOT_FOUND", { message: "Listing not found" });
    }
    if (found.status !== "HIDDEN") {
      throw new ORPCError("BAD_REQUEST", {
        message: "Only hidden listings can be restored",
      });
    }
    await assertEligibleSeller(transaction, found.sellerId);
    await assertStoreReadyForPublication(transaction, found.sellerId);
    await preparePublication(
      transaction,
      found,
      "A Service listing must define at least one package before restore"
    );
    const restoredAt = new Date();
    const restored = await transitionToPublished(
      transaction,
      found,
      restoredAt
    );
    await createNotificationEvent(transaction, {
      body: "Sản phẩm/dịch vụ của bạn đã được khôi phục trên sàn.",
      context: { listingId: restored.id, status: restored.status },
      eventType: "listing.restored",
      recipients: [{ targetPath: "/seller/store", userId: found.sellerId }],
      sourceId: `${restored.id}:${restored.status}:${restoredAt.toISOString()}`,
      sourceType: "LISTING",
      title: "Sản phẩm/dịch vụ đã được khôi phục",
    });
    return restored;
  });
