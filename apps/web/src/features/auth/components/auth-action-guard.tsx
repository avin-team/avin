import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { authClient } from "@/features/auth/api/auth-client";

interface AuthActionGuardRenderProps {
  isSessionPending: boolean;
  runAuthenticatedAction: (action: () => void) => void;
}

interface AuthActionGuardProps {
  children: (props: AuthActionGuardRenderProps) => ReactNode;
}

export const AuthActionGuard = ({ children }: AuthActionGuardProps) => {
  const navigate = useNavigate();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  const runAuthenticatedAction = (action: () => void): void => {
    if (isSessionPending) {
      return;
    }

    if (!session) {
      void navigate({ to: "/login" });
      return;
    }

    action();
  };

  return children({ isSessionPending, runAuthenticatedAction });
};
