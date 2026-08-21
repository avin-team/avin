import { createFileRoute } from "@tanstack/react-router";

import { requireSession } from "@/features/auth/guards/require-session";
import { ProviderWorkspacePage } from "@/features/protection/pages/provider-workspace-page";

export const Route = createFileRoute("/(public)/avin-check/workspace")({
  beforeLoad: ({ context, location }) =>
    requireSession(
      context.queryClient,
      `${location.pathname}${location.search}`
    ),
  component: ProviderWorkspacePage,
});
