import { Link } from "@tanstack/react-router";

import { CategoryIcon } from "../utils/category-icons";
import type { CarouselCategory } from "./category-carousel";

interface CompactCategoryCardProps {
  category: CarouselCategory;
}

export const CompactCategoryCard = ({ category }: CompactCategoryCardProps) => (
  <Link
    className="group min-w-0 rounded-2xl border border-border/60 bg-card/60 p-3 transition-[border-color,transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 hover:border-primary/40 hover:bg-card active:scale-[0.98] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-[0.99] motion-reduce:duration-100 sm:p-4"
    params={{ parentSlug: category.slug }}
    to="/category/$parentSlug"
  >
    <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <CategoryIcon className="size-6" slug={category.slug} />
    </span>
    <h3 className="mt-4 break-words font-extrabold text-sm sm:text-base">
      {category.name}
    </h3>
    <p className="mt-1 text-muted-foreground text-xs">
      {category.subCategories?.length ?? 0} dịch vụ đang hoạt động
    </p>
  </Link>
);
