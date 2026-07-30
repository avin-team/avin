import { createFileRoute } from "@tanstack/react-router";

import { ListingDetailPage } from "@/features/catalog/pages/listing-detail-page";

export const Route = createFileRoute("/(public)/listing/$id")({
  component: ListingDetailPage,
});
