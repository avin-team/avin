import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { AdvisorPreviewPage } from "@/features/advisor/pages/advisor-preview-page";
import { requireSession } from "@/features/auth/guards/require-session";

export const Route = createFileRoute("/_authenticated/advisor-preview")({
  beforeLoad: async () => {
    const session = await requireSession();
    const user = session.data?.user;
    if (user?.role !== ACCOUNT_ROLE.ADMIN || user.twoFactorEnabled !== true) {
      throw redirect({ throw: true, to: "/" });
    }
  },
  component: AdvisorPreviewPage,
});
