import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { StorePage } from "@/features/seller/pages/store-page";

const sellerStoreSearchSchema = z.object({
  section: z
    .enum([
      "overview",
      "profile",
      "products",
      "orders",
      "complaints",
      "discounts",
      "finance",
      "developer",
    ])
    .optional(),
});

export const Route = createFileRoute("/_authenticated/seller/store")({
  component: StorePage,
  validateSearch: sellerStoreSearchSchema,
});
