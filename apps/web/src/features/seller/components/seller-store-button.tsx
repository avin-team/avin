import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { Button } from "@avin/ui/components/button";
import { StorefrontIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";

import { authClient } from "@/features/auth/api/auth-client";
import { orpc } from "@/utils/orpc";

export const SellerStoreButton = () => {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const isSeller = session?.user.role === ACCOUNT_ROLE.SELLER;
  const location = useLocation();

  const profileQuery = useQuery({
    ...orpc.sellerStore.getProfile.queryOptions(),
    enabled: isSeller,
  });

  if (isSessionPending || !isSeller) {
    return null;
  }

  const profile = profileQuery.data?.profile;
  const isSellerRoute = location.pathname.startsWith("/seller");

  let targetUrl = "/seller/store";
  if (isSellerRoute) {
    targetUrl = profile?.storeSlug
      ? `/store/${profile.storeSlug}`
      : "/seller/store-preview";
  }

  const label = isSellerRoute ? "Xem trang gian hàng" : "Kênh bán hàng";

  return (
    <Button
      aria-label={label}
      className="relative"
      render={<Link to={targetUrl} />}
      size="icon"
      title={label}
      variant="ghost"
    >
      <StorefrontIcon className="size-5.5" />
    </Button>
  );
};
