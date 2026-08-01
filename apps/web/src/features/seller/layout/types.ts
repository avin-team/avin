import type { LucideIcon } from "lucide-react";

import type { StoreSection } from "../data/store-mock-data";

export interface SellerNavItem {
  icon: LucideIcon;
  label: string;
  needsAttention?: boolean;
  value: StoreSection;
}

export interface SellerNavGroup {
  items: SellerNavItem[];
  title: string;
}
