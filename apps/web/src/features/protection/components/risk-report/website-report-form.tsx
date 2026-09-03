import type { RiskReportWebsiteViolationType } from "@avin/api/protection/risk-report";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import { Textarea } from "@avin/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { websiteReportFormSchema } from "../../schemas/risk-report-form-schema";
import type { WebsiteReportFormValues } from "../../schemas/risk-report-form-schema";
import { EvidenceUploader } from "./evidence-uploader";
import type { SelectedFileItem } from "./evidence-uploader";
import { OptionalDetailsSection } from "./optional-details-section";
import type { OptionalDetailsState } from "./optional-details-section";

const todayInput = (): string => new Date().toISOString().slice(0, 10);

const violationTypeOptions = [
  { label: "Mạo danh thương hiệu / cá nhân", value: "IMPERSONATION" },
  { label: "Lừa lấy thông tin (Phishing)", value: "PHISHING" },
  { label: "Phát tán mã độc / virus (Malware)", value: "MALWARE" },
  { label: "Shop / cửa hàng giả mạo", value: "FAKE_STORE" },
  { label: "Lừa đảo thanh toán / cổng nạp fake", value: "PAYMENT_SCAM" },
  { label: "Khác", value: "OTHER" },
] as const satisfies readonly {
  label: string;
  value: RiskReportWebsiteViolationType;
}[];

export interface WebsiteReportData {
  evidenceFiles: SelectedFileItem[];
  impersonatedUrl?: string;
  narrative: string;
  optionalDetails: OptionalDetailsState;
  violationType: RiskReportWebsiteViolationType;
  websiteUrl: string;
}

interface WebsiteReportFormProps {
  initialData?: Partial<WebsiteReportData>;
  isSubmitting?: boolean;
  onSubmit: (data: WebsiteReportData) => Promise<void>;
}

const getInitialFormValues = (
  initialData?: Partial<WebsiteReportData>
): WebsiteReportFormValues => ({
  attestationAccepted: false,
  impersonatedUrl: initialData?.impersonatedUrl ?? "",
  narrative: initialData?.narrative ?? "",
  optionalDetails: initialData?.optionalDetails ?? {
    facebookUrl: "",
    incidentDate: todayInput(),
    ongoing: false,
    phoneNumber: "",
    telegramUrl: "",
    tiktokUrl: "",
  },
  violationType: initialData?.violationType ?? "IMPERSONATION",
  websiteUrl: initialData?.websiteUrl ?? "",
});

const getDevelopmentValues = (): WebsiteReportFormValues => ({
  attestationAccepted: true,
  impersonatedUrl: "https://facebook.com/avin.official",
  narrative:
    "Trang web này tạo giao diện nhái hệt cổng đăng nhập của Avin để đánh cắp tài khoản và mật khẩu của người dùng khi truy cập và nhập thông tin.",
  optionalDetails: {
    facebookUrl: "https://facebook.com/trang.web.lua.dao",
    incidentDate: todayInput(),
    ongoing: true,
    phoneNumber: "0912345678",
    telegramUrl: "https://t.me/fake_support_bot",
    tiktokUrl: "https://tiktok.com/@fake_shop_review",
  },
  violationType: "IMPERSONATION",
  websiteUrl: "https://fake-shop-avin-scam.xyz/login",
});

const getDevelopmentEvidenceFiles = (): SelectedFileItem[] => [
  {
    file: new File(
      ["evidence-content-preview"],
      "screenshot_website_fake.png",
      {
        type: "image/png",
      }
    ),
    id: globalThis.crypto.randomUUID(),
  },
];

