import { createFileRoute } from "@tanstack/react-router";

import { ListingWorkspacePage } from "@/features/seller/pages/listing-workspace-page";

export const Route = createFileRoute("/_authenticated/seller/listings")({
  component: ListingWorkspacePage,
});
