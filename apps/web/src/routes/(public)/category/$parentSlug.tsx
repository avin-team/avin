import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CategoryDetailPage } from "@/features/catalog/pages/category-detail-page";

export const categorySearchSchema = z.object({
  page: z.preprocess(
    (val) => (val ? Math.trunc(Number(String(val))) || 1 : 1),
    z.number().int().default(1)
  ),
  search: z.string().optional(),
  sortBy: z.preprocess(
    (val) => (val === "price_asc" || val === "price_desc" ? val : "newest"),
    z.enum(["newest", "price_asc", "price_desc"]).default("newest")
  ),
  subSlug: z.string().optional(),
});

export const Route = createFileRoute("/(public)/category/$parentSlug")({
  component: CategoryDetailPage,
  validateSearch: categorySearchSchema,
});
