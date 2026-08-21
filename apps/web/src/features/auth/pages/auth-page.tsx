import { cn } from "@avin/ui/lib/utils";
import { useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

import { Shell } from "@/components/shell";
import { DecorIcon } from "@/features/auth/components/decor-icon";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";

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
  search: { error?: string; error_description?: string },
  urlParams: URLSearchParams | null
): { shouldShowError: boolean; errorMessage: string } => {
  const errorParam = search.error || urlParams?.get("error");
  const errorDescParam =
    search.error_description || urlParams?.get("error_description");

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
  const search = useSearch({ from: "/(auth)/login" });

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
      setTimeout(() => {
        toast.error(errorMessage);
      }, 100);

      if (typeof window !== "undefined") {
        const cleanUrl = new URL(window.location.href);
        if (
          cleanUrl.searchParams.has("error") ||
          cleanUrl.searchParams.has("error_description")
        ) {
          cleanUrl.searchParams.delete("error");
          cleanUrl.searchParams.delete("error_description");
          window.history.replaceState({}, "", cleanUrl.toString());
        }
      }
    }
  }, [search]);

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
          <header className="flex flex-col gap-1 text-center">
            <h1 className="font-bold text-2xl tracking-wide">
              Chào mừng đến Avin
            </h1>
            <p className="text-base text-muted-foreground">
              Đăng nhập hoặc đăng ký tài khoản để tiếp tục.
            </p>
          </header>

          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <GoogleSignInButton />
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
