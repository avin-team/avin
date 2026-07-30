import { createFileRoute } from "@tanstack/react-router";

import { ListingsSearchPage } from "@/features/catalog/pages/listings-search-page";

export const Route = createFileRoute("/(public)/listings/")({
  component: ListingsSearchPage,
});
