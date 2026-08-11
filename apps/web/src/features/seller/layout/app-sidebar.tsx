import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@avin/ui/components/sidebar";
import { EyeIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import type { StoreSection } from "../data/store-types";
import { SellerAppTitle } from "./app-title";
import { SELLER_NAV_GROUPS } from "./data/sidebar-data";
import { SellerNavGroup } from "./nav-group";

interface SellerAppSidebarProps {
  active: StoreSection;
  onChange?: (section: StoreSection) => void;
}

export const SellerAppSidebar = ({
  active,
  onChange,
}: SellerAppSidebarProps) => (
  <Sidebar
    className="top-16 h-[calc(100svh-4rem)]"
    collapsible="icon"
    variant="sidebar"
  >
    <SidebarHeader>
      <SellerAppTitle />
    </SidebarHeader>
    <SidebarContent className="gap-1">
      {SELLER_NAV_GROUPS.map((props) => (
        <SellerNavGroup
          active={active}
          key={props.title}
          onChange={onChange}
          {...props}
        />
      ))}
    </SidebarContent>
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            render={
              <Link
                aria-label="Xem trang gian hàng"
                to="/seller/store-preview"
              />
            }
            tooltip="Xem trang gian hàng"
          >
            <EyeIcon />
            <span>Xem trang gian hàng</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
);
