import type { ProviderTier } from "@avin/db/schema/protection";

export const PROVIDER_TIER_ORDER = [
  "VIP",
  "DIAMOND",
  "GOLD",
  "SILVER",
  "BRONZE",
  "NORMAL",
] as const satisfies readonly ProviderTier[];

export const DEFAULT_PROVIDER_TIER_THRESHOLDS = {
  bronzeMinimumBondAmount: 5_000_000,
  diamondMinimumBondAmount: 50_000_000,
  goldMinimumBondAmount: 20_000_000,
  minimumBondAmount: 1_000_000,
  silverMinimumBondAmount: 10_000_000,
  vipMinimumBondAmount: 100_000_000,
} as const;

export interface ProviderTierThresholds {
  bronzeMinimumBondAmount: number;
  diamondMinimumBondAmount: number;
  goldMinimumBondAmount: number;
  minimumBondAmount: number;
  silverMinimumBondAmount: number;
  vipMinimumBondAmount: number;
}

export const getProviderTier = (
  recognizedBondAmount: number,
  thresholds: ProviderTierThresholds = DEFAULT_PROVIDER_TIER_THRESHOLDS
): ProviderTier => {
  if (recognizedBondAmount >= thresholds.vipMinimumBondAmount) {
    return "VIP";
  }
  if (recognizedBondAmount >= thresholds.diamondMinimumBondAmount) {
    return "DIAMOND";
  }
  if (recognizedBondAmount >= thresholds.goldMinimumBondAmount) {
    return "GOLD";
  }
  if (recognizedBondAmount >= thresholds.silverMinimumBondAmount) {
    return "SILVER";
  }
  if (recognizedBondAmount >= thresholds.bronzeMinimumBondAmount) {
    return "BRONZE";
  }
  return "NORMAL";
};

export const calculateRecommendedTransactionLimit = ({
  recognizedBondAmount,
  percentage = 80,
  rounding = 100_000,
}: {
  recognizedBondAmount: number;
  percentage?: number;
  rounding?: number;
}): number => {
  if (recognizedBondAmount <= 0 || percentage <= 0) {
    return 0;
  }
  const cappedPercentage = Math.min(80, Math.max(0, percentage));
  const rawLimit = Math.floor((recognizedBondAmount * cappedPercentage) / 100);
  if (rounding <= 1) {
    return rawLimit;
  }
  return Math.floor(rawLimit / rounding) * rounding;
};

export const providerTierLabel: Record<ProviderTier, string> = {
  BRONZE: "Đồng",
  DIAMOND: "Kim cương",
  GOLD: "Vàng",
  NORMAL: "Normal",
  SILVER: "Bạc",
  VIP: "VIP",
};
