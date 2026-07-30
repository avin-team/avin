import { Button } from "@avin/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@avin/ui/components/dropdown-menu";
import { Skeleton } from "@avin/ui/components/skeleton";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { authClient } from "@/features/auth/api/auth-client";

export const UserMenu = () => {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Skeleton className="h-9 w-24" />;
  }

  if (!session) {
    return (
      <div className="flex items-center space-x-3">
        <Link
          className="px-4 py-2 text-sm font-medium text-foreground/80 transition-colors duration-200 hover:text-foreground"
          to="/login"
        >
          Đăng nhập
        </Link>
        <Link
          className="inline-flex items-center space-x-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90"
          to="/login"
        >
          <span>Bắt đầu ngay</span>
        </Link>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        {session.user.name}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Tài khoản của tôi</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>{session.user.email}</DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              await navigate({
                to: "/security",
              });
            }}
          >
            Bảo mật tài khoản
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              try {
                const result = await authClient.signOut();

                if (result.error) {
                  toast.error(result.error.message ?? "Không thể đăng xuất.");
                  return;
                }

                await navigate({
                  to: "/",
                });
              } catch {
                toast.error("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
              }
            }}
            variant="destructive"
          >
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
