import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@avin/ui/components/avatar";
import { Button } from "@avin/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@avin/ui/components/dropdown-menu";
import { Skeleton } from "@avin/ui/components/skeleton";
import {
  DesktopIcon,
  MoonIcon,
  SignOutIcon,
  ShieldCheckIcon,
  StorefrontIcon,
  SunIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { canAccessSellerFeatures } from "@/components/layout/header-action-visibility";
import { useTheme } from "@/components/theme-provider";
import { authClient } from "@/features/auth/api/auth-client";
import { orpc } from "@/utils/orpc";

export const UserMenu = () => {
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();
  const { data: session, isPending } = authClient.useSession();
  const isSeller = session?.user.role === ACCOUNT_ROLE.SELLER;

  const profileQuery = useQuery({
    ...orpc.sellerApplication.getProfile.queryOptions(),
    enabled: Boolean(isSeller),
  });

  if (isPending) {
    return <Skeleton className="size-9 rounded-full" />;
  }

  if (!session) {
    return (
      <div className="flex items-center space-x-3">
        <Link
          className="px-4 py-2 font-medium text-foreground/80 text-sm transition-colors duration-200 hover:text-foreground"
          to="/login"
        >
          Đăng nhập
        </Link>
        <Link
          className="inline-flex items-center space-x-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground text-sm shadow-sm transition-all duration-200 hover:bg-primary/90"
          to="/login"
        >
          <span>Bắt đầu ngay</span>
        </Link>
      </div>
    );
  }

  const profile = profileQuery.data?.profile;
  const canViewStore = canAccessSellerFeatures(
    Boolean(profile),
    profileQuery.data?.application?.status === "APPROVED"
  );
  const storeUrl = profile?.storeSlug
    ? `/store/${profile.storeSlug}`
    : "/seller/store-preview";

  const name = session.user.name ?? "User";
  const initials = name
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="ListIcon tài khoản"
            className="relative size-9 rounded-full border border-border/60 p-0 shadow-sm transition-transform hover:scale-105"
            variant="ghost"
          />
        }
      >
        <Avatar className="size-9 rounded-full">
          <AvatarImage alt={name} src={session.user.image ?? undefined} />
          <AvatarFallback className="bg-primary/10 font-semibold text-xs text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 bg-card p-2 shadow-lg">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-2 font-normal">
            <div className="flex items-center gap-3">
              <Avatar className="size-9 shrink-0">
                <AvatarImage alt={name} src={session.user.image ?? undefined} />
                <AvatarFallback className="bg-primary/10 font-semibold text-xs text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col space-y-0.5">
                <p className="truncate font-semibold text-foreground text-sm leading-tight">
                  {name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1" />
          {isSeller ? (
            <DropdownMenuItem
              onClick={async () => {
                await navigate({
                  to:
                    canViewStore && profile?.storeSlug
                      ? storeUrl
                      : "/seller/onboarding",
                });
              }}
            >
              <StorefrontIcon className="me-2 size-4" />
              {canViewStore && profile?.storeSlug
                ? "Xem gian hàng"
                : "Hoàn tất đăng ký"}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={async () => {
                await navigate({
                  to: "/onboarding",
                });
              }}
            >
              <StorefrontIcon className="me-2 size-4" />
              Trở thành người bán
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={async () => {
              await navigate({
                to: "/security",
              });
            }}
          >
            <ShieldCheckIcon className="me-2 size-4" />
            Bảo mật tài khoản
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <SunIcon className="me-2 size-4" />
              Giao diện
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup onValueChange={setTheme} value={theme}>
                <DropdownMenuRadioItem value="light">
                  <SunIcon className="me-2 size-4" />
                  Sáng
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <MoonIcon className="me-2 size-4" />
                  Tối
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">
                  <DesktopIcon className="me-2 size-4" />
                  Hệ thống
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator className="my-1" />
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
            <SignOutIcon className="me-2 size-4" />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
