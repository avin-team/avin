import { createFileRoute } from "@tanstack/react-router";

import { OrderDetailPage } from "@/features/commerce/pages/order-detail-page";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  component: OrderDetailPage,
});
