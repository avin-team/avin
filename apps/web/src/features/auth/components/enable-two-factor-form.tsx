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
import { enableTwoFactorSchema } from "@/features/auth/schemas/auth-schemas";

export interface TwoFactorSetup {
  backupCodes: string[];
  totpUri: string;
}

interface EnableTwoFactorFormProps {
  onSetup: (setup: TwoFactorSetup) => void;
}

export const EnableTwoFactorForm = ({ onSetup }: EnableTwoFactorFormProps) => {
  const form = useForm({
    defaultValues: {
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await authClient.twoFactor.enable({
          password: value.password || undefined,
        });

        if (result.error) {
          toast.error(
            result.error.message ?? "Không thể bật xác thực hai lớp."
          );
          return;
        }

        onSetup({
          backupCodes: result.data.backupCodes,
          totpUri: result.data.totpURI,
        });
      } catch {
        toast.error("Không thể bắt đầu thiết lập 2FA. Vui lòng thử lại.");
      }
    },
    validators: {
      onSubmit: enableTwoFactorSchema,
    },
  });

  return (
    <form
      className="flex flex-col gap-6"
      id="enable-two-factor-form"
      onSubmit={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field name="password">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Mật khẩu hiện tại</FieldLabel>
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
                <FieldDescription>
                  Tài khoản chỉ dùng Google có thể để trống mật khẩu.
                </FieldDescription>
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
              form="enable-two-factor-form"
              type="submit"
            >
              {isSubmitting && <Spinner data-icon="inline-start" />}
              Bắt đầu thiết lập
            </Button>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  );
};
