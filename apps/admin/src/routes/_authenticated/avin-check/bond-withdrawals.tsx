import { createFileRoute } from "@tanstack/react-router";

import { ProviderBondWithdrawalsPage } from "@/features/protection/pages/provider-bond-withdrawals-page";

export const Route = createFileRoute(
  "/_authenticated/avin-check/bond-withdrawals"
)({
  component: ProviderBondWithdrawalsPage,
});
