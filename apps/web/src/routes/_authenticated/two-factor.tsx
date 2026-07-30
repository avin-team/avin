import { createFileRoute } from "@tanstack/react-router";

import { TwoFactorPage } from "@/features/auth/pages/two-factor-page";

export const Route = createFileRoute("/_authenticated/two-factor")({
  component: TwoFactorPage,
});
