import { createFileRoute } from "@tanstack/react-router";

import { TwoFactor } from "@/features/auth/two-factor";

export const Route = createFileRoute("/two-factor")({
  component: TwoFactor,
});
