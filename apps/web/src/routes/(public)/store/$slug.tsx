import { createFileRoute } from "@tanstack/react-router";

import { PublicStorePage } from "@/features/seller/pages/public-store-page";

export const Route = createFileRoute("/(public)/store/$slug")({
  component: PublicStorePage,
});
