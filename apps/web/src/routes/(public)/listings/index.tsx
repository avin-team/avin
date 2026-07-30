import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ListingsSearchPage } from "@/features/catalog/pages/listings-search-page";

export const listingsSearchSchema = z.object({
  page: z.number().int().optional().default(1),
  parentSlug: z.string().optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(["newest", "price_asc", "price_desc"])
    .optional()
    .default("newest"),
});

export const Route = createFileRoute("/(public)/listings/")({
  component: ListingsSearchPage,
  validateSearch: listingsSearchSchema,
});
