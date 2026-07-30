import { createFileRoute } from "@tanstack/react-router";

import { SellerApplicationQueuePage } from "@/features/seller-applications/pages/seller-application-queue-page";

export const Route = createFileRoute("/_authenticated/seller-applications/")({
  component: SellerApplicationQueuePage,
});
