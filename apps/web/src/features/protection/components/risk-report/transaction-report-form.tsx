import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Button } from "@avin/ui/components/button";
import { Input } from "@avin/ui/components/input";
import { Textarea } from "@avin/ui/components/textarea";
import { useState } from "react";
import { toast } from "sonner";

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

interface FormState {
  accountNumber: string;
  amount: string;
  attestationAccepted: boolean;
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

const getInitialFormState = (
  initialData?: Partial<TransactionReportData>
): FormState => ({
  accountNumber: initialData?.accountNumber ?? "",
  amount: initialData?.amount ?? "",
  attestationAccepted: false,
  bankName: initialData?.bankName ?? "",
  evidenceFiles: initialData?.evidenceFiles ?? [],
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

export const TransactionReportForm = ({
  initialData,
  isSubmitting = false,
  onSubmit,
}: TransactionReportFormProps) => {
  const [form, setForm] = useState<FormState>(() =>
    getInitialFormState(initialData)
  );
  const [errorMessage, setErrorMessage] = useState<string>();

  const fillDevelopmentData = () => {
    if (!import.meta.env.DEV) {
      return;
    }
    const sampleFile = new File(
      ["evidence-content-preview"],
      "bill_chuyen_khoan_mau.png",
      { type: "image/png" }
    );
    setForm({
      accountNumber: "1029384756",
      amount: "1500000",
      attestationAccepted: true,
      bankName: "MB Bank",
      evidenceFiles: [
        {
          file: sampleFile,
          id: globalThis.crypto.randomUUID(),
          previewUrl: "https://placehold.co/600x400/png?text=Bill+Chuyen+Khoan",
        },
      ],
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
    toast.success("Đã điền dữ liệu mẫu cho môi trường dev.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(undefined);

    if (!form.holderName.trim()) {
      setErrorMessage("Vui lòng nhập tên chủ tài khoản.");
      return;
    }
    if (!form.accountNumber.trim()) {
      setErrorMessage("Vui lòng nhập số tài khoản ngân hàng.");
      return;
    }
    if (!form.bankName.trim()) {
      setErrorMessage("Vui lòng nhập tên ngân hàng nhận tiền.");
      return;
    }
    const cleanAmount = Number(form.amount.replaceAll(/[,.\s]/gu, ""));
    if (!cleanAmount || cleanAmount <= 0) {
      setErrorMessage("Vui lòng nhập số tiền hợp lệ lớn hơn 0.");
      return;
    }
    if (form.evidenceFiles.length === 0) {
      setErrorMessage(
        "Vui lòng tải lên ít nhất một bằng chứng (ảnh Bill, đoạn chat giao dịch...)."
      );
      return;
    }
    if (form.narrative.trim().length < 50) {
      setErrorMessage(
        "Nội dung tố cáo cần tối thiểu 50 ký tự để nêu rõ sự việc."
      );
      return;
    }
    if (!form.attestationAccepted) {
      setErrorMessage("Vui lòng xác nhận cam kết thông tin trước khi gửi.");
      return;
    }

    try {
      await onSubmit({
        accountNumber: form.accountNumber.trim(),
        amount: String(cleanAmount),
        bankName: form.bankName.trim(),
        evidenceFiles: form.evidenceFiles,
        holderName: form.holderName.trim(),
        narrative: form.narrative.trim(),
        optionalDetails: form.optionalDetails,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Đã xảy ra lỗi khi gửi tố cáo."
      );
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
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

        <div className="grid gap-4 sm:grid-cols-2">
          <label
            className="grid gap-1.5 font-medium text-sm"
            htmlFor="tx-holder"
          >
            Tên chủ tài khoản *
            <Input
              autoComplete="off"
              id="tx-holder"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, holderName: e.target.value }))
              }
              placeholder="Chủ tài khoản nhận tiền"
              value={form.holderName}
            />
          </label>

          <label
            className="grid gap-1.5 font-medium text-sm"
            htmlFor="tx-account"
          >
            Số tài khoản *
            <Input
              autoComplete="off"
              id="tx-account"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, accountNumber: e.target.value }))
              }
              placeholder="Số tài khoản nhận tiền"
              value={form.accountNumber}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 font-medium text-sm" htmlFor="tx-bank">
            Ngân hàng *
            <Input
              autoComplete="off"
              id="tx-bank"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, bankName: e.target.value }))
              }
              placeholder="VIB, MB, Vietcombank..."
              value={form.bankName}
            />
          </label>

          <label
            className="grid gap-1.5 font-medium text-sm"
            htmlFor="tx-amount"
          >
            Số tiền chiếm đoạt (VNĐ) *
            <Input
              autoComplete="off"
              id="tx-amount"
              inputMode="numeric"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, amount: e.target.value }))
              }
              placeholder="Nhập chính xác số tiền bạn bị lừa"
              value={form.amount}
            />
          </label>
        </div>

        <OptionalDetailsSection
          dateLabel="Ngày xảy ra chuyển tiền"
          onChange={(updates) =>
            setForm((prev) => ({
              ...prev,
              optionalDetails: { ...prev.optionalDetails, ...updates },
            }))
          }
          values={form.optionalDetails}
        />

        <div className="grid gap-2">
          <span className="font-medium text-sm">Bằng chứng giao dịch *</span>
          <EvidenceUploader
            disabled={isSubmitting}
            onFilesChange={(files) =>
              setForm((prev) => ({ ...prev, evidenceFiles: files }))
            }
            selectedFiles={form.evidenceFiles}
          />
        </div>

        <label
          className="grid gap-1.5 font-medium text-sm"
          htmlFor="tx-narrative"
        >
          Nội dung tố cáo *
          <Textarea
            id="tx-narrative"
            maxLength={10_000}
            minLength={50}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, narrative: e.target.value }))
            }
            placeholder="Nêu rõ và đầy đủ vấn đề: thỏa thuận ban đầu, đã chuyển khoản ra sao, diễn biến sự việc..."
            rows={5}
            value={form.narrative}
          />
          <span className="text-muted-foreground text-xs">
            {form.narrative.length}/10.000 ký tự (tối thiểu 50 ký tự) · Thông
            tin riêng tư (SĐT, email) sẽ được hệ thống tự động che khi công
            khai.
          </span>
        </label>

        <div className="rounded-2xl border bg-muted/20 p-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
            <input
              checked={form.attestationAccepted}
              className="mt-0.5 size-4 rounded border-gray-300 text-primary focus:ring-primary"
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  attestationAccepted: e.target.checked,
                }))
              }
              type="checkbox"
            />
            <span>
              Tôi cam kết thông tin và bằng chứng cung cấp trên là trung thực và
              chịu trách nhiệm về nội dung tố cáo này.
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end border-t pt-5">
          <Button
            className="h-11 w-full sm:w-auto px-8 font-semibold text-sm"
            disabled={isSubmitting}
            size="lg"
            type="submit"
          >
            {isSubmitting ? "Đang gửi đơn duyệt..." : "Gửi duyệt tố cáo"}
          </Button>
        </div>
      </section>
    </form>
  );
};
