import { Progress } from "@avin/ui/components/progress";
import { cn } from "@avin/ui/lib/utils";
import { FileArrowUpIcon, SpinnerIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useDropzone, type Accept, type FileRejection } from "react-dropzone";

export interface FileDropzoneTriggerRenderProps {
  open: () => void;
}

export interface FileDropzoneProps {
  accept?: Accept;
  className?: string;
  disabled?: boolean;
  error?: string;
  helperText?: ReactNode;
  inputLabel?: string;
  isUploading?: boolean;
  label?: string;
  maxFiles?: number;
  maxSize?: number;
  multiple?: boolean;
  onFilesRejected?: (rejections: FileRejection[]) => void;
  onFilesSelected: (files: File[]) => void;
  progress?: number;
  renderTrigger?: (props: FileDropzoneTriggerRenderProps) => ReactNode;
  browseHelperText?: ReactNode;
  progressLabel?: string;
  progressSuffix?: string;
  uploadingHelperText?: ReactNode;
  uploadingLabel?: string;
}

export function FileDropzone({
  accept,
  className,
  disabled = false,
  error,
  helperText,
  inputLabel = "Choose a file",
  isUploading = false,
  label = "Upload a file",
  maxFiles = 1,
  maxSize,
  multiple = false,
  onFilesRejected,
  onFilesSelected,
  progress,
  renderTrigger,
  browseHelperText = "Drag and drop or click to browse",
  progressLabel = "Upload progress",
  progressSuffix = "uploaded",
  uploadingHelperText = "Please wait while the file is uploaded.",
  uploadingLabel = "Uploading file…",
}: FileDropzoneProps) {
  const isDisabled = disabled || isUploading;
  const { getInputProps, getRootProps, isDragActive, isDragReject, open } =
    useDropzone({
      accept,
      disabled: isDisabled,
      maxFiles,
      maxSize,
      multiple,
      onDrop: (acceptedFiles, fileRejections) => {
        if (acceptedFiles.length > 0) {
          onFilesSelected(acceptedFiles);
        }
        if (fileRejections.length > 0) {
          onFilesRejected?.(fileRejections);
        }
      },
    });

  const rootClassName = cn(
    "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-5 py-6 text-center transition-colors outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20",
    isDragActive && "border-primary bg-primary/5",
    isDragReject && "border-destructive bg-destructive/5",
    isDisabled && "cursor-not-allowed opacity-60",
    className
  );

  return (
    <div className="space-y-2">
      <div
        {...getRootProps({
          "aria-busy": isUploading,
          "aria-disabled": isDisabled,
          className: rootClassName,
        })}
      >
        <input {...getInputProps({ "aria-label": inputLabel })} />
        {isUploading ? (
          <SpinnerIcon
            aria-hidden="true"
            className="size-7 animate-spin text-primary"
          />
        ) : (
          <FileArrowUpIcon aria-hidden="true" className="size-7 text-primary" />
        )}
        <p className="font-semibold text-foreground">
          {isUploading ? uploadingLabel : label}
        </p>
        <p className="text-sm text-muted-foreground">
          {isUploading
            ? progress === undefined
              ? uploadingHelperText
              : `${Math.round(progress * 100)}% ${progressSuffix}`
            : browseHelperText}
        </p>
        {isUploading && progress !== undefined ? (
          <Progress
            aria-label={progressLabel}
            className="mt-2 w-full max-w-xs"
            value={progress * 100}
          />
        ) : null}
      </div>
      {renderTrigger ? (
        <div className="flex justify-center">{renderTrigger({ open })}</div>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}
