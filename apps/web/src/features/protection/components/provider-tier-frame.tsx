import { cn } from "@avin/ui/lib/utils";
import { ShieldCheckIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import {
  TIER_BACK_STYLES,
  TIER_FRAME_IMAGES,
} from "../data/provider-tier-constants";
import type { ProviderTier } from "../data/provider-tier-constants";

export type { ProviderTier } from "../data/provider-tier-constants";

const vndFormatter = new Intl.NumberFormat("vi-VN");

const formatCompactVND = (value?: number): string => {
  if (!value) {
    return "0 ₫";
  }
  if (value >= 1_000_000_000) {
    const b = value / 1_000_000_000;
    return `${Number.isInteger(b) ? b : b.toFixed(1)} Tỷ ₫`;
  }
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(0)} Tr ₫`;
  }
  return `${vndFormatter.format(value)} ₫`;
};

interface ProviderTierFrameProps {
  children: ReactNode;
  className?: string;
  isVerified?: boolean;
  recognizedBondAmount?: number;
  recommendedTransactionLimit?: number;
  tier: ProviderTier;
}

export const ProviderTierFrame = ({
  children,
  className,
  recognizedBondAmount,
  recommendedTransactionLimit,
  tier,
}: ProviderTierFrameProps) => {
  const frameSrc = TIER_FRAME_IMAGES[tier] ?? TIER_FRAME_IMAGES.BRONZE;
  const backStyle = TIER_BACK_STYLES[tier] ?? TIER_BACK_STYLES.BRONZE;

  return (
    <div
      className={cn(
        "group/frame relative flex size-32 items-center justify-center sm:size-36 md:size-40 [perspective:1000px]",
        className
      )}
    >
      {/* High-Resolution Frame Asset */}
      <img
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 size-full object-contain drop-shadow-md select-none transition-transform duration-300 group-hover/frame:scale-105"
        src={frameSrc}
      />

      {/* 3D Flip Card Container */}
      <div className="relative size-[86%] rounded-full transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] group-hover/frame:[transform:rotateY(180deg)] motion-reduce:transition-none motion-reduce:group-hover:[transform:none]">
        {/* Front Face: Avatar */}
        <div className="absolute inset-0 size-full rounded-full overflow-hidden [backface-visibility:hidden] [-webkit-backface-visibility:hidden] motion-reduce:transition-opacity motion-reduce:duration-300 motion-reduce:group-hover:opacity-0">
          {children}
        </div>

        {/* Back Face: Ký Quỹ / Quỹ Đảm Bảo */}
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-0 size-full rounded-full border p-2 flex flex-col items-center justify-center text-center select-none shadow-inner [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)] motion-reduce:[transform:none] motion-reduce:opacity-0 motion-reduce:transition-opacity motion-reduce:duration-300 motion-reduce:group-hover:opacity-100",
            backStyle.bgClass,
            backStyle.borderClass
          )}
        >
          <ShieldCheckIcon
            aria-hidden="true"
            className={cn(
              "size-4 sm:size-5 mb-0.5 shrink-0",
              backStyle.iconClass
            )}
            weight="fill"
          />
          <span className="text-[0.625rem] sm:text-[0.6875rem] uppercase tracking-wider font-semibold text-white/80 leading-none">
            Ký quỹ
          </span>
          <span
            className={cn(
              "text-xs sm:text-sm tracking-tight font-extrabold my-0.5 leading-tight",
              backStyle.amountClass
            )}
          >
            {formatCompactVND(recognizedBondAmount)}
          </span>
          {recommendedTransactionLimit ? (
            <span className="text-[0.55rem] sm:text-[0.625rem] text-white/70 leading-none truncate max-w-[90%]">
              ≤ {formatCompactVND(recommendedTransactionLimit)}/GD
            </span>
          ) : (
            <span className="text-[0.55rem] sm:text-[0.625rem] text-white/70 leading-none">
              {backStyle.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
