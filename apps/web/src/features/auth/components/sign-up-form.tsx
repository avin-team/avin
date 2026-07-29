import { Button } from "@avin/ui/components/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@avin/ui/components/field";
import { Input } from "@avin/ui/components/input";
import { Spinner } from "@avin/ui/components/spinner";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/features/auth/api/auth-client";
import { signUpSchema } from "@/features/auth/schemas/auth-schemas";
import { getAuthCallbackUrl } from "@/features/auth/utils/get-auth-callback-url";

export const SignUpForm = () => {
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const form = useForm({
    defaultValues: {
      email: "",
      name: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await authClient.signUp.email({
          callbackURL: getAuthCallbackUrl("/", window.location.origin),
          email: value.email,
          name: value.name,
          password: value.password,
        });

        if (result.error) {
          toast.error(result.error.message ?? "Không thể tạo tài khoản.");
          return;
        }

        setRegisteredEmail(value.email);
        toast.success("Vui lòng kiểm tra email để xác minh tài khoản.");
      } catch {
        toast.error("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
      }
    },
    validators: {
      onSubmit: signUpSchema,
    },
  });

  if (registeredEmail) {
    return (
      <div className="flex flex-col gap-4 text-sm text-muted-foreground">
        <p>
          Email xác minh đã được gửi đến <strong>{registeredEmail}</strong>.
        </p>
        <p>
          Liên kết có hiệu lực trong 24 giờ. Sau khi xác minh, bạn sẽ được đăng
          nhập tự động.
        </p>
        <Button
          onClick={() => setRegisteredEmail(null)}
          type="button"
          variant="outline"
        >
          Đăng ký email khác
        </Button>
      </div>
    );
  }

  return (
    <form
      id="sign-up-form"
      onSubmit={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field name="name">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Họ và tên</FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  autoComplete="name"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="email">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  autoComplete="email"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="ban@example.com"
                  type="email"
                  value={field.state.value}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="password">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Mật khẩu</FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  autoComplete="new-password"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  type="password"
                  value={field.state.value}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button
              disabled={!canSubmit || isSubmitting}
              form="sign-up-form"
              type="submit"
            >
              {isSubmitting && <Spinner data-icon="inline-start" />}
              Tạo tài khoản Buyer
            </Button>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  );
};
