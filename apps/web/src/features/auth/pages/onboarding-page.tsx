import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import type { AccountRole } from "@avin/auth/permissions";
import { cn } from "@avin/ui/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Shell } from "@/components/shell";
import { authClient } from "@/features/auth/api/auth-client";
import { DecorIcon } from "@/features/auth/components/decor-icon";
import { RoleSelectionStep } from "@/features/auth/components/role-selection";
import { orpc } from "@/utils/orpc";

export const OnboardingPage = () => {
  const navigate = useNavigate();

  const selectRoleMutation = useMutation({
    ...orpc.sellerApplication.selectRole.mutationOptions(),
  });

  const handleSelectRole = async (role: AccountRole) => {
    try {
      await selectRoleMutation.mutateAsync({
        role: role === ACCOUNT_ROLE.SELLER ? "SELLER" : "BUYER",
      });

      // Refresh session in authClient cache
      await authClient.getSession();

      if (role === ACCOUNT_ROLE.SELLER) {
        toast.success("Đã thiết lập vai trò Người bán.");
        await navigate({ to: "/seller/onboarding" });
      } else {
        toast.success("Chào mừng bạn đến với Avin!");
        await navigate({ to: "/" });
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
          <header className="flex flex-col gap-1 text-center">
            <h1 className="font-bold text-2xl tracking-wide">
              Chào mừng bạn đến với Avin!
            </h1>
            <p className="text-base text-muted-foreground">
              Vui lòng chọn vai trò để thiết lập trải nghiệm phù hợp nhất.
            </p>
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
