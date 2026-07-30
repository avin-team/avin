import { createFileRoute } from "@tanstack/react-router";

import { CategoryDetailPage } from "@/features/catalog/pages/category-detail-page";

export const Route = createFileRoute("/(public)/category/$parentSlug")({
  component: CategoryDetailPage,
});
