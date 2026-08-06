import type { Icon } from "@phosphor-icons/react";

import type { StoreSection } from "../data/store-types";

export interface SellerNavItem {
  icon: Icon;
  label: string;
  needsAttention?: boolean;
  value: StoreSection;
}

export interface SellerNavGroup {
  items: SellerNavItem[];
  title: string;
}
