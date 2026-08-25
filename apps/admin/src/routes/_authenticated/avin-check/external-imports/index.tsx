import { createFileRoute } from "@tanstack/react-router";

import { ExternalRiskImportPage } from "@/features/protection/pages/external-risk-import-page";

export const Route = createFileRoute(
  "/_authenticated/avin-check/external-imports/"
)({
  component: ExternalRiskImportPage,
});
