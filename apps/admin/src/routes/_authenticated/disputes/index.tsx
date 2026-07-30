import { createFileRoute } from "@tanstack/react-router";

import { DisputeQueuePage } from "@/features/disputes/pages/dispute-queue-page";

export const Route = createFileRoute("/_authenticated/disputes/")({
  component: DisputeQueuePage,
});
