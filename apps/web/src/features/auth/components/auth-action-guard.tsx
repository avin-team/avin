import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import type { AccountRole } from "@avin/auth/permissions";
import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { toast } from "sonner";

import type { SessionData } from "@/features/auth/api/session-query";
import { useSession } from "@/features/auth/api/session-query";

interface AuthActionGuardRenderProps {
  isBuyer: boolean;
  isSeller: boolean;
  isSessionPending: boolean;
  role: AccountRole | null | undefined;
  runAuthenticatedAction: (action: () => void) => void;
  session: SessionData;
}

interface AuthActionGuardProps {
  children: (props: AuthActionGuardRenderProps) => ReactNode;
  requiredRole?: AccountRole;
}

export const AuthActionGuard = ({
  children,
  requiredRole = ACCOUNT_ROLE.BUYER,
}: AuthActionGuardProps) => {
  const navigate = useNavigate();
  const { data: session, isPending: isSessionPending } = useSession();
  const role = session?.user?.role as AccountRole | undefined;
  const isSeller = role === ACCOUNT_ROLE.SELLER;
  const isBuyer = role === ACCOUNT_ROLE.BUYER || (!role && Boolean(session));

  const runAuthenticatedAction = (action: () => void): void => {
    if (isSessionPending) {
      return;
    }

    if (!session) {
      void navigate({ to: "/login" });
      return;
    }

    if (requiredRole === ACCOUNT_ROLE.BUYER && isSeller) {
      toast.error(
        "Tài khoản Người bán không thể thực hiện thao tác mua hàng. Vui lòng sử dụng tài khoản Người mua."
      );
      return;
    }

    if (requiredRole && role && role !== requiredRole) {
      toast.error("Bạn không có quyền thực hiện thao tác này.");
      return;
    }

    action();
  };

  return children({
    isBuyer,
    isSeller,
    isSessionPending,
    role,
    runAuthenticatedAction,
    session: session ?? null,
  });
};
