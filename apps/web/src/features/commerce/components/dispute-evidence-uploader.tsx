import type { DisputeEvidenceInput } from "@avin/api/commerce/dispute-contracts";
import {
  DISPUTE_EVIDENCE_CONTENT_TYPES,
  DISPUTE_EVIDENCE_MAX_BYTES,
  DISPUTE_EVIDENCE_MAX_COUNT,
  DISPUTE_EVIDENCE_UPLOAD_ROUTE,
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

const isDisputeEvidenceContentType = (
  value: string
): value is (typeof DISPUTE_EVIDENCE_CONTENT_TYPES)[number] =>
  DISPUTE_EVIDENCE_CONTENT_TYPES.includes(
    value as (typeof DISPUTE_EVIDENCE_CONTENT_TYPES)[number]
  );

interface DisputeEvidenceUploaderProps {
  disabled?: boolean;
  existingEvidenceCount?: number;
  itemId: string;
  onEvidenceChange: (evidence: DisputeEvidenceInput[]) => void;
}

export const DisputeEvidenceUploader = ({
  disabled = false,
  existingEvidenceCount = 0,
  itemId,
  onEvidenceChange,
}: DisputeEvidenceUploaderProps) => {
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [evidence, setEvidence] = useState<DisputeEvidenceInput[]>([]);
  const upload = useUploadFiles({
    api: `${env.VITE_SERVER_URL}/api/dispute-evidence-upload`,
    credentials: "include",
    onError: () => setErrorMessage("Không thể tải bằng chứng lên."),
    route: DISPUTE_EVIDENCE_UPLOAD_ROUTE,
    uploadBatchSize: DISPUTE_EVIDENCE_MAX_COUNT,
  });

  const handleFilesSelected = async (files: File[]): Promise<void> => {
    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      setErrorMessage("Hãy mô tả bằng chứng trước khi tải tệp lên.");
      return;
    }

    const availableSlots =
      DISPUTE_EVIDENCE_MAX_COUNT - existingEvidenceCount - evidence.length;
    if (availableSlots <= 0) {
      setErrorMessage(
        `Mỗi Dispute tối đa ${DISPUTE_EVIDENCE_MAX_COUNT} tệp bằng chứng.`
      );
      return;
    }

    const selectedFiles = files.slice(0, availableSlots);
    setErrorMessage(undefined);
    try {
      const result = await upload.uploadAsync(selectedFiles, {
        metadata: { itemId },
      });
      const uploadedEvidence = result.files.flatMap((uploadedFile) => {
        const contentType = uploadedFile.raw.type;
        if (!isDisputeEvidenceContentType(contentType)) {
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
        setErrorMessage("Một số tệp chưa tải lên được. Hãy thử lại.");
      }
    } catch {
      setErrorMessage("Không thể tải bằng chứng lên. Vui lòng thử lại.");
    }
  };

  const isUploading = upload.isPending;

  return (
    <div className="grid gap-3">
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor={`evidence-description-${itemId}`}
      >
        Mô tả bằng chứng
        <Textarea
          disabled={disabled || isUploading}
          id={`evidence-description-${itemId}`}
          maxLength={1000}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Mô tả ngắn nội dung của tệp (áp dụng cho các tệp chọn cùng lúc)…"
          value={description}
        />
      </label>
      <FileDropzone
        accept={ACCEPTED_CONTENT_TYPES}
        disabled={
          disabled ||
          existingEvidenceCount + evidence.length >= DISPUTE_EVIDENCE_MAX_COUNT
        }
        helperText="PDF, TXT, JPEG, PNG hoặc WebP · tối đa 10 MB mỗi tệp"
        inputLabel="Chọn tệp bằng chứng"
        isUploading={isUploading}
        label="Thêm bằng chứng"
        maxFiles={Math.max(
          1,
          DISPUTE_EVIDENCE_MAX_COUNT - existingEvidenceCount - evidence.length
        )}
        maxSize={DISPUTE_EVIDENCE_MAX_BYTES}
        multiple
        onFilesSelected={(files) => void handleFilesSelected(files)}
        progress={upload.averageProgress}
        uploadingLabel="Đang tải bằng chứng…"
      />
      {evidence.length > 0 ? (
        <ul className="grid gap-1 text-xs text-muted-foreground">
          {evidence.map((file) => (
            <li key={file.storageKey}>
              {file.fileName} · {(file.byteSize / 1024 / 1024).toFixed(2)} MB
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
