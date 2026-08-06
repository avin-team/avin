import {
  BookOpenIcon,
  CodeIcon,
  GameControllerIcon,
  GlobeIcon,
  KeyIcon,
  GridFourIcon,
  MegaphoneIcon,
  PaletteIcon,
} from "@phosphor-icons/react";
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
  "design-creative": PaletteIcon,
  "development-tech": CodeIcon,
  "dich-vu-facebook": FacebookIcon,
  "dich-vu-google": GoogleIcon,
  "dich-vu-instagram": InstagramIcon,
  "dich-vu-tiktok": TikTokIcon,
  "dich-vu-x": XIcon,
  "dich-vu-youtube": YouTubeIcon,
  "digital-services": GlobeIcon,
  "education-courses": BookOpenIcon,
  "game-items": GameControllerIcon,
  "marketing-seo": MegaphoneIcon,
  "software-accounts": KeyIcon,
};

export const DEFAULT_CATEGORY_ICON = GridFourIcon;

/**
 * Returns a Phosphor icon component matching the category slug, falling back to GridFourIcon.
 */
export const getCategoryIcon = (
  slug?: string | null
): ComponentType<{ className?: string }> => {
  if (!slug) {
    return DEFAULT_CATEGORY_ICON;
  }
  return CATEGORY_ICON_MAP[slug] ?? DEFAULT_CATEGORY_ICON;
};
