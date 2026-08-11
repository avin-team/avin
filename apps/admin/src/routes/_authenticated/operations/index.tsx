import { createFileRoute } from "@tanstack/react-router";

import { OperationsPage } from "@/features/operations/pages/operations-page";

export const Route = createFileRoute("/_authenticated/operations/")({
  component: OperationsPage,
});
