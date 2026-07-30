import { Button } from "@avin/ui/components/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@avin/ui/components/field";
import { Input } from "@avin/ui/components/input";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";

const formSchema = z.object({
  email: z.email({
    error: (iss) =>
      iss.input === "" ? "Vui lòng nhập email." : "Vui lòng nhập email hợp lệ.",
  }),
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  readonly redirectTo?: string;
}

export const UserAuthForm = ({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) => {
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onError: (ctx) => {
            toast.error(
              ctx.error.message ??
                "Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu."
            );
          },
          onSuccess: async () => {
            const targetPath = redirectTo ?? "/";
            await navigate({ replace: true, to: targetPath });
            toast.success("Đăng nhập thành công!");
          },
        }
      );
    },
    validators: {
      onSubmit: formSchema,
    },
  });

  return (
    <form
      className={className}
      id="sign-in-form"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      {...props}
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
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="admin@avin.vn"
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
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  value={field.state.value}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>
      </FieldGroup>

      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ canSubmit, isSubmitting }) => (
          <Button
            className="mt-4 w-full"
            disabled={!canSubmit || isSubmitting}
            form="sign-in-form"
            type="submit"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <LogIn className="me-2 size-4" />
            )}
            Đăng nhập Admin
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
};
