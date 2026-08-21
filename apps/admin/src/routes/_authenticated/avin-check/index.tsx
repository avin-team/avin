import { createFileRoute } from "@tanstack/react-router";

import { ProtectionLaunchGatesPage } from "@/features/protection/pages/protection-launch-gates-page";

export const Route = createFileRoute("/_authenticated/avin-check/")({
  component: ProtectionLaunchGatesPage,
});
