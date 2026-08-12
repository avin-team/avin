import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import type { AccountRole } from "@avin/auth/permissions";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import { cn } from "@avin/ui/lib/utils";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Shell } from "@/components/shell";
import { AuthDivider } from "@/features/auth/components/auth-divider";
import { DecorIcon } from "@/features/auth/components/decor-icon";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { RoleSelectionStep } from "@/features/auth/components/role-selection";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

const getInitialRole = (roleParam?: string): AccountRole | null => {
  if (roleParam === "seller") {
    return ACCOUNT_ROLE.SELLER;
  }
  if (roleParam === "buyer") {
    return ACCOUNT_ROLE.BUYER;
  }
  return null;
};

const getAuthSubtitle = (tab: string, role: AccountRole | null): string => {
  if (tab === "sign-in") {
    return "Đăng nhập tài khoản của bạn để tiếp tục.";
  }
  if (role === ACCOUNT_ROLE.SELLER) {
    return "Tạo tài khoản Seller an toàn.";
  }
  if (role === ACCOUNT_ROLE.BUYER) {
    return "Tạo tài khoản Buyer an toàn.";
  }
  return "Đăng ký tài khoản Avin an toàn.";
};

const getOAuthErrorMessage = (
  error?: string,
  errorDescription?: string
): string => {
  if (error === "access_denied") {
    return "Đăng nhập Google đã bị hủy.";
  }
  if (error === "account_not_linked") {
    return "Email này đã được sử dụng với phương thức đăng nhập khác.";
  }
  return (
    errorDescription || "Không thể đăng nhập bằng Google. Vui lòng thử lại."
  );
};

const getErrorFromParams = (
  search: { error?: string; error_description?: string; googleError?: string },
  urlParams: URLSearchParams | null
): { shouldShowError: boolean; errorMessage: string } => {
  const errorParam = search.error || urlParams?.get("error");
  const errorDescParam =
    search.error_description || urlParams?.get("error_description");
  const googleErrorParam = search.googleError || urlParams?.get("googleError");

  const normalizedError = errorParam?.toLowerCase() || "";
  const isUnregisteredURL =
    googleErrorParam === "not_registered" ||
    normalizedError === "signup_disabled" ||
    normalizedError === "sign_up_disabled" ||
    normalizedError === "signup disabled";

  if (isUnregisteredURL) {
    return {
      errorMessage:
        "Bạn chưa có tài khoản. Vui lòng đăng ký trước khi đăng nhập bằng Google.",
      shouldShowError: true,
    };
  }

  if (errorParam) {
    return {
      errorMessage: getOAuthErrorMessage(
        errorParam,
        errorDescParam ?? undefined
      ),
      shouldShowError: true,
    };
  }

  return { errorMessage: "", shouldShowError: false };
};

export const AuthPage = () => {
  const navigate = useNavigate();
  const search = useSearch({ from: "/(auth)/login" });

  const [selectedRole, setSelectedRole] = useState<AccountRole | null>(() =>
    getInitialRole(search.role)
  );

  const activeTab = search.mode ?? "sign-in";

  // Show error toast if redirected back after a failed Google sign-in attempt
  // (user tried to sign in via Google but has no account — disableImplicitSignUp
  // blocked creation and redirected here via errorCallbackURL).
  useEffect(() => {
    const urlParams =
      typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search);

    const { errorMessage, shouldShowError } = getErrorFromParams(
      search,
      urlParams
    );

    if (shouldShowError) {
      // Small timeout ensures the toast system is fully mounted and ready
      setTimeout(() => {
        toast.error(errorMessage);
      }, 100);

      if (typeof window !== "undefined") {
        // Clean up URL without triggering re-renders
        const cleanUrl = new URL(window.location.href);
        if (
          cleanUrl.searchParams.has("error") ||
          cleanUrl.searchParams.has("error_description") ||
          cleanUrl.searchParams.has("googleError")
        ) {
          cleanUrl.searchParams.delete("error");
          cleanUrl.searchParams.delete("error_description");
          cleanUrl.searchParams.delete("googleError");
          window.history.replaceState({}, "", cleanUrl.toString());
        }
      }
    }
  }, [search]);

  const handleTabChange = (value: string) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        mode: value === "sign-up" ? "sign-up" : undefined,
      }),
      to: "/login",
    });
  };

  const handleSelectRole = (role: AccountRole) => {
    setSelectedRole(role);
    void navigate({
      search: (prev) => ({
        ...prev,
        mode: "sign-up",
        role: role === ACCOUNT_ROLE.SELLER ? "seller" : "buyer",
      }),
      to: "/login",
    });
  };

  const handleResetRole = () => {
    setSelectedRole(null);
    void navigate({
      search: (prev) => ({
        ...prev,
        role: undefined,
      }),
      to: "/login",
    });
  };

  const renderContent = () => {
    if (activeTab === "sign-in") {
      return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <GoogleSignInButton mode="sign-in" />
          <AuthDivider>HOẶC</AuthDivider>
          <SignInForm />
        </div>
      );
    }

    if (selectedRole === null) {
      return <RoleSelectionStep onSelectRole={handleSelectRole} />;
    }

    return (
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

        <GoogleSignInButton role={selectedRole} />
        <AuthDivider>HOẶC</AuthDivider>
        <SignUpForm role={selectedRole} />
      </div>
    );
  };

  return (
    <Shell variant="centered">
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

        <div className="flex w-full max-w-sm animate-in flex-col gap-6">
          <header className="flex flex-col gap-1">
            <h1 className="font-bold text-2xl tracking-wide">
              {activeTab === "sign-in"
                ? "Chào mừng đến Avin"
                : "Đăng ký tài khoản"}
            </h1>
            <p className="text-base text-muted-foreground">
              {getAuthSubtitle(activeTab, selectedRole)}
            </p>
          </header>

          {renderContent()}

          {/* Text link navigation at the bottom for mode switching */}
          <div className="flex justify-center border-t border-border/50 pt-4 text-center text-sm">
            {activeTab === "sign-in" ? (
              <p className="text-muted-foreground">
                Chưa có tài khoản?{" "}
                <button
                  className="font-semibold text-foreground underline underline-offset-4 hover:text-primary transition-colors cursor-pointer"
                  onClick={() => handleTabChange("sign-up")}
                  type="button"
                >
                  Đăng ký ngay
                </button>
              </p>
            ) : (
              <p className="text-muted-foreground">
                Đã có tài khoản?{" "}
                <button
                  className="font-semibold text-foreground underline underline-offset-4 hover:text-primary transition-colors cursor-pointer"
                  onClick={() => handleTabChange("sign-in")}
                  type="button"
                >
                  Đăng nhập
                </button>
              </p>
            )}
          </div>

          <p className="text-muted-foreground text-xs text-center">
            Khi tiếp tục, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo
            mật của Avin.
          </p>
        </div>
      </section>
    </Shell>
  );
};
