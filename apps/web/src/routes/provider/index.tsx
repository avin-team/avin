import { createFileRoute } from "@tanstack/react-router";

import { requireProviderSession } from "@/features/protection/guards/require-provider-session";
import { ProviderWorkspacePage } from "@/features/protection/pages/provider-workspace-page";

export const Route = createFileRoute("/provider/")({
  beforeLoad: async () => {
    const session = await requireProviderSession();
    return { session };
  },
  component: ProviderWorkspacePage,
});
