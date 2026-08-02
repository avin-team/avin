import { createFileRoute } from "@tanstack/react-router";

import { WalletPage } from "@/features/wallet/pages/wallet-page";

export const Route = createFileRoute("/_authenticated/wallet/")({
  component: WalletPage,
});
