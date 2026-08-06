import { Button } from "@avin/ui/components/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@avin/ui/components/field";
import { Input } from "@avin/ui/components/input";
import { SpinnerIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";

const twoFactorCodeSchema = z.object({
  code: z.string().length(6, "Mã xác thực phải gồm 6 chữ số."),
});

export const TwoFactorLoginForm = () => {
  const navigate = useNavigate();
  const router = useRouter();

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

        const session = await authClient.getSession({
          query: { disableCookieCache: true },
        });

        if (session.data?.user?.role !== "ADMIN") {
          await authClient.signOut();
          toast.error(
            "Tài khoản không có quyền truy cập trang Quản trị (ADMIN)."
          );
          return;
        }

        toast.success("Xác thực 2FA thành công!");
        await router.invalidate();
        await navigate({ replace: true, to: "/" });
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
        <form.Field name="code">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Mã xác thực 2FA</FieldLabel>
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
                  placeholder="123456"
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
              className="mt-4 w-full"
              disabled={!canSubmit || isSubmitting}
              form="two-factor-login-form"
              type="submit"
            >
              {isSubmitting && <SpinnerIcon className="animate-spin" />}
              Xác minh
            </Button>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  );
};
