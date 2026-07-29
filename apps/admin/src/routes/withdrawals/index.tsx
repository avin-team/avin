import { createFileRoute } from "@tanstack/react-router";

import { WithdrawalQueuePage } from "@/features/withdrawals/pages/withdrawal-queue-page";

export const Route = createFileRoute("/withdrawals/")({
  component: WithdrawalQueuePage,
});
