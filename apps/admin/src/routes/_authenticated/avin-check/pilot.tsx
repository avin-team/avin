import { createFileRoute } from "@tanstack/react-router";

import { ProtectionPilotPage } from "@/features/protection/pages/protection-pilot-page";

export const Route = createFileRoute("/_authenticated/avin-check/pilot")({
  component: ProtectionPilotPage,
});
