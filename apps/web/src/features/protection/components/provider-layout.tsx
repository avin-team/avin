import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { Button } from "@avin/ui/components/button";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { providerAuthClient } from "../api/provider-auth-client";

export const ProviderLayout = ({
  children,
}: {
  readonly children?: ReactNode;
}) => {
  const navigate = useNavigate();
  const { data: session } = providerAuthClient.useSession();

  const signOut = async () => {
    await providerAuthClient.signOut();
    await navigate({ to: "/provider/login" });
  };

  return (
    <div className="min-h-svh bg-background text-foreground antialiased">
      <header className="border-border/60 border-b bg-background/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-3" to="/provider">
            <div className="flex size-9 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/20 shadow-sm">
              <img
                alt="Avin Logo"
                className="size-full object-cover"
                src="/logo.webp"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-foreground">Đối tác Avin</span>
              <span className="text-muted-foreground text-xs">
                Không gian Provider riêng
              </span>
            </div>
          </Link>

          {session?.user.role === ACCOUNT_ROLE.PROVIDER ? (
            <Button onClick={signOut} type="button" variant="outline">
              Đăng xuất
            </Button>
          ) : null}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {children ?? <Outlet />}
      </main>
    </div>
  );
};
