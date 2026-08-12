import { createFileRoute } from "@tanstack/react-router";

import { MainLayout } from "@/components/layout/main-layout";
import { requireSession } from "@/features/auth/guards/require-session";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const session = await requireSession();
    return { session };
  },
  component: MainLayout,
});
