import { createFileRoute } from "@tanstack/react-router";

import { AdminLoginPage } from "@/features/auth/pages/admin-login-page";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
});
