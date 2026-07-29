import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import type { AccountRole } from "@avin/auth/permissions";
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
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { authClient } from "@/features/auth/api/auth-client";
import { signInSchema } from "@/features/auth/schemas/auth-schemas";
import type { PostAuthRoute } from "@/features/auth/utils/get-post-auth-route";

interface SignInFormProps {
  expectedRole?: AccountRole;
  redirectTo?: PostAuthRoute;
}

export const SignInForm = ({
  expectedRole = ACCOUNT_ROLE.BUYER,
  redirectTo = "/dashboard",
}: SignInFormProps) => {
  const navigate = useNavigate();
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await authClient.signIn.email({
          email: value.email,
          password: value.password,
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
      }
    },
    validators: {
      onSubmit: signInSchema,
    },
  });

  return (
    <form
      id="sign-in-form"
      onSubmit={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await form.handleSubmit();
      }}
    >
      <FieldGroup>
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
                  autoComplete="current-password"
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
              form="sign-in-form"
              type="submit"
            >
              {isSubmitting && <Spinner data-icon="inline-start" />}
              Đăng nhập
            </Button>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  );
};
