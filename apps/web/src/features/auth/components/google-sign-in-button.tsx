import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import type { AccountRole } from "@avin/auth/permissions";
import { Button } from "@avin/ui/components/button";
import { Spinner } from "@avin/ui/components/spinner";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/features/auth/api/auth-client";
import { GoogleIcon } from "@/features/auth/components/icons/google-icon";
import { getAuthCallbackUrl } from "@/features/auth/utils/get-auth-callback-url";
import { getPostSignUpRoute } from "@/features/auth/utils/get-post-sign-up-route";

interface GoogleSignInButtonProps {
  role?: AccountRole;
  mode?: "sign-in" | "sign-up";
}

export const GoogleSignInButton = ({
  role = ACCOUNT_ROLE.BUYER,
  mode = "sign-up",
}: GoogleSignInButtonProps) => {
  const [isPending, setIsPending] = useState(false);

  const continueWithGoogle = async () => {
    setIsPending(true);

    try {
      const { origin } = window.location;

      // Where existing users go after Google sign-in
      const callbackURL = getAuthCallbackUrl(
        mode === "sign-up" ? getPostSignUpRoute(role) : "/",
        origin
      );

      // Where BRAND-NEW users go after Google creates their account.
      // Sign-in mode: redirect back to login with an error —
      //   the user hasn't registered yet, they need to sign up first.
      // Sign-up mode: redirect to the post-auth route for their role.
      const newUserCallbackURL =
        mode === "sign-in"
          ? getAuthCallbackUrl("/login?googleError=not_registered", origin)
          : callbackURL;

      const result = await authClient.signIn.social({
        callbackURL,
        // In sign-in mode: redirect unregistered users back to login
        // with an error instead of the default error page.
        errorCallbackURL:
          mode === "sign-in"
            ? getAuthCallbackUrl("/login?googleError=not_registered", origin)
            : undefined,
        newUserCallbackURL,
        provider: "google",
        // Sign-up mode: allow account creation (server has
        // disableImplicitSignUp: true) and pass the chosen role
        // so the server databaseHooks can assign it.
        ...(mode === "sign-up" && {
          additionalData: { role },
          requestSignUp: true,
        }),
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
