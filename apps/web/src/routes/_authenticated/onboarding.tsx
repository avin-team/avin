import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { OnboardingPage } from "@/features/auth/pages/onboarding-page";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
  validateSearch: z.object({ redirectTo: z.string().optional() }),
});
