import { createFileRoute } from "@tanstack/react-router";

import { NotificationsPage } from "@/features/notifications/pages/notifications-page";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});
