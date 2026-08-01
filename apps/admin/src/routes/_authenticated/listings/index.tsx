import { createFileRoute } from "@tanstack/react-router";

import { ListingsPage } from "@/features/listings/pages/listings-page";

export const Route = createFileRoute("/_authenticated/listings/")({
  component: ListingsPage,
});
