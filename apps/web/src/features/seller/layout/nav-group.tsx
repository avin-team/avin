import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@avin/ui/components/sidebar";

import type { StoreSection } from "../data/store-mock-data";
import type { SellerNavGroup as SellerNavGroupData } from "./types";

interface SellerNavGroupProps {
  active: StoreSection;
  group: SellerNavGroupData;
  onChange: (section: StoreSection) => void;
}

export const SellerNavGroup = ({
  active,
  group,
  onChange,
}: SellerNavGroupProps) => {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
      <SidebarMenu>
        {group.items.map((item) => {
          const isActive = active === item.value;
          const Icon = item.icon;

          return (
            <SidebarMenuItem key={item.value}>
              <SidebarMenuButton
                isActive={isActive}
                render={
                  <button
                    aria-label={item.label}
                    onClick={() => {
                      onChange(item.value);
                      setOpenMobile(false);
                    }}
                    type="button"
                  />
                }
                tooltip={item.label}
              >
                <Icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
              {item.needsAttention && !isActive ? (
                <SidebarMenuBadge>
                  <span className="size-1.5 rounded-full bg-primary" />
                </SidebarMenuBadge>
              ) : null}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
};
