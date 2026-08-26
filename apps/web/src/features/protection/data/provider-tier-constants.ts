export type ProviderTier =
  | "NORMAL"
  | "BRONZE"
  | "SILVER"
  | "GOLD"
  | "DIAMOND"
  | "PLATINUM"
  | "VIP";

export const TIER_FRAME_IMAGES: Record<ProviderTier, string> = {
  BRONZE: "/images/frames/bronze.png",
  DIAMOND: "/images/frames/platinum.png",
  GOLD: "/images/frames/gold.png",
  NORMAL: "/images/frames/bronze.png",
  PLATINUM: "/images/frames/platinum.png",
  SILVER: "/images/frames/silver.png",
  VIP: "/images/frames/vip.png",
};

export const TIER_ICON_IMAGES: Record<ProviderTier, string> = {
  BRONZE: "/images/tiers/bronze.png",
  DIAMOND: "/images/tiers/diamond.png",
  GOLD: "/images/tiers/gold.png",
  NORMAL: "/images/tiers/bronze.png",
  PLATINUM: "/images/tiers/platinum.png",
  SILVER: "/images/tiers/silver.png",
  VIP: "/images/tiers/vip.png",
};

export const TIER_BACK_STYLES: Record<
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
