import { and, eq, inArray } from "drizzle-orm";

import { db } from "./index";
import { user } from "./schema/auth";
import {
  listing,
  parentCategory,
  servicePackage,
  subCategory,
} from "./schema/catalog";
import { sellerApplication, sellerProfile } from "./schema/seller";
import { sellerEnforcement } from "./schema/seller-enforcement";
import {
  createSellerListingSlug,
  getSellerListingImageUrl,
  parseSellerListingSeedArguments,
  SELLER_LISTING_SEEDS,
} from "./seller-listing-seed-data";
import type { SellerListingSeed } from "./seller-listing-seed-data";

const PROCESSING_TIME_HOURS = 72;
const CURRENT_SELLER_AGREEMENT_VERSION = "v1.0";
const SELLER_LISTING_PACKAGE_COUNT = SELLER_LISTING_SEEDS.reduce(
  (total, seed) => total + seed.packages.length,
  0
);
const VND_FORMATTER = new Intl.NumberFormat("vi-VN", {
  currency: "VND",
  maximumFractionDigits: 0,
  style: "currency",
});

interface SeedCategory {
  defaultWarrantyDurationHours: number;
  id: string;
  name: string;
  parentName: string;
}

interface SellerSeedTarget {
  avatarUrl: string | null;
  bio: string | null;
  id: string;
  storefrontName: string;
  storeSlug: string;
  userId: string;
}

const categoryKey = (parentSlug: string, subCategorySlug: string): string =>
  `${parentSlug}/${subCategorySlug}`;

const getRequiredCategories = async (): Promise<Map<string, SeedCategory>> => {
  const parentSlugs = [
    ...new Set(SELLER_LISTING_SEEDS.map((seed) => seed.category.parentSlug)),
  ];
  const subCategorySlugs = [
    ...new Set(
      SELLER_LISTING_SEEDS.map((seed) => seed.category.subCategorySlug)
    ),
  ];
  const categories = await db
    .select({
      defaultWarrantyPolicy: subCategory.defaultWarrantyPolicy,
      id: subCategory.id,
      name: subCategory.name,
      parentName: parentCategory.name,
      parentSlug: parentCategory.slug,
      subCategorySlug: subCategory.slug,
    })
    .from(subCategory)
    .innerJoin(parentCategory, eq(parentCategory.id, subCategory.parentId))
    .where(
      and(
        eq(parentCategory.status, "ACTIVE"),
        eq(subCategory.status, "ACTIVE"),
        inArray(parentCategory.slug, parentSlugs),
        inArray(subCategory.slug, subCategorySlugs)
      )
    );
  const categoryMap = new Map<string, SeedCategory>();

  for (const category of categories) {
    categoryMap.set(
      categoryKey(category.parentSlug, category.subCategorySlug),
      {
        defaultWarrantyDurationHours:
          category.defaultWarrantyPolicy.durationHours,
        id: category.id,
        name: category.name,
        parentName: category.parentName,
      }
    );
  }

  const missingCategory = SELLER_LISTING_SEEDS.find(
    (seed) =>
      !categoryMap.has(
        categoryKey(seed.category.parentSlug, seed.category.subCategorySlug)
      )
  );

  if (missingCategory) {
    throw new Error(
      `Required active category is missing: ${categoryKey(
        missingCategory.category.parentSlug,
        missingCategory.category.subCategorySlug
      )}. Run the category seed first.`
    );
  }

  return categoryMap;
};

const getSellerSeedTarget = async (
  sellerProfileId: string
): Promise<SellerSeedTarget> => {
  const target = await db.query.sellerProfile.findFirst({
    columns: {
      avatarUrl: true,
      bio: true,
      id: true,
      storeSlug: true,
      storefrontName: true,
      userId: true,
    },
    where: (table, { eq: equals }) => equals(table.id, sellerProfileId),
  });

  if (!target) {
    throw new Error(`Seller profile not found: ${sellerProfileId}`);
  }

  return target;
};

const getSellerListingCount = async (sellerId: string): Promise<number> => {
  const existingListings = await db.query.listing.findMany({
    columns: { id: true },
    where: (table, { eq: equals }) => equals(table.sellerId, sellerId),
  });

  return existingListings.length;
};

const assertSellerCanPublish = async (
  target: SellerSeedTarget
): Promise<void> => {
  const [account, application, enforcement] = await Promise.all([
    db.query.user.findFirst({
      columns: { role: true },
      where: eq(user.id, target.userId),
    }),
    db.query.sellerApplication.findFirst({
      columns: { sellerAgreementVersion: true, status: true },
      orderBy: (table, { desc }) => [desc(table.createdAt)],
      where: eq(sellerApplication.userId, target.userId),
    }),
    db.query.sellerEnforcement.findFirst({
      columns: { state: true },
      where: eq(sellerEnforcement.sellerId, target.userId),
    }),
  ]);
  const profileComplete = Boolean(
    target.storefrontName.trim() &&
    target.storeSlug.trim() &&
    target.bio?.trim() &&
    target.avatarUrl?.trim()
  );
  const sellerEligible =
    account?.role === "SELLER" &&
    application?.status === "APPROVED" &&
    application.sellerAgreementVersion === CURRENT_SELLER_AGREEMENT_VERSION &&
    (enforcement?.state ?? "CLEAR") === "CLEAR";

  if (!sellerEligible || !profileComplete) {
    throw new Error(
      "Seller is not eligible to publish: require SELLER role, approved current agreement, complete storefront, and clear enforcement"
    );
  }
};

