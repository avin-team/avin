import { createHash } from "node:crypto";

import type { WarrantyPolicy } from "@avin/db/schema/catalog";
import type {
  LegacyWarrantyPolicySnapshot,
  ListingSnapshot,
  ServicePackageSnapshot,
  WarrantyPolicySnapshot,
} from "@avin/db/schema/commerce";
import { ORPCError } from "@orpc/server";

export interface ListingContractSource {
  categoryId: string;
  description: string | null;
  images: string[] | null;
  priceAmount: number | null;
  processingTimeHours: number | null;
  sellerId: string;
  slug: string;
  thumbnailUrl: string | null;
  title: string | null;
  type: "COURSE" | "SERVICE";
  warrantyDurationHours: number | null;
  warrantyTerms: string | null;
}

export interface ParsedListingContract {
  commissionRatePercent: string;
  listingSnapshot: ListingSnapshot;
  processingTimeHours: number;
  warrantyPolicy: WarrantyPolicySnapshot & {
    durationHours?: number;
    terms?: string;
  };
  priceAmount: number;
  fingerprint: string;
  servicePackageId?: string;
  servicePackageSnapshot?: ServicePackageSnapshot;
}

export interface ServicePackageContractSource {
  description: string;
  id: string;
  name: string;
  priceAmount: number;
  processingTimeHours: number;
  warrantyPolicy: WarrantyPolicy;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stableSerialize = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  if (!isRecord(value)) {
    return JSON.stringify(value) ?? "null";
  }

  const entries = Object.entries(value).toSorted(([left], [right]) =>
    left.localeCompare(right)
  );
  return `{${entries
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
    .join(",")}}`;
};

const fingerprint = (value: unknown): string =>
  createHash("sha256").update(stableSerialize(value)).digest("hex");

export const parseListingContract = (
  source: ListingContractSource,
  commissionRatePercent: string
): ParsedListingContract => {
  if (
    source.priceAmount === null ||
    !Number.isInteger(source.priceAmount) ||
    source.priceAmount <= 0
  ) {
    throw new ORPCError("CONFLICT", {
      message: "Listing price is not available for checkout.",
    });
  }

  if (
    source.processingTimeHours === null ||
    !Number.isInteger(source.processingTimeHours) ||
    source.processingTimeHours <= 0
  ) {
    throw new ORPCError("CONFLICT", {
      message: "Listing Processing Expectation is not available for checkout.",
    });
  }

  if (
    source.warrantyDurationHours === null ||
    !Number.isInteger(source.warrantyDurationHours) ||
    source.warrantyDurationHours <= 0 ||
    !source.warrantyTerms?.trim()
  ) {
    throw new ORPCError("CONFLICT", {
      message: "Listing WarrantyPolicy is not available for checkout.",
    });
  }

  if (!source.title?.trim()) {
    throw new ORPCError("CONFLICT", {
      message: "Listing title is not available for checkout.",
    });
  }

  const warrantyPolicy = {
    durationHours: source.warrantyDurationHours,
    terms: source.warrantyTerms,
  } satisfies LegacyWarrantyPolicySnapshot;
  const listingSnapshot = {
    categoryId: source.categoryId,
    description: source.description,
    images: source.images ?? [],
    slug: source.slug,
    thumbnailUrl: source.thumbnailUrl,
    title: source.title,
    type: source.type,
  } satisfies ListingSnapshot;

  return {
    commissionRatePercent,
    fingerprint: fingerprint({
      commissionRatePercent,
      listingSnapshot,
      priceAmount: source.priceAmount,
      processingTimeHours: source.processingTimeHours,
      warrantyPolicy,
    }),
    listingSnapshot,
    priceAmount: source.priceAmount,
    processingTimeHours: source.processingTimeHours,
    warrantyPolicy,
  };
};

export const parseServicePackageContract = (
  listingSource: Omit<
    ListingContractSource,
    | "priceAmount"
    | "processingTimeHours"
    | "warrantyDurationHours"
    | "warrantyTerms"
  >,
  packageSource: ServicePackageContractSource,
  commissionRatePercent: string
): ParsedListingContract => {
  if (
    !Number.isInteger(packageSource.priceAmount) ||
    packageSource.priceAmount <= 0
  ) {
    throw new ORPCError("CONFLICT", {
      message: "Service package price is not available for checkout.",
    });
  }

  if (
    !Number.isInteger(packageSource.processingTimeHours) ||
    packageSource.processingTimeHours <= 0
  ) {
    throw new ORPCError("CONFLICT", {
      message:
        "Service package Processing Expectation is not available for checkout.",
    });
  }

  if (!packageSource.name.trim() || !packageSource.description.trim()) {
    throw new ORPCError("CONFLICT", {
      message: "Service package contract is incomplete.",
    });
  }

  if (!listingSource.title?.trim()) {
    throw new ORPCError("CONFLICT", {
      message: "Listing title is not available for checkout.",
    });
  }

  if (
    packageSource.warrantyPolicy.kind === "TIMED" &&
    (!Number.isInteger(packageSource.warrantyPolicy.durationHours) ||
      packageSource.warrantyPolicy.durationHours <= 0)
  ) {
    throw new ORPCError("CONFLICT", {
      message: "Service package WarrantyPolicy is not available for checkout.",
    });
  }

  const listingSnapshot = {
    categoryId: listingSource.categoryId,
    description: listingSource.description,
    images: listingSource.images ?? [],
    slug: listingSource.slug,
    thumbnailUrl: listingSource.thumbnailUrl,
    title: listingSource.title,
    type: listingSource.type,
  } satisfies ListingSnapshot;
  const servicePackageSnapshot = {
    description: packageSource.description,
    id: packageSource.id,
    name: packageSource.name,
    priceAmount: packageSource.priceAmount,
    processingTimeHours: packageSource.processingTimeHours,
    warrantyPolicy: packageSource.warrantyPolicy,
  } satisfies ServicePackageSnapshot;

  return {
    commissionRatePercent,
    fingerprint: fingerprint({
      commissionRatePercent,
      listingSnapshot,
      servicePackageSnapshot,
    }),
    listingSnapshot,
    priceAmount: packageSource.priceAmount,
    processingTimeHours: packageSource.processingTimeHours,
    servicePackageId: packageSource.id,
    servicePackageSnapshot,
    warrantyPolicy: packageSource.warrantyPolicy,
  };
};

export const fingerprintCheckoutRequest = (input: {
  confirmMaterialChanges: boolean;
  items: {
    contractFingerprint: string;
    listingId: string;
    packageId?: string | null;
  }[];
}): string =>
  fingerprint({
    confirmMaterialChanges: input.confirmMaterialChanges,
    items: input.items.toSorted(
      (left, right) =>
        left.listingId.localeCompare(right.listingId) ||
        (left.packageId ?? "").localeCompare(right.packageId ?? "")
    ),
  });
