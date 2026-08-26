import {
  getNativeRiskReportEvidenceMaxBytes,
  isNativeRiskReportEvidenceContentType,
  RISK_REPORT_EVIDENCE_MAX_COUNT,
  RISK_REPORT_EVIDENCE_MAX_VIDEO_COUNT,
  RISK_REPORT_EVIDENCE_MAX_VIDEO_BYTES,
} from "@avin/api/storage";
import { Button } from "@avin/ui/components/button";
import { FileDropzone } from "@avin/ui/components/file-dropzone";
import {
  FileIcon,
  FilePdfIcon,
  FilmStripIcon,
  ImageIcon,
  TrashIcon,
} from "@phosphor-icons/react";

const ACCEPTED_CONTENT_TYPES = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
};

export interface SelectedFileItem {
  file: File;
  id: string;
}

interface EvidenceUploaderProps {
  disabled?: boolean;
  isUploading?: boolean;
  onFilesChange: (files: SelectedFileItem[]) => void;
  selectedFiles: SelectedFileItem[];
}

const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
};

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) {
    return <ImageIcon aria-hidden="true" className="size-5 text-blue-500" />;
  }
  if (type === "application/pdf") {
    return <FilePdfIcon aria-hidden="true" className="size-5 text-red-500" />;
  }
  if (type.startsWith("video/")) {
    return (
      <FilmStripIcon aria-hidden="true" className="size-5 text-purple-500" />
    );
  }
  return (
    <FileIcon aria-hidden="true" className="size-5 text-muted-foreground" />
  );
};

export const EvidenceUploader = ({
  disabled = false,
  isUploading = false,
  onFilesChange,
  selectedFiles,
}: EvidenceUploaderProps) => {
  const handleFilesSelected = (files: File[]) => {
    const availableSlots =
      RISK_REPORT_EVIDENCE_MAX_COUNT - selectedFiles.length;
    if (availableSlots <= 0) {
      return;
    }

    const validFiles: SelectedFileItem[] = [];
    let currentVideoCount = selectedFiles.filter(
      (item) =>
        item.file.type === "video/mp4" || item.file.type === "video/webm"
    ).length;

    for (const file of files.slice(0, availableSlots)) {
      if (!isNativeRiskReportEvidenceContentType(file.type)) {
        continue;
      }
      if (file.size > getNativeRiskReportEvidenceMaxBytes(file.type)) {
        continue;
      }
      const isVideo = file.type === "video/mp4" || file.type === "video/webm";
      if (isVideo) {
        if (currentVideoCount >= RISK_REPORT_EVIDENCE_MAX_VIDEO_COUNT) {
          continue;
        }
        currentVideoCount += 1;
      }
      validFiles.push({
        file,
        id: crypto.randomUUID(),
      });
    }

    if (validFiles.length > 0) {
      onFilesChange([...selectedFiles, ...validFiles]);
    }
  };

  const removeFile = (id: string) => {
    onFilesChange(selectedFiles.filter((item) => item.id !== id));
  };

  return (
    <div className="grid gap-3">
      <FileDropzone
        accept={ACCEPTED_CONTENT_TYPES}
        disabled={
          disabled || selectedFiles.length >= RISK_REPORT_EVIDENCE_MAX_COUNT
        }
        helperText="Ảnh/PDF tối đa 20 MB, video tối đa 100 MB (tối đa 10 tệp)"
        inputLabel="Tải ảnh Bill, đoạn chat giao dịch, bằng chứng..."
        isUploading={isUploading}
        label="Tải bằng chứng"
        maxFiles={Math.max(
          1,
          RISK_REPORT_EVIDENCE_MAX_COUNT - selectedFiles.length
        )}
        maxSize={RISK_REPORT_EVIDENCE_MAX_VIDEO_BYTES}
        multiple
        onFilesSelected={handleFilesSelected}
      />

      {selectedFiles.length > 0 ? (
        <div className="grid gap-2">
          {selectedFiles.map((item) => (
            <div
              className="flex items-center justify-between gap-3 rounded-lg border bg-card p-2.5 text-sm"
              key={item.id}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {getFileIcon(item.file.type)}
                <span className="truncate font-medium">{item.file.name}</span>
                <span className="shrink-0 text-muted-foreground text-xs">
                  ({formatBytes(item.file.size)})
                </span>
              </div>
              <Button
                aria-label={`Xoá file ${item.file.name}`}
                className="size-8 text-muted-foreground hover:text-destructive"
                disabled={disabled || isUploading}
                onClick={() => removeFile(item.id)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <TrashIcon aria-hidden="true" className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
