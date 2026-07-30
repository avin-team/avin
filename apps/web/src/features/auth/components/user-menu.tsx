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
      <Link to="/login">
        <Button variant="outline">Sign In</Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        {session.user.name}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
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
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
