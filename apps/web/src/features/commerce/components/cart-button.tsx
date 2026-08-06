import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import { ShoppingCartIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { authClient } from "@/features/auth/api/auth-client";
import { orpc } from "@/utils/orpc";

const formatCartCount = (count: number): string =>
  count > 99 ? "99+" : String(count);

export const CartButton = () => {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const isBuyer = session?.user.role === ACCOUNT_ROLE.BUYER;
  const cartQuery = useQuery({
    ...orpc.commerce.cart.get.queryOptions(),
    enabled: isBuyer,
  });

  if (isSessionPending || !isBuyer) {
    return null;
  }

  const itemCount = cartQuery.data?.items.length ?? 0;

  return (
    <Button
      aria-label={
        itemCount > 0 ? `Giỏ hàng, ${itemCount} sản phẩm` : "Giỏ hàng"
      }
      className="relative"
      render={<Link to="/cart" />}
      size="icon"
      variant="ghost"
    >
      <ShoppingCartIcon data-icon="inline-start" />
      {itemCount > 0 ? (
        <Badge
          aria-hidden="true"
          className="pointer-events-none absolute -top-1.5 -right-1.5 min-w-5 justify-center px-1 text-[10px] leading-none"
          variant="destructive"
        >
          {formatCartCount(itemCount)}
        </Badge>
      ) : null}
    </Button>
  );
};
