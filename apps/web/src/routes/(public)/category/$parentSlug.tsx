import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CategoryDetailPage } from "@/features/catalog/pages/category-detail-page";

export const categorySearchSchema = z.object({
  page: z.number().int().optional().default(1),
  search: z.string().optional(),
  sortBy: z
    .enum(["newest", "price_asc", "price_desc"])
    .optional()
    .default("newest"),
  subSlug: z.string().optional(),
});

export const Route = createFileRoute("/(public)/category/$parentSlug")({
  component: CategoryDetailPage,
  validateSearch: categorySearchSchema,
});
