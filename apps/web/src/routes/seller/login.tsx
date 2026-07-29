import { createFileRoute } from "@tanstack/react-router";

import { SellerLoginPage } from "@/features/auth/pages/seller-login-page";

export const Route = createFileRoute("/seller/login")({
  component: SellerLoginPage,
});
