import { createFileRoute } from "@tanstack/react-router";

import { StorePage } from "@/features/seller/pages/store-page";

export const Route = createFileRoute("/_authenticated/seller/store")({
  component: StorePage,
});
