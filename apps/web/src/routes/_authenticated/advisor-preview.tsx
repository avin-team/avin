import { createFileRoute } from "@tanstack/react-router";

import { AdvisorPreviewPage } from "@/features/advisor/pages/advisor-preview-page";

export const Route = createFileRoute("/_authenticated/advisor-preview")({
  component: AdvisorPreviewPage,
});
