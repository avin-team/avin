import { CATEGORY_ICON_MAP, DEFAULT_CATEGORY_ICON } from "./category-icon-map";

export const CategoryIcon = ({
  slug,
  className,
}: {
  slug?: string | null;
  className?: string;
}) => {
  const IconComponent =
    (slug && CATEGORY_ICON_MAP[slug]) || DEFAULT_CATEGORY_ICON;
  return <IconComponent className={className} />;
};
