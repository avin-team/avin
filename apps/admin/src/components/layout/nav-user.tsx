/* eslint-disable unicorn/no-abusive-eslint-disable */
/* oxlint-disable */
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@avin/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@avin/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@avin/ui/components/sidebar";
import { ChevronsUpDown, ShieldCheck } from "lucide-react";

interface NavUserProps {
  readonly user: {
    readonly name: string;
    readonly email: string;
    readonly avatar: string;
  };
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar();

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
              <AvatarImage alt={user.name} src={user.avatar} />
              <AvatarFallback className="rounded-lg">AV</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-start text-sm leading-tight">
              <span className="truncate font-semibold">{user.name}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
            <ChevronsUpDown className="ms-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="flex items-center gap-2 font-normal">
              <ShieldCheck className="size-4 text-primary" />
              Phiên làm việc Admin Mẫu
            </DropdownMenuLabel>
            <DropdownMenuItem disabled>
              Chưa bật xác thực tài khoản (ADR 0003)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
