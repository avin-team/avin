import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@avin/ui/components/avatar";
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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@avin/ui/components/sidebar";
import {
  CaretUpDownIcon,
  SignOutIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import type { User } from "./types";

interface NavUserProps {
  readonly user?: User;
}

export const NavUser = ({ user: defaultUser }: NavUserProps) => {
  const navigate = useNavigate();
  const { isMobile } = useSidebar();

  const name = defaultUser?.name ?? "Admin Account";
  const email = defaultUser?.email ?? "";
  const avatar = defaultUser?.avatar ?? "";
  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      toast.success("Đã đăng xuất thành công");
      await navigate({ to: "/sign-in" });
    } catch {
      toast.error("Không thể đăng xuất. Vui lòng thử lại.");
    }
  };
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                size="lg"
              />
            }
          >
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage alt={name} src={avatar} />
              <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-start text-sm leading-tight">
              <span className="truncate font-semibold">{name}</span>
              <span className="truncate text-xs">{email}</span>
            </div>
            <CaretUpDownIcon className="ms-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-2 font-normal">
                <ShieldCheckIcon className="size-4 text-primary" />
                <div className="grid flex-1 text-start text-xs leading-tight">
                  <span className="font-semibold text-sm">{name}</span>
                  <span className="text-muted-foreground">
                    Quản trị viên (ADMIN)
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <SignOutIcon className="me-2 size-4" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
