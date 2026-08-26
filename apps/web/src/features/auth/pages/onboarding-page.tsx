import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import type { AccountRole } from "@avin/auth/permissions";
import { cn } from "@avin/ui/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";

import { Shell } from "@/components/shell";
import { invalidateAuthSession } from "@/features/auth/api/session-query";
import { DecorIcon } from "@/features/auth/components/decor-icon";
import { RoleSelectionStep } from "@/features/auth/components/role-selection";
import { sanitizeRedirectPath } from "@/features/auth/utils/sanitize-redirect-path";
import { orpc } from "@/utils/orpc";

export const OnboardingPage = () => {
  const navigate = useNavigate();
  const { redirectTo } = useSearch({ from: "/_authenticated/onboarding" });
  const safeRedirectTo = sanitizeRedirectPath(redirectTo);
  const queryClient = useQueryClient();

  const selectRoleMutation = useMutation({
    ...orpc.sellerApplication.selectRole.mutationOptions(),
  });

  const handleSelectRole = async (role: AccountRole) => {
    try {
      await selectRoleMutation.mutateAsync({
        role: role === ACCOUNT_ROLE.SELLER ? "SELLER" : "BUYER",
      });

      // Invalidate session in query cache to trigger fresh fetch
      await invalidateAuthSession(queryClient);

      if (role === ACCOUNT_ROLE.SELLER) {
        toast.success("Đã thiết lập vai trò Người bán.");
        await navigate({ to: "/seller/onboarding" });
      } else {
        toast.success("Chào mừng bạn đến với Avin!");
        await navigate({ to: safeRedirectTo });
      }
    } catch {
      toast.error("Không thể thiết lập vai trò. Vui lòng thử lại.");
    }
  };

  return (
    <Shell variant="centered">
      <section
        className={cn(
          "relative flex w-full max-w-lg flex-col justify-between p-6 md:p-8",
          "dark:bg-[radial-gradient(50%_80%_at_20%_0%,--theme(--color-foreground/.1),transparent)]"
        )}
      >
        <div className="absolute -inset-y-6 -left-px w-px bg-border" />
        <div className="absolute -inset-y-6 -right-px w-px bg-border" />
        <div className="absolute -inset-x-6 -top-px h-px bg-border" />
        <div className="absolute -inset-x-6 -bottom-px h-px bg-border" />
        <DecorIcon position="top-left" />
        <DecorIcon position="bottom-right" />

        <div className="flex w-full max-w-lg animate-in flex-col gap-6">
          <header className="flex flex-col items-center gap-3 text-center">
            <div className="relative flex size-12 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-muted/20 shadow-xs">
              <img
                alt="Avin Logo"
                className="size-full object-cover"
                src="/logo.webp"
              />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="font-bold text-2xl tracking-wide">
                Chào mừng bạn đến với Avin!
              </h1>
              <p className="text-sm text-muted-foreground">
                Vui lòng chọn vai trò để thiết lập trải nghiệm phù hợp nhất.
              </p>
            </div>
          </header>

          <RoleSelectionStep
            disabled={selectRoleMutation.isPending}
            onSelectRole={handleSelectRole}
          />
        </div>
      </section>
    </Shell>
  );
};
