import { createFileRoute } from "@tanstack/react-router";

import { ProviderProfileRevisionDetailPage } from "@/features/protection/pages/provider-profile-revision-detail-page";

export const Route = createFileRoute(
  "/_authenticated/avin-check/provider-revisions/$revisionId"
)({
  component: ProviderProfileRevisionDetailPage,
});
