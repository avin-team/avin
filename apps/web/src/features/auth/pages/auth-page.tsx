import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import type { AccountRole } from "@avin/auth/permissions";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@avin/ui/components/tabs";
import { cn } from "@avin/ui/lib/utils";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";

import { AuthDivider } from "@/features/auth/components/auth-divider";
import { DecorIcon } from "@/features/auth/components/decor-icon";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { RoleSelectionStep } from "@/features/auth/components/role-selection";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { getPostAuthRoute } from "@/features/auth/utils/get-post-auth-route";

const getInitialRole = (roleParam?: string): AccountRole | null => {
  if (roleParam === "seller") {
    return ACCOUNT_ROLE.SELLER;
  }
  if (roleParam === "buyer") {
    return ACCOUNT_ROLE.BUYER;
  }
  return null;
};

export const AuthPage = () => {
  const navigate = useNavigate();
  const search = useSearch({ from: "/(auth)/login" });

  const [selectedRole, setSelectedRole] = useState<AccountRole | null>(() =>
    getInitialRole(search.role)
  );

  const handleSelectRole = (role: AccountRole) => {
    setSelectedRole(role);
    void navigate({
      search: (prev) => ({
        ...prev,
        role: role === ACCOUNT_ROLE.SELLER ? "seller" : "buyer",
      }),
      to: "/(auth)/login",
    });
  };

  const handleResetRole = () => {
    setSelectedRole(null);
    void navigate({
      search: (prev) => ({
        ...prev,
        role: undefined,
      }),
      to: "/(auth)/login",
    });
  };

  const defaultMode = search.mode ?? "sign-in";

  return (
    <main className="relative flex h-full w-full items-center justify-center overflow-hidden px-6 md:px-8">
      <section
        className={cn(
          "relative flex w-full max-w-sm flex-col justify-between p-6 md:p-8",
          "dark:bg-[radial-gradient(50%_80%_at_20%_0%,--theme(--color-foreground/.1),transparent)]"
        )}
      >
        <div className="absolute -inset-y-6 -left-px w-px bg-border" />
        <div className="absolute -inset-y-6 -right-px w-px bg-border" />
        <div className="absolute -inset-x-6 -top-px h-px bg-border" />
        <div className="absolute -inset-x-6 -bottom-px h-px bg-border" />
        <DecorIcon position="top-left" />
        <DecorIcon position="bottom-right" />

        <div className="flex w-full max-w-sm animate-in flex-col gap-8">
          {selectedRole === null ? (
            <RoleSelectionStep onSelectRole={handleSelectRole} />
          ) : (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <Badge className="gap-1.5 px-2.5 py-1" variant="secondary">
                  <span className="text-muted-foreground">Vai trò:</span>
                  <span className="font-semibold text-foreground">
                    {selectedRole === ACCOUNT_ROLE.SELLER
                      ? "Người bán (Seller)"
                      : "Người mua (Buyer)"}
                  </span>
                </Badge>
                <Button
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleResetRole}
                  size="sm"
                  variant="ghost"
                >
                  Thay đổi
                </Button>
              </div>

              <header className="flex flex-col gap-1">
                <h1 className="font-bold text-2xl tracking-wide">
                  Chào mừng đến Avin
                </h1>
                <p className="text-base text-muted-foreground">
                  Đăng nhập hoặc tạo tài khoản{" "}
                  {selectedRole === ACCOUNT_ROLE.SELLER ? "Seller" : "Buyer"} an
                  toàn.
                </p>
              </header>

              <Tabs defaultValue={defaultMode}>
                <TabsList className="w-full">
                  <TabsTrigger value="sign-in">Đăng nhập</TabsTrigger>
                  <TabsTrigger value="sign-up">Đăng ký</TabsTrigger>
                </TabsList>
                <TabsContent value="sign-in">
                  <SignInForm
                    expectedRole={selectedRole}
                    redirectTo={getPostAuthRoute(selectedRole)}
                  />
                </TabsContent>
                <TabsContent value="sign-up">
                  <SignUpForm role={selectedRole} />
                </TabsContent>
              </Tabs>

              <AuthDivider>HOẶC</AuthDivider>
              <GoogleSignInButton role={selectedRole} />

              <p className="text-muted-foreground text-sm">
                Khi tiếp tục, bạn đồng ý với Điều khoản dịch vụ và Chính sách
                bảo mật của Avin.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};
