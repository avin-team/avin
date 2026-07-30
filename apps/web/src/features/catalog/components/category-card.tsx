import { Link } from "@tanstack/react-router";
import { ArrowRight, Layers } from "lucide-react";
// oxlint-disable-next-line react-doctor/use-lazy-motion
import { motion } from "motion/react";
import type { ComponentPropsWithoutRef } from "react";

import { CategoryIcon } from "../utils/category-icons";

export interface CategoryCardProps extends ComponentPropsWithoutRef<"div"> {
  category: {
    description?: string | null;
    id: string;
    name: string;
    slug: string;
    subCategories?: {
      id: string;
      name: string;
      slug: string;
    }[];
  };
}

export const CategoryCard = ({ category, className }: CategoryCardProps) => {
  const subs = category.subCategories ?? [];

  return (
    <motion.div
      className={className}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -4 }}
    >
      <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-6 shadow-xs backdrop-blur-md transition-all duration-300 hover:border-primary/50 hover:shadow-md hover:shadow-primary/5">
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/5 transition-transform duration-500 group-hover:scale-150" />

        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
              <CategoryIcon className="h-6 w-6" slug={category.slug} />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              <Layers className="h-3 w-3" />
              <span>{subs.length} sub-categories</span>
            </span>
          </div>

          <h3 className="text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
            {category.name}
          </h3>

          {category.description ? (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {category.description}
            </p>
          ) : null}

          {subs.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {subs.slice(0, 4).map((sub) => (
                <span
                  key={sub.id}
                  className="inline-flex items-center rounded-md bg-muted/50 px-2 py-1 text-xs font-medium text-foreground/80"
                >
                  {sub.name}
                </span>
              ))}
              {subs.length > 4 ? (
                <span className="inline-flex items-center rounded-md bg-muted/30 px-2 py-1 text-xs font-medium text-muted-foreground">
                  +{subs.length - 4} more
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-6 pt-4 border-t border-border/40">
          <Link
            className="inline-flex w-full items-center justify-between font-semibold text-sm text-primary transition-all duration-200 group-hover:translate-x-1"
            params={{ parentSlug: category.slug }}
            to="/category/$parentSlug"
          >
            <span>Explore Category</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};
