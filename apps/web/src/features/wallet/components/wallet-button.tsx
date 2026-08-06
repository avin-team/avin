import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { Button } from "@avin/ui/components/button";
import { Skeleton } from "@avin/ui/components/skeleton";
import { WalletIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { authClient } from "@/features/auth/api/auth-client";
import { walletSummaryQueryOptions } from "@/features/wallet/api/wallet-api";
import { formatVND } from "@/utils/format";

export const WalletButton = () => {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const isBuyer = session?.user.role === ACCOUNT_ROLE.BUYER;

  const summaryQuery = useQuery({
    ...walletSummaryQueryOptions(),
    enabled: isBuyer,
  });

  if (isSessionPending || !isBuyer) {
    return null;
  }

  if (summaryQuery.isLoading) {
    return <Skeleton className="h-9 w-24 rounded-full" />;
  }

  const balance = summaryQuery.data?.availableBalance ?? 0;

  return (
    <Button
      aria-label={`Ví của tôi, số dư ${formatVND(balance)}`}
      className="h-9 gap-1.5 rounded-full border border-border/50 bg-muted/50 px-3 text-xs font-medium transition-all hover:bg-muted"
      render={<Link to="/wallet" />}
      variant="outline"
    >
      <WalletIcon className="size-4 text-primary" />
      <span className="font-semibold text-foreground">
        {formatVND(balance)}
      </span>
    </Button>
  );
};
