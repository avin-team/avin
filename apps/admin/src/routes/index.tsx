import { createFileRoute } from "@tanstack/react-router";

import { OverviewPage } from "@/features/dashboard/pages/overview-page";

export const Route = createFileRoute("/")({
  component: OverviewPage,
});
