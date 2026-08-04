import { servicePackageDraftSchema } from "@avin/db/schema/catalog";
import type {
  ServicePackageDraft,
  WarrantyPolicy,
  servicePackage,
} from "@avin/db/schema/catalog";
import { ORPCError } from "@orpc/server";

export type ServicePackageRow = typeof servicePackage.$inferSelect;

export interface ServicePackageCategory {
  warrantyBounds: { maxHours: number; minHours: number };
}

const packageError = (message: string): never => {
  throw new ORPCError("BAD_REQUEST", { message });
};

export const parseServicePackageDraft = (
  input: unknown,
  category: ServicePackageCategory
): ServicePackageDraft => {
  const parsed = servicePackageDraftSchema.safeParse(input);
  if (!parsed.success) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Service package details are invalid",
    });
  }

  if (parsed.data.warrantyPolicy.kind === "TIMED") {
    const { durationHours } = parsed.data.warrantyPolicy;
    const { maxHours, minHours } = category.warrantyBounds;
    if (durationHours < minHours || durationHours > maxHours) {
      packageError(
        `Warranty duration (${durationHours}h) must be within category bounds (${minHours}h - ${maxHours}h)`
      );
    }
  }

  return parsed.data;
};

export const assertServicePackagesPublishable = (
  packages: readonly Pick<
    ServicePackageRow,
    | "description"
    | "name"
    | "priceAmount"
    | "processingTimeHours"
    | "status"
    | "warrantyPolicy"
  >[],
  category: ServicePackageCategory
): void => {
  if (packages.length === 0) {
    packageError("A Service listing must have at least one package");
  }

  const names = new Set<string>();
  let availableCount = 0;
  for (const packageItem of packages) {
    const parsed = parseServicePackageDraft(
      {
        description: packageItem.description,
        name: packageItem.name,
        priceAmount: packageItem.priceAmount,
        processingTimeHours: packageItem.processingTimeHours,
        warrantyPolicy: packageItem.warrantyPolicy,
      },
      category
    );
    const normalizedName = parsed.name.toLocaleLowerCase();
    if (names.has(normalizedName)) {
      packageError("Service package names must be unique");
    }
    names.add(normalizedName);
    if (packageItem.status === "AVAILABLE") {
      availableCount += 1;
    }
  }

  if (availableCount === 0) {
    packageError("A published Service listing must have an available package");
  }
};

export const assertServicePackageNameUnique = (
  packages: readonly Pick<ServicePackageRow, "id" | "name">[],
  name: string,
  excludedId?: string
): void => {
  const normalizedName = name.toLocaleLowerCase();
  if (
    packages.some(
      (packageItem) =>
        packageItem.id !== excludedId &&
        packageItem.name.toLocaleLowerCase() === normalizedName
    )
  ) {
    packageError("Service package names must be unique");
  }
};

export const sortAvailableServicePackages = <
  T extends Pick<ServicePackageRow, "priceAmount" | "name" | "id" | "status">,
>(
  packages: readonly T[]
): T[] =>
  packages
    .filter((packageItem) => packageItem.status === "AVAILABLE")
    .toSorted(
      (left, right) =>
        left.priceAmount - right.priceAmount ||
        left.name.localeCompare(right.name) ||
        left.id.localeCompare(right.id)
    );

export const selectAvailableServicePackage = <
  T extends Pick<ServicePackageRow, "id" | "status">,
>(
  packages: readonly T[],
  packageId?: string | null
): T => {
  const available = packages.filter(
    (packageItem) => packageItem.status === "AVAILABLE"
  );
  if (packageId) {
    const selected = packages.find(
      (packageItem) => packageItem.id === packageId
    );
    if (!selected || selected.status !== "AVAILABLE") {
      throw new ORPCError("CONFLICT", {
        message: "Selected Service package is no longer available.",
      });
    }
    return selected;
  }

  if (available.length === 1) {
    return available[0] as T;
  }

  throw new ORPCError("BAD_REQUEST", {
    message: "Choose a Service package before adding this Listing to Cart.",
  });
};

export const toLegacyServicePackageDraft = (listing: {
  description: string | null;
  priceAmount: number | null;
  processingTimeHours: number | null;
  title: string | null;
  warrantyDurationHours: number | null;
}): ServicePackageDraft | null => {
  if (listing.priceAmount === null || listing.processingTimeHours === null) {
    return null;
  }

  const legacyWarrantyPolicy =
    listing.warrantyDurationHours !== null && listing.warrantyDurationHours > 0
      ? {
          durationHours: listing.warrantyDurationHours,
          kind: "TIMED" as const,
        }
      : { kind: "NO_WARRANTY" as const };
  const parsed = servicePackageDraftSchema.safeParse({
    description:
      listing.description?.trim() ||
      listing.title?.trim() ||
      "Standard service",
    name: "Standard",
    priceAmount: listing.priceAmount,
    processingTimeHours: listing.processingTimeHours,
    warrantyPolicy: legacyWarrantyPolicy,
  });
  return parsed.success ? parsed.data : null;
};

export const getServicePackageSummaryPrice = (
  packages: readonly Pick<ServicePackageRow, "priceAmount" | "status">[]
): number | null => {
  const available = packages.filter(
    (packageItem) => packageItem.status === "AVAILABLE"
  );
  return available.length > 0
    ? Math.min(...available.map((packageItem) => packageItem.priceAmount))
    : null;
};

export const isNoWarranty = (
  policy: WarrantyPolicy | { durationHours: number; terms: string }
): policy is { kind: "NO_WARRANTY" } =>
  "kind" in policy && policy.kind === "NO_WARRANTY";

export const warrantyDurationHours = (
  policy: WarrantyPolicy | { durationHours: number; terms: string }
): number | null => {
  if (isNoWarranty(policy)) {
    return null;
  }
  return policy.durationHours;
};
