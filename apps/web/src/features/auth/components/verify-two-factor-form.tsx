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
import { toast } from "sonner";

import { authClient } from "@/features/auth/api/auth-client";
import { twoFactorCodeSchema } from "@/features/auth/schemas/auth-schemas";

interface VerifyTwoFactorFormProps {
  onVerified: () => Promise<void>;
  totpUri: string;
}

export const VerifyTwoFactorForm = ({
  onVerified,
  totpUri,
}: VerifyTwoFactorFormProps) => {
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

        toast.success("Đã bật xác thực hai lớp.");
        await onVerified();
      } catch {
        toast.error("Không thể xác minh 2FA lúc này. Vui lòng thử lại.");
      }
    },
    validators: {
      onSubmit: twoFactorCodeSchema,
    },
  });

  return (
    <form
      className="mt-6 flex flex-col gap-6"
      id="verify-two-factor-form"
      onSubmit={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await form.handleSubmit();
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="totp-uri">Khóa thiết lập TOTP</FieldLabel>
          <Input id="totp-uri" readOnly value={totpUri} />
          <FieldDescription>
            Thêm URI này vào ứng dụng xác thực, sau đó nhập mã 6 số.
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
              form="verify-two-factor-form"
              type="submit"
            >
              {isSubmitting && <Spinner data-icon="inline-start" />}
              Xác nhận và bật 2FA
            </Button>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  );
};
