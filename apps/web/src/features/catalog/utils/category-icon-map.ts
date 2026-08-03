import {
  BookOpen,
  Code2,
  Gamepad2,
  Globe,
  KeyRound,
  LayoutGrid,
  Megaphone,
  Palette,
} from "lucide-react";
import type { ComponentType } from "react";

import { FacebookIcon } from "@/components/icons/facebook";
import { GoogleIcon } from "@/components/icons/google";
import { InstagramIcon } from "@/components/icons/instagram";
import { TikTokIcon } from "@/components/icons/tiktok";
import { XIcon } from "@/components/icons/x";
import { YouTubeIcon } from "@/components/icons/youtube";

export const CATEGORY_ICON_MAP: Record<
  string,
  ComponentType<{ className?: string }>
> = {
  "design-creative": Palette,
  "development-tech": Code2,
  "dich-vu-facebook": FacebookIcon,
  "dich-vu-google": GoogleIcon,
  "dich-vu-instagram": InstagramIcon,
  "dich-vu-tiktok": TikTokIcon,
  "dich-vu-x": XIcon,
  "dich-vu-youtube": YouTubeIcon,
  "digital-services": Globe,
  "education-courses": BookOpen,
  "game-items": Gamepad2,
  "marketing-seo": Megaphone,
  "software-accounts": KeyRound,
};

export const DEFAULT_CATEGORY_ICON = LayoutGrid;

/**
 * Returns a Lucide icon component matching the category slug, falling back to LayoutGrid.
 */
export const getCategoryIcon = (
  slug?: string | null
): ComponentType<{ className?: string }> => {
  if (!slug) {
    return DEFAULT_CATEGORY_ICON;
  }
  return CATEGORY_ICON_MAP[slug] ?? DEFAULT_CATEGORY_ICON;
};
