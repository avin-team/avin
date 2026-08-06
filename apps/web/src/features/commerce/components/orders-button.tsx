import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { Button } from "@avin/ui/components/button";
import { ShoppingBagIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { authClient } from "@/features/auth/api/auth-client";

export const OrdersButton = () => {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const isBuyer = session?.user.role === ACCOUNT_ROLE.BUYER;

  if (isSessionPending || !isBuyer) {
    return null;
  }

  return (
    <Button
      aria-label="Đơn hàng"
      className="relative"
      render={<Link to="/orders" />}
      size="icon"
      title="Đơn hàng"
      variant="ghost"
    >
      <ShoppingBagIcon className="size-5.5" />
    </Button>
  );
};
