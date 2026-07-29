import { Button } from "@avin/ui/components/button";
import {
  Field,
  FieldDescription,
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
import { twoFactorCodeSchema } from "@/features/auth/schemas/auth-schemas";
import { getPostAuthRoute } from "@/features/auth/utils/get-post-auth-route";

export const TwoFactorLoginForm = () => {
  const navigate = useNavigate();
  const form = useForm({
    defaultValues: {
      code: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await authClient.twoFactor.verifyTotp({
          code: value.code,
          trustDevice: true,
        });

        if (result.error) {
          toast.error(result.error.message ?? "Mã xác thực không hợp lệ.");
          return;
        }

        const session = await authClient.getSession();
        const redirectTo = getPostAuthRoute(session.data?.user.role);
        await navigate({ to: redirectTo });
      } catch {
        toast.error("Không thể xác minh lúc này. Vui lòng thử lại.");
      }
    },
    validators: {
      onSubmit: twoFactorCodeSchema,
    },
  });

  return (
    <form
      className="w-full"
      id="two-factor-login-form"
      onSubmit={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await form.handleSubmit();
      }}
    >
      <FieldGroup>
        <Field>
          <h1 className="font-bold text-2xl">Xác thực hai lớp</h1>
          <FieldDescription>
            Nhập mã 6 số từ ứng dụng xác thực của bạn.
          </FieldDescription>
        </Field>

        <form.Field name="code">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Mã xác thực</FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  autoComplete="one-time-code"
                  autoFocus
                  id={field.name}
                  inputMode="numeric"
                  maxLength={6}
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

        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button
              disabled={!canSubmit || isSubmitting}
              form="two-factor-login-form"
              type="submit"
            >
              {isSubmitting && <Spinner data-icon="inline-start" />}
              Xác minh
            </Button>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  );
};
