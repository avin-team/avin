import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import type { AccountRole } from "@avin/auth/permissions";
import { Button } from "@avin/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@avin/ui/components/field";
import { Input } from "@avin/ui/components/input";
import { Spinner } from "@avin/ui/components/spinner";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

interface SignInFormProps {
  expectedRole?: AccountRole;
  redirectTo?: "/" | "/dashboard" | "/security";
}

export default function SignInForm({
  expectedRole = ACCOUNT_ROLE.BUYER,
  redirectTo = "/dashboard",
}: SignInFormProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    setIsSubmitting(true);
    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Không thể đăng nhập.");
        return;
      }

      if (result.data.user.role !== expectedRole) {
        await authClient.signOut();
        toast.error("Tài khoản không thuộc cổng đăng nhập này.");
        return;
      }

      toast.success("Đăng nhập thành công.");
      await navigate({ to: redirectTo });
    } catch {
      toast.error("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
          <Input
            autoComplete="email"
            id="sign-in-email"
            name="email"
            placeholder="ban@example.com"
            required
            type="email"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="sign-in-password">Mật khẩu</FieldLabel>
          <Input
            autoComplete="current-password"
            id="sign-in-password"
            minLength={8}
            name="password"
            required
            type="password"
          />
        </Field>
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting && <Spinner data-icon="inline-start" />}
          Đăng nhập
        </Button>
      </FieldGroup>
    </form>
  );
}
