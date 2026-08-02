import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@avin/ui/components/sidebar";
import { Link } from "@tanstack/react-router";
import { Eye, Store } from "lucide-react";

import type { StoreSection } from "../data/store-mock-data";
import { SellerAppTitle } from "./app-title";
import { SELLER_NAV_GROUPS } from "./data/sidebar-data";
import { SellerNavGroup } from "./nav-group";

interface SellerAppSidebarProps {
  active: StoreSection;
  onChange: (section: StoreSection) => void;
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
            <Eye />
            <span>Xem trang gian hàng</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            render={<button aria-label="Trạng thái gian hàng" type="button" />}
          >
            <Store />
            <span>Trạng thái gian hàng</span>
          </SidebarMenuButton>
          <SidebarMenuBadge>
            <span className="text-[10px] text-amber-300">Nháp</span>
          </SidebarMenuBadge>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
);