const formatPrice = (priceAmount: number): string =>
  VND_FORMATTER.format(priceAmount);

const getCategory = (
  categories: Map<string, SeedCategory>,
  seed: SellerListingSeed
): SeedCategory => {
  const key = categoryKey(
    seed.category.parentSlug,
    seed.category.subCategorySlug
  );
  const category = categories.get(key);

  if (!category) {
    throw new Error(`Required active category is missing: ${key}`);
  }

  return category;
};

const printPreview = (
  target: SellerSeedTarget,
  categories: Map<string, SeedCategory>,
  dryRun: boolean,
  existingListingCount: number
): void => {
  const lines = [
    `${dryRun ? "Would seed" : "Seeding"} seller: ${target.storefrontName}`,
    `Seller profile: ${target.id}`,
    `Seller user: ${target.userId}`,
    `${dryRun ? "Would delete" : "Replacing"} existing listings: ${existingListingCount}`,
    `Publishing listings: ${SELLER_LISTING_SEEDS.length}; packages: ${SELLER_LISTING_PACKAGE_COUNT}`,
  ];

  for (const seed of SELLER_LISTING_SEEDS) {
    const category = getCategory(categories, seed);
    const imageUrl = getSellerListingImageUrl(seed.category.parentSlug);
    lines.push(
      `\n- ${seed.title}`,
      `  Category: ${category.parentName} > ${category.name}`,
      `  Slug: ${createSellerListingSlug(target.storeSlug, seed.slugSuffix)}`,
      `  Image: ${imageUrl}`
    );

    for (const packageSeed of seed.packages) {
      lines.push(
        `  Package: ${packageSeed.name} — ${formatPrice(packageSeed.priceAmount)}`
      );
    }
  }

  process.stdout.write(`${lines.join("\n")}\n`);
};

const seedSellerListings = async (): Promise<void> => {
  const { dryRun, sellerProfileId } = parseSellerListingSeedArguments(
    Bun.argv.slice(2)
  );
  const [categories, target] = await Promise.all([
    getRequiredCategories(),
    getSellerSeedTarget(sellerProfileId),
  ]);

  const [existingListingCount] = await Promise.all([
    getSellerListingCount(target.userId),
    assertSellerCanPublish(target),
  ]);

  if (dryRun) {
    printPreview(target, categories, dryRun, existingListingCount);
    process.stdout.write("Dry run complete; no data was written.\n");
    return;
  }

  printPreview(target, categories, dryRun, existingListingCount);

  await db.transaction(async (transaction) => {
    const [lockedTarget] = await transaction
      .select({
        avatarUrl: sellerProfile.avatarUrl,
        bio: sellerProfile.bio,
        id: sellerProfile.id,
        storeSlug: sellerProfile.storeSlug,
        storefrontName: sellerProfile.storefrontName,
        userId: sellerProfile.userId,
      })
      .from(sellerProfile)
      .where(eq(sellerProfile.id, sellerProfileId))
      .for("update");

    if (!lockedTarget) {
      throw new Error(`Seller profile not found: ${sellerProfileId}`);
    }

    await transaction
      .delete(listing)
      .where(eq(listing.sellerId, lockedTarget.userId));

    const publishedAt = new Date();

    for (const seed of SELLER_LISTING_SEEDS) {
      const category = getCategory(categories, seed);
      const imageUrl = getSellerListingImageUrl(seed.category.parentSlug);
      const [insertedListing] = await transaction
        .insert(listing)
        .values({
          categoryId: category.id,
          description: seed.description,
          images: [imageUrl],
          sellerId: lockedTarget.userId,
          slug: createSellerListingSlug(
            lockedTarget.storeSlug,
            seed.slugSuffix
          ),
          status: "PUBLISHED",
          thumbnailUrl: imageUrl,
          title: seed.title,
          type: "SERVICE",
        })
        .returning({ id: listing.id });

      if (!insertedListing) {
        throw new Error(`Failed to create listing: ${seed.title}`);
      }

      await transaction.insert(servicePackage).values(
        seed.packages.map((packageSeed) => ({
          description: packageSeed.description,
          firstPublishedAt: publishedAt,
          listingId: insertedListing.id,
          name: packageSeed.name,
          priceAmount: packageSeed.priceAmount,
          processingTimeHours: PROCESSING_TIME_HOURS,
          status: "AVAILABLE" as const,
          warrantyPolicy:
            packageSeed.warrantyDurationHours === null
              ? ({ kind: "NO_WARRANTY" } as const)
              : ({
                  durationHours:
                    packageSeed.warrantyDurationHours ??
                    category.defaultWarrantyDurationHours,
                  kind: "TIMED",
                } as const),
        }))
      );
    }
  });

  process.stdout.write(
    `Replaced ${existingListingCount} existing listings and published ${SELLER_LISTING_SEEDS.length} listings with ${SELLER_LISTING_PACKAGE_COUNT} packages for ${target.storefrontName}.\n`
  );
};

if (import.meta.main) {
  try {
    await seedSellerListings();
    process.exit(0);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Seller listing seed failed: ${message}\n`);
    process.exit(1);
  }
}
