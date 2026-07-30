import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import type { AccountRole } from "@avin/auth/permissions";
import { Button } from "@avin/ui/components/button";
import { Spinner } from "@avin/ui/components/spinner";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/features/auth/api/auth-client";
import { GoogleIcon } from "@/features/auth/components/icons/google-icon";
import { getAuthCallbackUrl } from "@/features/auth/utils/get-auth-callback-url";
import { getPostAuthRoute } from "@/features/auth/utils/get-post-auth-route";

interface GoogleSignInButtonProps {
  role?: AccountRole;
}

export const GoogleSignInButton = ({
  role = ACCOUNT_ROLE.BUYER,
}: GoogleSignInButtonProps) => {
  const [isPending, setIsPending] = useState(false);

  const continueWithGoogle = async () => {
    setIsPending(true);

    try {
      const result = await authClient.signIn.social({
        callbackURL: getAuthCallbackUrl(
          getPostAuthRoute(role),
          window.location.origin
        ),
        provider: "google",
      });

      if (result?.error) {
        toast.error(result.error.message ?? "Không thể tiếp tục với Google.");
      }
    } catch {
      toast.error("Không thể kết nối với Google. Vui lòng thử lại.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      disabled={isPending}
      onClick={continueWithGoogle}
      type="button"
      variant="outline"
    >
      {isPending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <GoogleIcon data-icon="inline-start" />
      )}
      Tiếp tục với Google
    </Button>
  );
};
