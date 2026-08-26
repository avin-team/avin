import { createFileRoute } from "@tanstack/react-router";

import { ProviderApplicationQueuePage } from "@/features/protection/pages/provider-application-queue-page";

export const Route = createFileRoute("/_authenticated/avin-check/providers/")({
  component: ProviderApplicationQueuePage,
});
