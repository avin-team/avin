import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Button } from "@avin/ui/components/button";
import { Checkbox } from "@avin/ui/components/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@avin/ui/components/field";
import { Input } from "@avin/ui/components/input";
import { Textarea } from "@avin/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { accountReportFormSchema } from "../../schemas/risk-report-form-schema";
import type { AccountReportFormValues } from "../../schemas/risk-report-form-schema";
import { EvidenceUploader } from "./evidence-uploader";
import type { SelectedFileItem } from "./evidence-uploader";
import { OptionalDetailsSection } from "./optional-details-section";
import type { OptionalDetailsState } from "./optional-details-section";

const todayInput = (): string => new Date().toISOString().slice(0, 10);

export interface AccountReportData {
  accountId: string;
  evidenceFiles: SelectedFileItem[];
  narrative: string;
  optionalDetails: OptionalDetailsState;
  platform: string;
}

interface AccountReportFormProps {
  initialData?: Partial<AccountReportData>;
  isSubmitting?: boolean;
  onSubmit: (data: AccountReportData) => Promise<void>;
}

const getInitialFormValues = (
  initialData?: Partial<AccountReportData>
): AccountReportFormValues => ({
  accountId: initialData?.accountId ?? "",
  attestationAccepted: false,
  narrative: initialData?.narrative ?? "",
  optionalDetails: initialData?.optionalDetails ?? {
    facebookUrl: "",
    incidentDate: todayInput(),
    ongoing: false,
    phoneNumber: "",
    telegramUrl: "",
    tiktokUrl: "",
  },
  platform: initialData?.platform ?? "",
});

const getDevelopmentValues = (): AccountReportFormValues => ({
  accountId: "@idol_trieu_view_2026",
  attestationAccepted: true,
  narrative:
    "Tôi đã mua kênh TikTok này với giá thỏa thuận qua trung gian. Sau 3 ngày nhận bàn giao kênh thì đối tượng đã dùng email gốc và số điện thoại ban đầu để khôi phục và chiếm đoạt lại quyền quản trị kênh.",
  optionalDetails: {
    facebookUrl: "https://facebook.com/nguoi.ban.acc.scam",
    incidentDate: todayInput(),
    ongoing: false,
    phoneNumber: "0909123456",
    telegramUrl: "https://t.me/trung_gian_acc",
    tiktokUrl: "https://tiktok.com/@idol_trieu_view_2026",
  },
  platform: "TikTok",
});

const getDevelopmentEvidenceFiles = (): SelectedFileItem[] => [
  {
    file: new File(["evidence-content-preview"], "bang_chung_bi_back.png", {
      type: "image/png",
    }),
    id: globalThis.crypto.randomUUID(),
  },
];

