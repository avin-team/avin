import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { Button } from "@avin/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@avin/ui/components/field";
import { Input } from "@avin/ui/components/input";
import { Spinner } from "@avin/ui/components/spinner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

const TwoFactorPage = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code"));
    setIsSubmitting(true);
    try {
      const result = await authClient.twoFactor.verifyTotp({
        code,
        trustDevice: true,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Mã xác thực không hợp lệ.");
        return;
      }

      const session = await authClient.getSession();
      if (session.data?.user.role === ACCOUNT_ROLE.ADMIN) {
        await navigate({ to: "/security" });
        return;
      }
      if (session.data?.user.role === ACCOUNT_ROLE.SELLER) {
        await navigate({ to: "/" });
        return;
      }

      await navigate({ to: "/dashboard" });
    } catch {
      toast.error("Không thể xác minh lúc này. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex h-full w-full max-w-sm items-center px-6">
      <form className="w-full" onSubmit={verify}>
        <FieldGroup>
          <Field>
            <h1 className="font-bold text-2xl">Xác thực hai lớp</h1>
            <FieldDescription>
              Nhập mã 6 số từ ứng dụng xác thực của bạn.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="two-factor-login-code">Mã xác thực</FieldLabel>
            <Input
              autoComplete="one-time-code"
              autoFocus
              id="two-factor-login-code"
              inputMode="numeric"
              maxLength={6}
              minLength={6}
              name="code"
              pattern="[0-9]{6}"
              required
            />
          </Field>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting && <Spinner data-icon="inline-start" />}
            Xác minh
          </Button>
        </FieldGroup>
      </form>
    </main>
  );
};

export const Route = createFileRoute("/two-factor")({
  component: TwoFactorPage,
});
