import { createFileRoute } from "@tanstack/react-router";

import { CategoriesPage } from "@/features/categories/pages/categories-page";

export const Route = createFileRoute("/_authenticated/categories/")({
  component: CategoriesPage,
});