export const AccountReportForm = ({
  initialData,
  isSubmitting = false,
  onSubmit,
}: AccountReportFormProps) => {
  const [errorMessage, setErrorMessage] = useState<string>();
  const [evidenceFiles, setEvidenceFiles] = useState<SelectedFileItem[]>(
    () => initialData?.evidenceFiles ?? []
  );
  const initialAccountId = initialData?.accountId ?? "";
  const initialNarrative = initialData?.narrative ?? "";
  const initialOptionalDetails = initialData?.optionalDetails;
  const initialPlatform = initialData?.platform ?? "";
  const defaultValues = useMemo(
    () =>
      getInitialFormValues({
        accountId: initialAccountId,
        narrative: initialNarrative,
        optionalDetails: initialOptionalDetails,
        platform: initialPlatform,
      }),
    [
      initialAccountId,
      initialNarrative,
      initialOptionalDetails,
      initialPlatform,
    ]
  );
  const reportForm = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      if (evidenceFiles.length === 0) {
        setErrorMessage("Vui lòng tải lên ít nhất một bằng chứng.");
        return;
      }
      setErrorMessage(undefined);
      try {
        await onSubmit({
          accountId: value.accountId.trim(),
          evidenceFiles,
          narrative: value.narrative.trim(),
          optionalDetails: value.optionalDetails,
          platform: value.platform.trim(),
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi khi gửi tố cáo."
        );
      }
    },
    validators: { onSubmit: accountReportFormSchema },
  });

  const fillDevelopmentData = () => {
    if (!import.meta.env.DEV) {
      return;
    }
    reportForm.reset(getDevelopmentValues(), { keepDefaultValues: true });
    setEvidenceFiles(getDevelopmentEvidenceFiles());
    toast.success("Đã điền dữ liệu mẫu cho môi trường dev.");
  };

  return (
    <form
      className="space-y-6"
      id="account-risk-report-form"
      onSubmit={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await reportForm.handleSubmit();
      }}
    >
      <section
        aria-labelledby="acc-heading"
        className="space-y-6 rounded-3xl border bg-card p-6 sm:p-8"
      >
        <div className="flex w-full flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <h3 className="font-bold text-lg" id="acc-heading">
              Thông tin tài khoản Game / MXH bị back
            </h3>
            <p className="text-muted-foreground text-xs">
              Cung cấp ID hoặc tài khoản và bằng chứng mất quyền để cộng đồng
              nhận biết và phòng tránh.
            </p>
          </div>
          {import.meta.env.DEV ? (
            <Button
              disabled={isSubmitting}
              onClick={fillDevelopmentData}
              size="sm"
              type="button"
              variant="outline"
            >
              Điền dữ liệu mẫu
            </Button>
          ) : null}
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="font-semibold text-primary text-sm">
            BẠN MUA TÀI KHOẢN BỊ BACK / THU HỒI?
          </p>
          <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
            Bạn gửi tố cáo các tài khoản ID Game (FF, Liên Quân, Roblox...), ID
            TikTok, Facebook, kênh YouTube, Fanpage bị thu hồi để cộng đồng cảnh
            báo, nhận biết và chủ động né tránh.
          </p>
        </div>

        {errorMessage ? (
          <Alert
            className="border-destructive/30 bg-destructive/5"
            role="alert"
          >
            <AlertTitle>Chưa thể gửi tố cáo</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <FieldGroup className="gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <reportForm.Field name="platform">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Nền tảng *</FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      autoComplete="off"
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="TikTok, Free Fire, LMHT, Roblox, YouTube..."
                      value={field.state.value}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </reportForm.Field>
            <reportForm.Field name="accountId">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      ID, Tài khoản *
                    </FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      autoComplete="off"
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="ID hoặc tên tài khoản đã bị back"
                      value={field.state.value}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </reportForm.Field>
          </div>

          <reportForm.Subscribe
            selector={(state) => state.values.optionalDetails}
          >
            {(optionalDetails) => (
              <OptionalDetailsSection
                dateLabel="Ngày mất quyền truy cập"
                onChange={(updates) =>
                  reportForm.setFieldValue("optionalDetails", (previous) => ({
                    ...previous,
                    ...updates,
                  }))
                }
                values={optionalDetails}
              />
            )}
          </reportForm.Subscribe>

          <div className="grid gap-2">
            <FieldLabel>Bằng chứng ID, tài khoản bị back *</FieldLabel>
            <EvidenceUploader
              disabled={isSubmitting}
              onFilesChange={setEvidenceFiles}
              selectedFiles={evidenceFiles}
            />
          </div>

          <reportForm.Field name="narrative">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    Nội dung tố cáo *
                  </FieldLabel>
                  <Textarea
                    aria-invalid={isInvalid}
                    id={field.name}
                    maxLength={10_000}
                    minLength={50}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Nêu rõ và đầy đủ vấn đề: mua qua ai, ngày bàn giao, ngày bị đổi thông tin hoặc mất quyền truy cập..."
                    rows={5}
                    value={field.state.value}
                  />
                  <FieldDescription>
                    {field.state.value.length}/10.000 ký tự (tối thiểu 50 ký tự)
                  </FieldDescription>
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              );
            }}
          </reportForm.Field>

          <reportForm.Field name="attestationAccepted">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid} orientation="horizontal">
                  <Checkbox
                    checked={field.state.value}
                    id={field.name}
                    name={field.name}
                    onCheckedChange={(checked) =>
                      field.handleChange(Boolean(checked))
                    }
                  />
                  <FieldLabel htmlFor={field.name}>
                    Tôi cam kết thông tin và bằng chứng cung cấp trên là trung
                    thực và chịu trách nhiệm về nội dung tố cáo này.
                  </FieldLabel>
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              );
            }}
          </reportForm.Field>
        </FieldGroup>

        <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-end">
          <reportForm.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
              isSubmitting: state.isSubmitting,
            })}
          >
            {({ canSubmit, isSubmitting: formSubmitting }) => (
              <Button
                className="h-11 w-full px-8 font-semibold text-sm sm:w-auto"
                disabled={!canSubmit || formSubmitting || isSubmitting}
                form="account-risk-report-form"
                size="lg"
                type="submit"
              >
                {formSubmitting || isSubmitting
                  ? "Đang gửi đơn duyệt..."
                  : "Gửi duyệt tố cáo"}
              </Button>
            )}
          </reportForm.Subscribe>
        </div>
      </section>
    </form>
  );
};