export const WebsiteReportForm = ({
  initialData,
  isSubmitting = false,
  onSubmit,
}: WebsiteReportFormProps) => {
  const [errorMessage, setErrorMessage] = useState<string>();
  const [evidenceFiles, setEvidenceFiles] = useState<SelectedFileItem[]>(
    () => initialData?.evidenceFiles ?? []
  );
  const initialImpersonatedUrl = initialData?.impersonatedUrl ?? "";
  const initialNarrative = initialData?.narrative ?? "";
  const initialOptionalDetails = initialData?.optionalDetails;
  const initialViolationType = initialData?.violationType ?? "IMPERSONATION";
  const initialWebsiteUrl = initialData?.websiteUrl ?? "";
  const defaultValues = useMemo(
    () =>
      getInitialFormValues({
        impersonatedUrl: initialImpersonatedUrl,
        narrative: initialNarrative,
        optionalDetails: initialOptionalDetails,
        violationType: initialViolationType,
        websiteUrl: initialWebsiteUrl,
      }),
    [
      initialImpersonatedUrl,
      initialNarrative,
      initialOptionalDetails,
      initialViolationType,
      initialWebsiteUrl,
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
          evidenceFiles,
          impersonatedUrl:
            value.violationType === "IMPERSONATION"
              ? value.impersonatedUrl.trim()
              : undefined,
          narrative: value.narrative.trim(),
          optionalDetails: value.optionalDetails,
          violationType: value.violationType,
          websiteUrl: value.websiteUrl.trim(),
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi khi gửi tố cáo."
        );
      }
    },
    validators: { onSubmit: websiteReportFormSchema },
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
      id="website-risk-report-form"
      onSubmit={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await reportForm.handleSubmit();
      }}
    >
      <section
        aria-labelledby="web-heading"
        className="space-y-6 rounded-3xl border bg-card p-6 sm:p-8"
      >
        <div className="flex w-full flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <h3 className="font-bold text-lg" id="web-heading">
              Thông tin Website / App / Profile độc hại
            </h3>
            <p className="text-muted-foreground text-xs">
              Cung cấp đường link và thông tin dấu hiệu giả mạo để hệ thống ghi
              nhận cảnh báo.
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
            BẠN BIẾT MỘT WEBSITE / APP / PROFILE LỪA ĐẢO?
          </p>
          <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
            Bạn gửi tố cáo các đường link website lừa đảo, giả mạo thương hiệu,
            đa cấp trá hình, phát tán virus, fake app. Hệ thống sẽ ngăn chặn và
            cảnh báo tới cộng đồng.
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
            <reportForm.Field name="websiteUrl">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Link Website / App / Profile giả mạo *
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
                      placeholder="https://website-lua-dao.com/..."
                      value={field.state.value}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </reportForm.Field>
            <reportForm.Field name="violationType">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="web-violation">
                    Thể loại lừa đảo *
                  </FieldLabel>
                  <Select
                    items={violationTypeOptions}
                    onValueChange={(value) => {
                      const violation = violationTypeOptions.find(
                        (item) => item.value === value
                      )?.value;
                      if (violation) {
                        field.handleChange(violation);
                      }
                    }}
                    value={field.state.value}
                  >
                    <SelectTrigger id="web-violation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {violationTypeOptions.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </reportForm.Field>
          </div>

          <reportForm.Subscribe
            selector={(state) => state.values.violationType}
          >
            {(violationType) =>
              violationType === "IMPERSONATION" ? (
                <reportForm.Field name="impersonatedUrl">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field
                        className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4"
                        data-invalid={isInvalid}
                      >
                        <FieldLabel htmlFor={field.name}>
                          Link chính chủ / thương hiệu thật bị mạo danh *
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
                          placeholder="https://facebook.com/trang-chinh-chu-that..."
                          value={field.state.value}
                        />
                        <FieldDescription>
                          Dùng để Moderator đối chiếu dấu hiệu giả mạo giữa
                          trang thật và trang giả.
                        </FieldDescription>
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    );
                  }}
                </reportForm.Field>
              ) : null
            }
          </reportForm.Subscribe>

          <reportForm.Subscribe
            selector={(state) => state.values.optionalDetails}
          >
            {(optionalDetails) => (
              <OptionalDetailsSection
                dateLabel="Ngày phát hiện"
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
            <FieldLabel>Bằng chứng lừa đảo *</FieldLabel>
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
                  <FieldLabel htmlFor={field.name}>Nội dung mô tả *</FieldLabel>
                  <Textarea
                    aria-invalid={isInvalid}
                    id={field.name}
                    maxLength={10_000}
                    minLength={50}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Cung cấp chi tiết bằng chứng: phương thức dụ dỗ, link tải app giả, dấu hiệu bất thường..."
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
                form="website-risk-report-form"
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
