import { createFileRoute } from "@tanstack/react-router";

import { SellerDetailPage } from "@/features/sellers/pages/seller-detail-page";

export const Route = createFileRoute("/_authenticated/sellers/$sellerId")({
  component: SellerDetailPage,
});
