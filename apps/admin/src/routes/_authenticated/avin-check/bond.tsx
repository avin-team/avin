import { createFileRoute } from "@tanstack/react-router";

import { ProviderBondPage } from "@/features/protection/pages/provider-bond-page";

export const Route = createFileRoute("/_authenticated/avin-check/bond")({
  component: ProviderBondPage,
});
