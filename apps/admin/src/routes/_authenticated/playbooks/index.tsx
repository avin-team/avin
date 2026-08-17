import { createFileRoute } from "@tanstack/react-router";

import { PlaybooksPage } from "@/features/playbooks/pages/playbooks-page";

export const Route = createFileRoute("/_authenticated/playbooks/")({
  component: PlaybooksPage,
});
