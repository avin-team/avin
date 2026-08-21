import { createFileRoute } from "@tanstack/react-router";

import { requireProviderGuest } from "@/features/protection/guards/require-provider-guest";
import { ProviderLoginPage } from "@/features/protection/pages/provider-login-page";

export const Route = createFileRoute("/provider/login")({
  beforeLoad: requireProviderGuest,
  component: ProviderLoginPage,
});
