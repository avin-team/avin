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

import { transactionReportFormSchema } from "../../schemas/risk-report-form-schema";
import type { TransactionReportFormValues } from "../../schemas/risk-report-form-schema";
import { EvidenceUploader } from "./evidence-uploader";
import type { SelectedFileItem } from "./evidence-uploader";
import { OptionalDetailsSection } from "./optional-details-section";
import type { OptionalDetailsState } from "./optional-details-section";

const todayInput = (): string => new Date().toISOString().slice(0, 10);

export interface TransactionReportData {
  accountNumber: string;
  amount: string;
  bankName: string;
  evidenceFiles: SelectedFileItem[];
  holderName: string;
  narrative: string;
  optionalDetails: OptionalDetailsState;
}

interface TransactionReportFormProps {
  initialData?: Partial<TransactionReportData>;
  isSubmitting?: boolean;
  onSubmit: (data: TransactionReportData) => Promise<void>;
}

const getInitialFormValues = (
  initialData?: Partial<TransactionReportData>
): TransactionReportFormValues => ({
  accountNumber: initialData?.accountNumber ?? "",
  amount: initialData?.amount ?? "",
  attestationAccepted: false,
  bankName: initialData?.bankName ?? "",
  holderName: initialData?.holderName ?? "",
  narrative: initialData?.narrative ?? "",
  optionalDetails: initialData?.optionalDetails ?? {
    facebookUrl: "",
    incidentDate: todayInput(),
    ongoing: false,
    phoneNumber: "",
    telegramUrl: "",
    tiktokUrl: "",
  },
});

const getDevelopmentValues = (): TransactionReportFormValues => ({
  accountNumber: "1029384756",
  amount: "1500000",
  attestationAccepted: true,
  bankName: "MB Bank",
  holderName: "NGUYEN VAN SCAM",
  narrative:
    "Ngày 25/08 tôi có thỏa thuận mua tài khoản game qua Facebook với đối tượng này. Sau khi tôi chuyển khoản 1.500.000đ vào tài khoản MB Bank nêu trên, đối tượng lập tức chặn Facebook và xóa toàn bộ tin nhắn mà không bàn giao tài khoản.",
  optionalDetails: {
    facebookUrl: "https://facebook.com/nguyen.van.scam.fake",
    incidentDate: todayInput(),
    ongoing: false,
    phoneNumber: "0987654321",
    telegramUrl: "https://t.me/scammer_crypto",
    tiktokUrl: "https://tiktok.com/@scammer_vn",
  },
});

const getDevelopmentEvidenceFiles = (): SelectedFileItem[] => [
  {
    file: new File(["evidence-content-preview"], "bill_chuyen_khoan_mau.png", {
      type: "image/png",
    }),
    id: globalThis.crypto.randomUUID(),
  },
];

export const TransactionReportForm = ({
  initialData,
  isSubmitting = false,
  onSubmit,
}: TransactionReportFormProps) => {
  const [errorMessage, setErrorMessage] = useState<string>();
  const [evidenceFiles, setEvidenceFiles] = useState<SelectedFileItem[]>(
    () => initialData?.evidenceFiles ?? []
  );
  const initialAccountNumber = initialData?.accountNumber ?? "";
  const initialAmount = initialData?.amount ?? "";
  const initialBankName = initialData?.bankName ?? "";
  const initialHolderName = initialData?.holderName ?? "";
  const initialNarrative = initialData?.narrative ?? "";
  const initialOptionalDetails = initialData?.optionalDetails;
  const defaultValues = useMemo(
    () =>
      getInitialFormValues({
        accountNumber: initialAccountNumber,
        amount: initialAmount,
        bankName: initialBankName,
        holderName: initialHolderName,
        narrative: initialNarrative,
        optionalDetails: initialOptionalDetails,
      }),
    [
      initialAccountNumber,
      initialAmount,
      initialBankName,
      initialHolderName,
      initialNarrative,
      initialOptionalDetails,
    ]
  );
  const reportForm = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      if (evidenceFiles.length === 0) {
        setErrorMessage(
          "Vui lòng tải lên ít nhất một bằng chứng (ảnh Bill, đoạn chat giao dịch...)."
        );
        return;
      }
      setErrorMessage(undefined);
      try {
        await onSubmit({
          accountNumber: value.accountNumber.trim(),
          amount: String(Number(value.amount.replaceAll(/[,.\s]/gu, ""))),
          bankName: value.bankName.trim(),
          evidenceFiles,
          holderName: value.holderName.trim(),
          narrative: value.narrative.trim(),
          optionalDetails: value.optionalDetails,
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi khi gửi tố cáo."
        );
      }
    },
    validators: { onSubmit: transactionReportFormSchema },
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
      id="transaction-risk-report-form"
      onSubmit={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await reportForm.handleSubmit();
      }}
    >
      <section
        aria-labelledby="tx-heading"
        className="space-y-6 rounded-3xl border bg-card p-6 sm:p-8"
      >
        <div className="flex w-full flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <h3 className="font-bold text-lg" id="tx-heading">
              Thông tin chuyển tiền & tài khoản nhận
            </h3>
            <p className="text-muted-foreground text-xs">
              Nhập chính xác số tài khoản ngân hàng hoặc ví đã nhận tiền giao
              dịch lừa đảo.
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
            BẠN BỊ LỪA ĐẢO ONLINE / GIAO DỊCH CHUYỂN TIỀN?
          </p>
          <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
            Bạn lấy STK đã nhận tiền lừa đảo để tố cáo nhé. Bài tố cáo phải đủ
            ảnh Bill, nội dung đoạn chat giao dịch mới đủ điều kiện duyệt.
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
            <reportForm.Field name="holderName">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Tên chủ tài khoản *
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
                      placeholder="Chủ tài khoản nhận tiền"
                      value={field.state.value}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </reportForm.Field>
            <reportForm.Field name="accountNumber">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Số tài khoản *</FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      autoComplete="off"
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Số tài khoản nhận tiền"
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

          <div className="grid gap-4 sm:grid-cols-2">
            <reportForm.Field name="bankName">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Ngân hàng *</FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      autoComplete="off"
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="VIB, MB, Vietcombank..."
                      value={field.state.value}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </reportForm.Field>
            <reportForm.Field name="amount">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Số tiền chiếm đoạt (VNĐ) *
                    </FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      autoComplete="off"
                      id={field.name}
                      inputMode="numeric"
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Nhập chính xác số tiền bạn bị lừa"
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
                dateLabel="Ngày xảy ra chuyển tiền"
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
            <FieldLabel>Bằng chứng giao dịch *</FieldLabel>
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
                    placeholder="Nêu rõ và đầy đủ vấn đề: thỏa thuận ban đầu, đã chuyển khoản ra sao, diễn biến sự việc..."
                    rows={5}
                    value={field.state.value}
                  />
                  <FieldDescription>
                    {field.state.value.length}/10.000 ký tự (tối thiểu 50 ký tự)
                    · Thông tin riêng tư (SĐT, email) sẽ được hệ thống tự động
                    che khi công khai.
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
                form="transaction-risk-report-form"
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
