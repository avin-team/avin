import { Button } from "@avin/ui/components/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@avin/ui/components/field";
import { Input } from "@avin/ui/components/input";
import { useForm } from "@tanstack/react-form";
import { Check, Copy, Loader2, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";

const twoFactorCodeSchema = z.object({
  code: z.string().length(6, "Mã xác thực phải gồm 6 chữ số."),
});

interface VerifyTwoFactorFormProps {
  onCancel?: () => void;
  onVerified: () => Promise<void>;
  totpUri: string;
}

const extractSecret = (uri: string): string => {
  try {
    const url = new URL(uri);
    return url.searchParams.get("secret") ?? "";
  } catch {
    const match = uri.match(/secret=(?<secretKey>[^&]+)/u);
    return match?.groups?.secretKey ?? "";
  }
};

const formatSecret = (secret: string): string =>
  secret.match(/.{1,4}/gu)?.join(" ") ?? secret;

export const VerifyTwoFactorForm = ({
  onCancel,
  onVerified,
  totpUri,
}: VerifyTwoFactorFormProps) => {
  const [copied, setCopied] = useState(false);
  const secret = extractSecret(totpUri);
  const formattedSecret = formatSecret(secret);

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      toast.success("Đã sao chép khóa TOTP vào bộ nhớ tạm.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép. Vui lòng chọn và chép thủ công.");
    }
  };

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

        toast.success("Đã kích hoạt xác thực hai lớp thành công!");
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
    <div className="flex flex-col gap-6">
      {/* QR Code Container */}
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-muted/30 p-6 text-center">
        <div className="flex items-center gap-2 font-medium text-sm">
          <QrCode className="size-4 text-primary" />
          <span>Quét mã QR bằng ứng dụng Authenticator</span>
        </div>
        <div className="my-1 rounded-xl bg-white p-4 shadow-sm">
          <QRCodeSVG level="M" size={192} value={totpUri} />
        </div>
        <p className="max-w-sm text-muted-foreground text-xs leading-relaxed">
          Mở ứng dụng Google Authenticator, Authy hoặc 1Password trên điện thoại
          để quét mã QR này.
        </p>
      </div>

      {/* Manual Secret Key */}
      {secret && (
        <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Hoặc nhập khóa thủ công
          </span>
          <div className="flex items-center justify-between gap-2">
            <code className="font-mono font-semibold text-foreground text-sm tracking-wider">
              {formattedSecret}
            </code>
            <Button
              className="h-8 shrink-0 gap-1.5 px-3 text-xs"
              onClick={handleCopySecret}
              type="button"
              variant="outline"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-500" />
                  Đã chép
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  Sao chép
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Verification Code Input */}
      <form
        className="flex flex-col gap-4"
        id="verify-two-factor-form"
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
                  <FieldLabel htmlFor={field.name}>
                    Mã xác thực (6 chữ số)
                  </FieldLabel>
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

          <div className="flex items-center gap-3 pt-2">
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
                  {isSubmitting && (
                    <Loader2 className="me-2 size-4 animate-spin" />
                  )}
                  Xác nhận và bật 2FA
                </Button>
              )}
            </form.Subscribe>

            {onCancel && (
              <Button onClick={onCancel} type="button" variant="ghost">
                Hủy
              </Button>
            )}
          </div>
        </FieldGroup>
      </form>
    </div>
  );
};
