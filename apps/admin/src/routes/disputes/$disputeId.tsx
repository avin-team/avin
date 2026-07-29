import { createFileRoute } from "@tanstack/react-router";

import { DisputeDetailPage } from "@/features/disputes/pages/dispute-detail-page";

export const Route = createFileRoute("/disputes/$disputeId")({
  component: DisputeDetailPage,
});
