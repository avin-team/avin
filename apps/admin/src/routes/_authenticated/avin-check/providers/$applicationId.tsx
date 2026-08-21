import { createFileRoute } from "@tanstack/react-router";

import { ProviderApplicationDetailPage } from "@/features/protection/pages/provider-application-detail-page";

export const Route = createFileRoute(
  "/_authenticated/avin-check/providers/$applicationId"
)({
  component: ProviderApplicationDetailPage,
});
