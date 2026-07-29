import { createFileRoute } from "@tanstack/react-router";

import { SellerApplicationDetailPage } from "@/features/seller-applications/pages/seller-application-detail-page";

export const Route = createFileRoute("/seller-applications/$applicationId")({
  component: SellerApplicationDetailPage,
});
