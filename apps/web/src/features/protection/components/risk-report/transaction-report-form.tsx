import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Button } from "@avin/ui/components/button";
import { Input } from "@avin/ui/components/input";
import { Textarea } from "@avin/ui/components/textarea";
import { useState } from "react";

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

export const TransactionReportForm = ({
  initialData,
  isSubmitting = false,
  onSubmit,
}: TransactionReportFormProps) => {
  const [holderName, setHolderName] = useState(initialData?.holderName ?? "");
  const [accountNumber, setAccountNumber] = useState(
    initialData?.accountNumber ?? ""
  );
  const [bankName, setBankName] = useState(initialData?.bankName ?? "");
  const [amount, setAmount] = useState(initialData?.amount ?? "");
  const [evidenceFiles, setEvidenceFiles] = useState<SelectedFileItem[]>(
    initialData?.evidenceFiles ?? []
  );
  const [narrative, setNarrative] = useState(initialData?.narrative ?? "");
  const [optionalDetails, setOptionalDetails] = useState<OptionalDetailsState>(
    initialData?.optionalDetails ?? {
      facebookUrl: "",
      incidentDate: todayInput(),
      ongoing: false,
      phoneNumber: "",
      telegramUrl: "",
      tiktokUrl: "",
    }
  );
  const [attestationAccepted, setAttestationAccepted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(undefined);

    if (!holderName.trim()) {
      setErrorMessage("Vui lòng nhập tên chủ tài khoản.");
      return;
    }
    if (!accountNumber.trim()) {
      setErrorMessage("Vui lòng nhập số tài khoản ngân hàng.");
      return;
    }
    if (!bankName.trim()) {
      setErrorMessage("Vui lòng nhập tên ngân hàng nhận tiền.");
      return;
    }
    const cleanAmount = Number(amount.replaceAll(/[,.\s]/gu, ""));
    if (!cleanAmount || cleanAmount <= 0) {
      setErrorMessage("Vui lòng nhập số tiền hợp lệ lớn hơn 0.");
      return;
    }
    if (evidenceFiles.length === 0) {
      setErrorMessage(
        "Vui lòng tải lên ít nhất một bằng chứng (ảnh Bill, đoạn chat giao dịch...)."
      );
      return;
    }
    if (narrative.trim().length < 50) {
      setErrorMessage(
        "Nội dung tố cáo cần tối thiểu 50 ký tự để nêu rõ sự việc."
      );
      return;
    }
    if (!attestationAccepted) {
      setErrorMessage("Vui lòng xác nhận cam kết thông tin trước khi gửi.");
      return;
    }

    try {
      await onSubmit({
        accountNumber: accountNumber.trim(),
        amount: String(cleanAmount),
        bankName: bankName.trim(),
        evidenceFiles,
        holderName: holderName.trim(),
        narrative: narrative.trim(),
        optionalDetails,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Đã xảy ra lỗi khi gửi tố cáo."
      );
    }
  };

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
        <p className="font-semibold text-primary text-sm">
          BẠN BỊ LỪA ĐẢO ONLINE / GIAO DỊCH CHUYỂN TIỀN?
        </p>
        <p className="mt-1 text-muted-foreground text-xs">
          Bạn lấy STK đã nhận tiền lừa đảo để tố cáo nhé. Bài tố cáo phải đủ ảnh
          Bill, nội dung đoạn chat giao dịch mới đủ điều kiện duyệt.
        </p>
      </div>

      {errorMessage ? (
        <Alert className="border-destructive/30 bg-destructive/5" role="alert">
          <AlertTitle>Chưa thể gửi tố cáo</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 font-medium text-sm" htmlFor="tx-holder">
          Tên chủ tài khoản *
          <Input
            autoComplete="off"
            id="tx-holder"
            onChange={(e) => setHolderName(e.target.value)}
            placeholder="Chủ tài khoản nhận tiền"
            value={holderName}
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
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="Số tài khoản nhận tiền"
            value={accountNumber}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 font-medium text-sm" htmlFor="tx-bank">
          Ngân hàng *
          <Input
            autoComplete="off"
            id="tx-bank"
            onChange={(e) => setBankName(e.target.value)}
            placeholder="VIB, MB, Vietcombank..."
            value={bankName}
          />
        </label>

        <label className="grid gap-1.5 font-medium text-sm" htmlFor="tx-amount">
          Số tiền chiếm đoạt (VNĐ) *
          <Input
            autoComplete="off"
            id="tx-amount"
            inputMode="numeric"
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Nhập chính xác số tiền bạn bị lừa"
            value={amount}
          />
        </label>
      </div>

      <div className="grid gap-1.5">
        <span className="font-medium text-sm">Bằng chứng giao dịch *</span>
        <EvidenceUploader
          disabled={isSubmitting}
          onFilesChange={setEvidenceFiles}
          selectedFiles={evidenceFiles}
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
          onChange={(e) => setNarrative(e.target.value)}
          placeholder="Nêu rõ và đầy đủ vấn đề: thỏa thuận ban đầu, đã chuyển khoản ra sao, diễn biến sự việc..."
          rows={5}
          value={narrative}
        />
        <span className="text-muted-foreground text-xs">
          {narrative.length}/10.000 ký tự (tối thiểu 50 ký tự) · Thông tin riêng
          tư (SĐT, email) sẽ được hệ thống tự động che khi công khai.
        </span>
      </label>

      <OptionalDetailsSection
        dateLabel="Ngày xảy ra chuyển tiền"
        onChange={(updates) =>
          setOptionalDetails((prev) => ({ ...prev, ...updates }))
        }
        values={optionalDetails}
      />

      <div className="rounded-xl border bg-muted/10 p-4">
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
          <input
            checked={attestationAccepted}
            className="mt-0.5 size-4 rounded border-gray-300 text-primary focus:ring-primary"
            onChange={(e) => setAttestationAccepted(e.target.checked)}
            type="checkbox"
          />
          <span>
            Tôi cam kết thông tin và bằng chứng cung cấp trên là trung thực và
            chịu trách nhiệm về nội dung tố cáo này.
          </span>
        </label>
      </div>

      <div className="flex justify-center pt-2">
        <Button
          className="h-12 w-full max-w-sm font-semibold text-base"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Đang gửi đơn duyệt..." : "Gửi Duyệt Tố Cáo"}
        </Button>
      </div>
    </form>
  );
};
