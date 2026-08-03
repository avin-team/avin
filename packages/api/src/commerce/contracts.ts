import { createHash } from "node:crypto";

import { serviceInputFieldSchema } from "@avin/db/schema/catalog";
import type {
  ServiceInputField,
  WarrantyPolicy,
} from "@avin/db/schema/catalog";
import type {
  ListingSnapshot,
  ServicePackageSnapshot,
  WarrantyPolicySnapshot,
} from "@avin/db/schema/commerce";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

export interface ListingContractSource {
  categoryId: string;
  description: string | null;
  images: string[] | null;
  priceAmount: number | null;
  processingTimeHours: number | null;
  sellerId: string;
  serviceInputFields: unknown;
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
  serviceInputFields: ServiceInputField[];
  warrantyPolicy: WarrantyPolicySnapshot;
  priceAmount: number;
  fingerprint: string;
  servicePackageId?: string;
  servicePackageSnapshot?: ServicePackageSnapshot;
}

export interface ServicePackageContractSource {
  id: string;
  name: string;
  priceAmount: number;
  processingTimeHours: number;
  scope: string;
  serviceInputFields: unknown;
  warrantyPolicy: WarrantyPolicy;
}

const fileInputValueSchema = z.object({
  fileId: z.uuid(),
});

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

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const parseServiceInputFields = (value: unknown): ServiceInputField[] => {
  const parsed = z.array(serviceInputFieldSchema).safeParse(value);
  if (!parsed.success) {
    throw new ORPCError("CONFLICT", {
      message:
        "Listing ServiceInputFields are invalid and cannot be purchased.",
    });
  }

  const keys = new Set<string>();
  for (const field of parsed.data) {
    if (!field.key.trim() || keys.has(field.key)) {
      throw new ORPCError("CONFLICT", {
        message: "Listing ServiceInputField keys must be unique.",
      });
    }
    keys.add(field.key);
  }

  return parsed.data.toSorted((left, right) =>
    left.key.localeCompare(right.key)
  );
};

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

  const serviceInputFields = parseServiceInputFields(source.serviceInputFields);
  const warrantyPolicy = {
    durationHours: source.warrantyDurationHours,
    kind: "TIMED",
    terms: source.warrantyTerms,
  } satisfies Extract<WarrantyPolicySnapshot, { kind: "TIMED" }>;
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
      serviceInputFields,
      warrantyPolicy,
    }),
    listingSnapshot,
    priceAmount: source.priceAmount,
    processingTimeHours: source.processingTimeHours,
    serviceInputFields,
    warrantyPolicy,
  };
};

export const parseServicePackageContract = (
  listingSource: Omit<
    ListingContractSource,
    | "priceAmount"
    | "processingTimeHours"
    | "serviceInputFields"
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

  if (!packageSource.name.trim() || !packageSource.scope.trim()) {
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
      packageSource.warrantyPolicy.durationHours <= 0 ||
      !packageSource.warrantyPolicy.terms.trim())
  ) {
    throw new ORPCError("CONFLICT", {
      message: "Service package WarrantyPolicy is not available for checkout.",
    });
  }

  const serviceInputFields = parseServiceInputFields(
    packageSource.serviceInputFields
  );
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
    id: packageSource.id,
    name: packageSource.name,
    priceAmount: packageSource.priceAmount,
    processingTimeHours: packageSource.processingTimeHours,
    scope: packageSource.scope,
    serviceInputFields,
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
    serviceInputFields,
    servicePackageId: packageSource.id,
    servicePackageSnapshot,
    warrantyPolicy: packageSource.warrantyPolicy,
  };
};

export const validateOrderCustomInputs = (
  fields: ServiceInputField[],
  inputs: Record<string, unknown>
): {
  fieldKey: string;
  fieldType: ServiceInputField["type"];
  value: unknown;
}[] => {
  const fieldsByKey = new Map(fields.map((field) => [field.key, field]));

  for (const key of Object.keys(inputs)) {
    if (!fieldsByKey.has(key)) {
      throw new ORPCError("BAD_REQUEST", {
        message: `ServiceInputField "${key}" is not declared by the Listing.`,
      });
    }
  }

  const values = [];
  for (const field of fields) {
    const value = inputs[field.key];
    const hasValue = value !== undefined && value !== null;
    if (!hasValue) {
      if (field.required) {
        throw new ORPCError("BAD_REQUEST", {
          message: `ServiceInputField "${field.label}" is required.`,
        });
      }
      continue;
    }

    const valid =
      (field.type === "text" && typeof value === "string" && value.trim()) ||
      (field.type === "url" && typeof value === "string" && isHttpUrl(value)) ||
      (field.type === "number" &&
        typeof value === "number" &&
        Number.isFinite(value)) ||
      (field.type === "file" && fileInputValueSchema.safeParse(value).success);

    if (!valid) {
      throw new ORPCError("BAD_REQUEST", {
        message: `ServiceInputField "${field.label}" has an invalid value.`,
      });
    }

    values.push({ fieldKey: field.key, fieldType: field.type, value });
  }

  return values;
};

export const fingerprintCheckoutRequest = (input: {
  confirmMaterialChanges: boolean;
  items: {
    contractFingerprint: string;
    inputs: Record<string, unknown>;
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
