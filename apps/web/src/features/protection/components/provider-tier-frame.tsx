import { cn } from "@avin/ui/lib/utils";
import { ShieldCheckIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

export type ProviderTier =
  | "NORMAL"
  | "BRONZE"
  | "SILVER"
  | "GOLD"
  | "DIAMOND"
  | "PLATINUM"
  | "VIP";

const TIER_FRAME_IMAGES: Record<ProviderTier, string> = {
  BRONZE: "/images/frames/bronze.png",
  DIAMOND: "/images/frames/platinum.png",
  GOLD: "/images/frames/gold.png",
  NORMAL: "/images/frames/bronze.png",
  PLATINUM: "/images/frames/platinum.png",
  SILVER: "/images/frames/silver.png",
  VIP: "/images/frames/vip.png",
};

const TIER_BACK_STYLES: Record<
  ProviderTier,
  {
    amountClass: string;
    badgeClass: string;
    bgClass: string;
    borderClass: string;
    iconClass: string;
    label: string;
  }
> = {
  BRONZE: {
    amountClass: "text-amber-200 font-bold",
    badgeClass: "bg-amber-500/20 text-amber-300",
    bgClass: "bg-linear-to-b from-stone-900 via-amber-950 to-stone-950",
    borderClass: "border-amber-600/40",
    iconClass: "text-amber-400",
    label: "Hạng Đồng",
  },
  DIAMOND: {
    amountClass: "text-sky-200 font-bold",
    badgeClass: "bg-sky-500/20 text-sky-300",
    bgClass: "bg-linear-to-b from-slate-900 via-sky-950 to-slate-950",
    borderClass: "border-sky-400/40",
    iconClass: "text-sky-300",
    label: "Kim Cương",
  },
  GOLD: {
    amountClass: "text-yellow-200 font-bold",
    badgeClass: "bg-yellow-500/20 text-yellow-300",
    bgClass: "bg-linear-to-b from-stone-900 via-amber-950 to-stone-950",
    borderClass: "border-yellow-500/40",
    iconClass: "text-yellow-400",
    label: "Hạng Vàng",
  },
  NORMAL: {
    amountClass: "text-zinc-200 font-bold",
    badgeClass: "bg-zinc-500/20 text-zinc-300",
    bgClass: "bg-linear-to-b from-zinc-900 via-zinc-950 to-black",
    borderClass: "border-zinc-500/40",
    iconClass: "text-zinc-400",
    label: "Hạng Tiêu Chuẩn",
  },
  PLATINUM: {
    amountClass: "text-cyan-200 font-bold",
    badgeClass: "bg-cyan-500/20 text-cyan-300",
    bgClass: "bg-linear-to-b from-slate-900 via-cyan-950 to-slate-950",
    borderClass: "border-cyan-400/40",
    iconClass: "text-cyan-300",
    label: "Bạch Kim",
  },
  SILVER: {
    amountClass: "text-slate-100 font-bold",
    badgeClass: "bg-slate-500/20 text-slate-200",
    bgClass: "bg-linear-to-b from-stone-900 via-slate-900 to-stone-950",
    borderClass: "border-slate-400/40",
    iconClass: "text-slate-300",
    label: "Hạng Bạc",
  },
  VIP: {
    amountClass: "text-emerald-200 font-bold",
    badgeClass: "bg-emerald-500/20 text-emerald-300",
    bgClass: "bg-linear-to-b from-zinc-950 via-emerald-950 to-black",
    borderClass: "border-emerald-500/40",
    iconClass: "text-emerald-400",
    label: "Hạng VIP",
  },
};

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
