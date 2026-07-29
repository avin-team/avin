import { Button } from "@avin/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@avin/ui/components/field";
import { Input } from "@avin/ui/components/input";
import { Spinner } from "@avin/ui/components/spinner";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

export default function SignUpForm() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const name = String(formData.get("name"));
    const password = String(formData.get("password"));

    setIsSubmitting(true);
    try {
      const result = await authClient.signUp.email({
        email,
        name,
        password,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Không thể tạo tài khoản.");
        return;
      }

      toast.success("Tạo tài khoản Buyer thành công.");
      await navigate({ to: "/dashboard" });
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
          <FieldLabel htmlFor="sign-up-name">Họ và tên</FieldLabel>
          <Input
            autoComplete="name"
            id="sign-up-name"
            minLength={2}
            name="name"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="sign-up-email">Email</FieldLabel>
          <Input
            autoComplete="email"
            id="sign-up-email"
            name="email"
            placeholder="ban@example.com"
            required
            type="email"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="sign-up-password">Mật khẩu</FieldLabel>
          <Input
            autoComplete="new-password"
            id="sign-up-password"
            minLength={8}
            name="password"
            required
            type="password"
          />
        </Field>
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting && <Spinner data-icon="inline-start" />}
          Tạo tài khoản Buyer
        </Button>
      </FieldGroup>
    </form>
  );
}
