import { createFileRoute } from "@tanstack/react-router";

import { OrdersPage } from "@/features/commerce/pages/orders-page";

export const Route = createFileRoute("/_authenticated/orders/")({
  component: OrdersPage,
});
