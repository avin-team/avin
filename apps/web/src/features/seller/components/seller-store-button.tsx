import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { Button } from "@avin/ui/components/button";
import { StorefrontIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { authClient } from "@/features/auth/api/auth-client";

export const SellerStoreButton = () => {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const isSeller = session?.user.role === ACCOUNT_ROLE.SELLER;

  if (isSessionPending || !isSeller) {
    return null;
  }

  const label = "Kênh bán hàng";

  return (
    <Button
      aria-label={label}
      className="relative"
      render={<Link to="/seller/store" />}
      size="icon"
      title={label}
      variant="ghost"
    >
      <StorefrontIcon className="size-5.5" />
    </Button>
  );
};
