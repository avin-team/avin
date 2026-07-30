import {
  BookOpen,
  Camera,
  Code2,
  Gamepad2,
  Globe,
  KeyRound,
  LayoutGrid,
  MapPin,
  Megaphone,
  Palette,
  PlaySquare,
  Share2,
  Video,
} from "lucide-react";
import type { ComponentType } from "react";

export const CATEGORY_ICON_MAP: Record<
  string,
  ComponentType<{ className?: string }>
> = {
  // Social media services from seed data
  "dich-vu-facebook": Share2,
  "dich-vu-google": MapPin,
  "dich-vu-instagram": Camera,
  "dich-vu-tiktok": Video,
  "dich-vu-youtube": PlaySquare,

  // Additional common category slugs
  "design-creative": Palette,
  "development-tech": Code2,
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

export const CategoryIcon = ({
  slug,
  className,
}: {
  slug?: string | null;
  className?: string;
}) => {
  const IconComponent = getCategoryIcon(slug);
  return <IconComponent className={className} />;
};
