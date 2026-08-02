import { createFileRoute } from "@tanstack/react-router";

import { ListingRouteBridge } from "@/features/seller/pages/listing-route-bridge";

export const Route = createFileRoute("/_authenticated/seller/listings")({
  component: ListingRouteBridge,
});
