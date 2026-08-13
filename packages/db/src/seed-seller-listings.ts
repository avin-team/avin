import { and, eq, inArray } from "drizzle-orm";

import { db } from "./index";
import {
  listing,
  parentCategory,
  servicePackage,
  subCategory,
} from "./schema/catalog";
import { sellerProfile } from "./schema/seller";
import {
  createSellerListingSlug,
  parseSellerListingSeedArguments,
  SELLER_LISTING_SEEDS,
} from "./seller-listing-seed-data";
import type { SellerListingSeed } from "./seller-listing-seed-data";

const PROCESSING_TIME_HOURS = 72;
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

const assertSellerHasNoListings = async (sellerId: string): Promise<void> => {
  const existingListing = await db.query.listing.findFirst({
    columns: { id: true },
    where: (table, { eq: equals }) => equals(table.sellerId, sellerId),
  });

  if (existingListing) {
    throw new Error(
      "Seller already owns at least one listing; refusing to seed bootstrap data"
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
  dryRun: boolean
): void => {
  const lines = [
    `${dryRun ? "Would seed" : "Seeding"} seller: ${target.storefrontName}`,
    `Seller profile: ${target.id}`,
    `Seller user: ${target.userId}`,
    `Listings: ${SELLER_LISTING_SEEDS.length}; packages: ${SELLER_LISTING_PACKAGE_COUNT}`,
  ];

  for (const seed of SELLER_LISTING_SEEDS) {
    const category = getCategory(categories, seed);
    lines.push(
      `\n- ${seed.title}`,
      `  Category: ${category.parentName} > ${category.name}`,
      `  Slug: ${createSellerListingSlug(target.storeSlug, seed.slugSuffix)}`
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

  await assertSellerHasNoListings(target.userId);
  printPreview(target, categories, dryRun);

  if (dryRun) {
    process.stdout.write("Dry run complete; no data was written.\n");
    return;
  }

  await db.transaction(async (transaction) => {
    const [lockedTarget] = await transaction
      .select({
        id: sellerProfile.id,
        storeSlug: sellerProfile.storeSlug,
        userId: sellerProfile.userId,
      })
      .from(sellerProfile)
      .where(eq(sellerProfile.id, sellerProfileId))
      .for("update");

    if (!lockedTarget) {
      throw new Error(`Seller profile not found: ${sellerProfileId}`);
    }

    const [existingListing] = await transaction
      .select({ id: listing.id })
      .from(listing)
      .where(eq(listing.sellerId, lockedTarget.userId))
      .limit(1);

    if (existingListing) {
      throw new Error(
        "Seller already owns at least one listing; refusing to seed bootstrap data"
      );
    }

    for (const seed of SELLER_LISTING_SEEDS) {
      const category = getCategory(categories, seed);
      const [insertedListing] = await transaction
        .insert(listing)
        .values({
          categoryId: category.id,
          description: seed.description,
          images: [],
          sellerId: lockedTarget.userId,
          slug: createSellerListingSlug(
            lockedTarget.storeSlug,
            seed.slugSuffix
          ),
          status: "DRAFT",
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
    `Seeded ${SELLER_LISTING_SEEDS.length} draft listings and ${SELLER_LISTING_PACKAGE_COUNT} packages for ${target.storefrontName}.\n`
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
