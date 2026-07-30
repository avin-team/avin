import { createFileRoute } from "@tanstack/react-router";

import { DisputeDetailPage } from "@/features/disputes/pages/dispute-detail-page";

export const Route = createFileRoute("/_authenticated/disputes/$disputeId")({
  component: DisputeDetailPage,
});
