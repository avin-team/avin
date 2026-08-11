import {
  SELLER_ENFORCEMENT_APPEAL_EVIDENCE_CONTENT_TYPES,
  SELLER_ENFORCEMENT_APPEAL_EVIDENCE_MAX_BYTES,
  SELLER_ENFORCEMENT_APPEAL_EVIDENCE_MAX_COUNT,
  SELLER_ENFORCEMENT_APPEAL_EVIDENCE_UPLOAD_ROUTE,
} from "@avin/api/storage";
import { env } from "@avin/env/web";
import { FileDropzone } from "@avin/ui/components/file-dropzone";
import { Textarea } from "@avin/ui/components/textarea";
import { useUploadFiles } from "@better-upload/client";
import { useState } from "react";

const ACCEPTED_CONTENT_TYPES = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "text/plain": [".txt"],
};

export interface AppealEvidenceItem {
  byteSize: number;
  contentType: (typeof SELLER_ENFORCEMENT_APPEAL_EVIDENCE_CONTENT_TYPES)[number];
  description: string;
  fileName: string;
  storageKey: string;
}

const isAppealEvidenceContentType = (
  value: string
): value is (typeof SELLER_ENFORCEMENT_APPEAL_EVIDENCE_CONTENT_TYPES)[number] =>
  SELLER_ENFORCEMENT_APPEAL_EVIDENCE_CONTENT_TYPES.includes(
    value as (typeof SELLER_ENFORCEMENT_APPEAL_EVIDENCE_CONTENT_TYPES)[number]
  );

interface SellerAppealEvidenceUploaderProps {
  actionId: string;
  disabled?: boolean;
  onEvidenceChange: (evidence: AppealEvidenceItem[]) => void;
}

export const SellerAppealEvidenceUploader = ({
  actionId,
  disabled = false,
  onEvidenceChange,
}: SellerAppealEvidenceUploaderProps) => {
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [evidence, setEvidence] = useState<AppealEvidenceItem[]>([]);

  const upload = useUploadFiles({
    api: `${env.VITE_SERVER_URL}/api/seller-enforcement-appeal-evidence`,
    credentials: "include",
    onError: () => setErrorMessage("Không thể tải bằng chứng khiếu nại lên."),
    route: SELLER_ENFORCEMENT_APPEAL_EVIDENCE_UPLOAD_ROUTE,
    uploadBatchSize: SELLER_ENFORCEMENT_APPEAL_EVIDENCE_MAX_COUNT,
  });

  const handleFilesSelected = async (files: File[]): Promise<void> => {
    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      setErrorMessage("Hãy mô tả tệp bằng chứng trước khi chọn tải lên.");
      return;
    }

    const availableSlots =
      SELLER_ENFORCEMENT_APPEAL_EVIDENCE_MAX_COUNT - evidence.length;
    if (availableSlots <= 0) {
      setErrorMessage(
        `Mỗi đơn khiếu nại tối đa ${SELLER_ENFORCEMENT_APPEAL_EVIDENCE_MAX_COUNT} tệp bằng chứng.`
      );
      return;
    }

    const selectedFiles = files.slice(0, availableSlots);
    setErrorMessage(undefined);

    try {
      const result = await upload.uploadAsync(selectedFiles, {
        metadata: { actionId },
      });

      const uploadedEvidence = result.files.flatMap((uploadedFile) => {
        const contentType = uploadedFile.raw.type;
        if (!isAppealEvidenceContentType(contentType)) {
          return [];
        }
        return [
          {
            byteSize: uploadedFile.raw.size,
            contentType,
            description: trimmedDescription,
            fileName: uploadedFile.raw.name,
            storageKey: uploadedFile.objectInfo.key,
          },
        ];
      });

      if (uploadedEvidence.length > 0) {
        const nextEvidence = [...evidence, ...uploadedEvidence];
        setEvidence(nextEvidence);
        onEvidenceChange(nextEvidence);
      }

      if (result.failedFiles.length > 0) {
        setErrorMessage(
          "Một số tệp chưa được tải lên thành công. Vui lòng thử lại."
        );
      }
    } catch {
      setErrorMessage(
        "Không thể tải tệp bằng chứng lên máy chủ. Vui lòng thử lại."
      );
    }
  };

  const isUploading = upload.isPending;

  return (
    <div className="grid gap-3">
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor={`appeal-evidence-description-${actionId}`}
      >
        Mô tả tài liệu / bằng chứng đính kèm
        <Textarea
          disabled={disabled || isUploading}
          id={`appeal-evidence-description-${actionId}`}
          maxLength={1000}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Mô tả nội dung các chứng từ, hình ảnh bàn giao, tin nhắn đối chứng..."
          value={description}
        />
      </label>
      <FileDropzone
        accept={ACCEPTED_CONTENT_TYPES}
        disabled={
          disabled ||
          evidence.length >= SELLER_ENFORCEMENT_APPEAL_EVIDENCE_MAX_COUNT
        }
        helperText="PDF, TXT, JPEG, PNG hoặc WebP · tối đa 10 MB mỗi tệp"
        inputLabel="Chọn tài liệu đối chứng"
        isUploading={isUploading}
        label="Thêm bằng chứng khiếu nại"
        maxFiles={Math.max(
          1,
          SELLER_ENFORCEMENT_APPEAL_EVIDENCE_MAX_COUNT - evidence.length
        )}
        maxSize={SELLER_ENFORCEMENT_APPEAL_EVIDENCE_MAX_BYTES}
        multiple
        onFilesSelected={(files) => void handleFilesSelected(files)}
        progress={upload.averageProgress}
        uploadingLabel="Đang tải tệp bằng chứng…"
      />
      {evidence.length > 0 ? (
        <ul className="grid gap-1 text-xs text-muted-foreground">
          {evidence.map((file) => (
            <li key={file.storageKey}>
              {file.fileName} · {(file.byteSize / 1024 / 1024).toFixed(2)} MB:{" "}
              {file.description}
            </li>
          ))}
        </ul>
      ) : null}
      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
};
