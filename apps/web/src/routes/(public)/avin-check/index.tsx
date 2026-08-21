import { createFileRoute } from "@tanstack/react-router";

import { AvinCheckLandingPage } from "@/features/protection/pages/avin-check-landing-page";

export const Route = createFileRoute("/(public)/avin-check/")({
  component: AvinCheckLandingPage,
});
