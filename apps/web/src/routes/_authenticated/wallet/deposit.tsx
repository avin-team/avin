import { createFileRoute } from "@tanstack/react-router";

import { DepositPage } from "@/features/wallet/pages/deposit-page";

export const Route = createFileRoute("/_authenticated/wallet/deposit")({
  component: DepositPage,
});
