import { Badge } from "@avin/ui/components/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@avin/ui/components/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@avin/ui/components/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@avin/ui/components/sidebar";
import { CaretRightIcon } from "@phosphor-icons/react";
import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type {
  NavCollapsible,
  NavItem,
  NavLink,
  NavGroup as NavGroupProps,
} from "./types";

const isSubItemActive = (
  href: string,
  subUrl: string,
  allSubUrls: string[]
) => {
  const cleanHref = href.split("?")[0] ?? href;
  if (cleanHref === subUrl) {
    return true;
  }
  if (subUrl !== "/" && cleanHref.startsWith(`${subUrl}/`)) {
    const hasMoreSpecificSibling = allSubUrls.some(
      (otherUrl) =>
        otherUrl !== subUrl &&
        otherUrl.length > subUrl.length &&
        cleanHref.startsWith(otherUrl)
    );
    return !hasMoreSpecificSibling;
  }
  return false;
};

const isItemActive = (href: string, item: NavItem) => {
  const cleanHref = href.split("?")[0] ?? href;
  if ("url" in item && item.url) {
    if (cleanHref === item.url) {
      return true;
    }
    if (item.url !== "/" && cleanHref.startsWith(`${item.url}/`)) {
      return true;
    }
    return false;
  }
  if ("items" in item && Array.isArray(item.items)) {
    const allSubUrls = item.items.map((i) => i.url as string);
    return item.items.some((subItem) =>
      isSubItemActive(href, subItem.url as string, allSubUrls)
    );
  }
  return false;
};

const NavBadge = ({ children }: { children: ReactNode }) => (
  <Badge className="rounded-full px-1 py-0 text-xs">{children}</Badge>
);

const SidebarMenuLink = ({ item, href }: { item: NavLink; href: string }) => {
  const { setOpenMobile } = useSidebar();
  const isActive = isItemActive(href, item);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={item.title}
        render={<Link to={item.url} onClick={() => setOpenMobile(false)} />}
      >
        {item.icon && <item.icon />}
        <span>{item.title}</span>
        {item.badge && <NavBadge>{item.badge}</NavBadge>}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

const SidebarMenuCollapsible = ({
  item,
  href,
}: {
  item: NavCollapsible;
  href: string;
}) => {
  const { setOpenMobile } = useSidebar();
  const allSubUrls = item.items.map((i) => i.url as string);
  const isAnyActive = item.items.some((subItem) =>
    isSubItemActive(href, subItem.url as string, allSubUrls)
  );

  return (
    <Collapsible defaultOpen={isAnyActive} render={<SidebarMenuItem />}>
      <CollapsibleTrigger
        className="group"
        render={
          <SidebarMenuButton isActive={isAnyActive} tooltip={item.title} />
        }
      >
        {item.icon && <item.icon />}
        <span>{item.title}</span>
        {item.badge && <NavBadge>{item.badge}</NavBadge>}
        <CaretRightIcon className="ms-auto transition-transform duration-200 group-data-panel-open:rotate-90 rtl:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-all duration-300 ease-out data-ending-style:h-0 data-starting-style:h-0 [&[hidden]:not([hidden='until-found'])]:hidden">
        <SidebarMenuSub>
          {item.items.map((subItem) => {
            const isActive = isSubItemActive(
              href,
              subItem.url as string,
              allSubUrls
            );
            return (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  isActive={isActive}
                  render={
                    <Link
                      to={subItem.url}
                      onClick={() => setOpenMobile(false)}
                    />
                  }
                >
                  {subItem.icon && <subItem.icon />}
                  <span>{subItem.title}</span>
                  {subItem.badge && <NavBadge>{subItem.badge}</NavBadge>}
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
};

const SidebarMenuCollapsedDropdown = ({
  item,
  href,
}: {
  item: NavCollapsible;
  href: string;
}) => {
  const allSubUrls = item.items.map((i) => i.url as string);
  const isAnyActive = item.items.some((subItem) =>
    isSubItemActive(href, subItem.url as string, allSubUrls)
  );

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuButton tooltip={item.title} isActive={isAnyActive} />
          }
        >
          {item.icon && <item.icon />}
          <span>{item.title}</span>
          {item.badge && <NavBadge>{item.badge}</NavBadge>}
          <CaretRightIcon className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={4}>
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              {item.title} {item.badge ? `(${item.badge})` : ""}
            </DropdownMenuLabel>

            <DropdownMenuSeparator />
            {item.items.map((sub) => {
              const isActive = isSubItemActive(
                href,
                sub.url as string,
                allSubUrls
              );
              return (
                <DropdownMenuItem
                  key={`${sub.title}-${sub.url}`}
                  render={
                    <Link
                      to={sub.url}
                      className={isActive ? "bg-secondary" : ""}
                    />
                  }
                >
                  {sub.icon && <sub.icon />}
                  <span className="max-w-52 text-wrap">{sub.title}</span>
                  {sub.badge && (
                    <span className="ms-auto text-xs">{sub.badge}</span>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

export const NavGroup = ({ title, items }: NavGroupProps) => {
  const { state, isMobile } = useSidebar();
  const href = useLocation({ select: (location) => location.href });
  return (
    <SidebarGroup className="py-0">
      {title ? <SidebarGroupLabel>{title}</SidebarGroupLabel> : null}
      <SidebarMenu>
        {items.map((item) => {
          const key = `${item.title}-${"url" in item && item.url ? item.url : "collapsible"}`;

          if (!item.items) {
            return <SidebarMenuLink key={key} item={item} href={href} />;
          }

          if (state === "collapsed" && !isMobile) {
            return (
              <SidebarMenuCollapsedDropdown key={key} item={item} href={href} />
            );
          }

          return <SidebarMenuCollapsible key={key} item={item} href={href} />;
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
};
