import { createFileRoute } from "@tanstack/react-router";

import { requireSession } from "@/features/auth/guards/require-session";
import { SecurityPage } from "@/features/auth/pages/security-page";

export const Route = createFileRoute("/security")({
  beforeLoad: requireSession,
  component: SecurityPage,
});
