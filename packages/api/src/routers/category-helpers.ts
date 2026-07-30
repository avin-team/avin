import { ORPCError } from "@orpc/server";

export const generateSlug = (text: string): string =>
  text
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .replaceAll("đ", "d")
    .replaceAll("Đ", "D")
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9\s-]/gu, "")
    .replaceAll(/[\s_]+/gu, "-")
    .replaceAll(/-+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "");

export const validateCommissionRate = (ratePercent: number): void => {
  if (ratePercent < 0 || ratePercent > 100) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Commission rate must be between 0% and 100%",
    });
  }
};

export const validateWarrantyBounds = (
  minHours: number,
  maxHours: number
): void => {
  if (minHours < 0) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Minimum warranty hours cannot be negative",
    });
  }
  if (maxHours < minHours) {
    throw new ORPCError("BAD_REQUEST", {
      message:
        "Maximum warranty hours must be greater than or equal to minimum warranty hours",
    });
  }
};

export const validateDefaultWarrantyDuration = (
  durationHours: number,
  minHours: number,
  maxHours: number
): void => {
  if (durationHours < minHours || durationHours > maxHours) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Default warranty duration must be within bounds (${minHours}h - ${maxHours}h)`,
    });
  }
};
