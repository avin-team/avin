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

export interface AccountReportData {
  accountId: string;
  evidenceFiles: SelectedFileItem[];
  narrative: string;
  optionalDetails: OptionalDetailsState;
  platform: string;
}

interface FormState {
  accountId: string;
  attestationAccepted: boolean;
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

const getInitialFormState = (
  initialData?: Partial<AccountReportData>
): FormState => ({
  accountId: initialData?.accountId ?? "",
  attestationAccepted: false,
  evidenceFiles: initialData?.evidenceFiles ?? [],
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

export const AccountReportForm = ({
  initialData,
  isSubmitting = false,
  onSubmit,
}: AccountReportFormProps) => {
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
      "bang_chung_bi_back.png",
      { type: "image/png" }
    );
    setForm({
      accountId: "@idol_trieu_view_2026",
      attestationAccepted: true,
      evidenceFiles: [
        {
          file: sampleFile,
          id: globalThis.crypto.randomUUID(),
        },
      ],
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
    toast.success("Đã điền dữ liệu mẫu cho môi trường dev.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(undefined);

    if (!form.platform.trim()) {
      setErrorMessage(
        "Vui lòng nhập nền tảng tài khoản (vd: TikTok, Free Fire, LMHT, Roblox...)."
      );
      return;
    }
    if (!form.accountId.trim()) {
      setErrorMessage("Vui lòng nhập ID hoặc tên tài khoản bị back.");
      return;
    }
    if (form.evidenceFiles.length === 0) {
      setErrorMessage(
        "Vui lòng tải lên ít nhất một bằng chứng (ảnh ID, tin nhắn giao dịch, thông báo mất quyền...)."
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
        accountId: form.accountId.trim(),
        evidenceFiles: form.evidenceFiles,
        narrative: form.narrative.trim(),
        optionalDetails: form.optionalDetails,
        platform: form.platform.trim(),
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

        <div className="grid gap-4 sm:grid-cols-2">
          <label
            className="grid gap-1.5 font-medium text-sm"
            htmlFor="acc-platform"
          >
            Nền tảng *
            <Input
              autoComplete="off"
              id="acc-platform"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, platform: e.target.value }))
              }
              placeholder="TikTok, Free Fire, LMHT, Roblox, YouTube..."
              value={form.platform}
            />
          </label>

          <label className="grid gap-1.5 font-medium text-sm" htmlFor="acc-id">
            ID, Tài khoản *
            <Input
              autoComplete="off"
              id="acc-id"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, accountId: e.target.value }))
              }
              placeholder="ID hoặc tên tài khoản đã bị back"
              value={form.accountId}
            />
          </label>
        </div>

        <OptionalDetailsSection
          dateLabel="Ngày mất quyền truy cập"
          onChange={(updates) =>
            setForm((prev) => ({
              ...prev,
              optionalDetails: { ...prev.optionalDetails, ...updates },
            }))
          }
          values={form.optionalDetails}
        />

        <div className="grid gap-2">
          <span className="font-medium text-sm">
            Bằng chứng ID, tài khoản bị back *
          </span>
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
          htmlFor="acc-narrative"
        >
          Nội dung tố cáo *
          <Textarea
            id="acc-narrative"
            maxLength={10_000}
            minLength={50}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, narrative: e.target.value }))
            }
            placeholder="Nêu rõ và đầy đủ vấn đề: mua qua ai, ngày bàn giao, ngày bị đổi thông tin hoặc mất quyền truy cập..."
            rows={5}
            value={form.narrative}
          />
          <span className="text-muted-foreground text-xs">
            {form.narrative.length}/10.000 ký tự (tối thiểu 50 ký tự)
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
