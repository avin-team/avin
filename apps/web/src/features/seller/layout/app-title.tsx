import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@avin/ui/components/sidebar";
import { StorefrontIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { orpc } from "@/utils/orpc";

export const SellerAppTitle = () => {
  const { setOpenMobile } = useSidebar();
  const profileQuery = useQuery(orpc.sellerStore.getProfile.queryOptions());
  const profile = profileQuery.data?.profile;

  const title = profile?.storefrontName || "Kênh bán hàng";
  const description =
    profile?.bio ||
    (profile?.storeSlug ? `/${profile.storeSlug}` : "Không gian bán hàng");

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          className="gap-3 px-2 py-1 hover:bg-sidebar-accent/50 active:bg-sidebar-accent"
          render={<div />}
          size="lg"
        >
          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-primary-foreground">
            {profile?.avatarUrl ? (
              <img
                alt={title}
                className="size-full object-cover"
                src={profile.avatarUrl}
              />
            ) : (
              <StorefrontIcon className="size-5" />
            )}
          </div>
          <Link
            className="grid flex-1 text-start leading-tight"
            onClick={() => setOpenMobile(false)}
            to="/seller/store"
          >
            <span className="truncate text-sm font-bold text-sidebar-foreground">
              {title}
            </span>
            <span className="truncate text-xs text-sidebar-foreground/70">
              {description}
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
