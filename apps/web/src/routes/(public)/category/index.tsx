import { createFileRoute } from "@tanstack/react-router";

import { CategoriesPage } from "@/features/catalog/pages/categories-page";

export const Route = createFileRoute("/(public)/category/")({
  component: CategoriesPage,
});
