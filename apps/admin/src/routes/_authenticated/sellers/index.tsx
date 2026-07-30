import { createFileRoute } from "@tanstack/react-router";

import { SellerListPage } from "@/features/sellers/pages/seller-list-page";

export const Route = createFileRoute("/_authenticated/sellers/")({
  component: SellerListPage,
});
