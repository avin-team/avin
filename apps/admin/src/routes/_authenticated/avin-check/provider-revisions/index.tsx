import { createFileRoute } from "@tanstack/react-router";

import { ProviderProfileRevisionQueuePage } from "@/features/protection/pages/provider-profile-revision-queue-page";

export const Route = createFileRoute(
  "/_authenticated/avin-check/provider-revisions/"
)({
  component: ProviderProfileRevisionQueuePage,
});
