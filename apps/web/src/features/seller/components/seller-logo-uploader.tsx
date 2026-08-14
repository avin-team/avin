import {
  createPublicMediaUrl,
  SELLER_LOGO_MAX_BYTES,
  SELLER_LOGO_UPLOAD_ROUTE,
} from "@avin/api/storage";
import { env } from "@avin/env/web";
import { Button } from "@avin/ui/components/button";
import { FileDropzone } from "@avin/ui/components/file-dropzone";
import type { FileDropzoneProps } from "@avin/ui/components/file-dropzone";
import { useUploadFile } from "@better-upload/client";
import {
  SpinnerIcon,
  ArrowClockwiseIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useState } from "react";

import { serverURL } from "@/utils/server-url";

import {
  SELLER_ONBOARDING_EASE_OUT,
  SELLER_ONBOARDING_MOTION_DURATION,
} from "./seller-onboarding-motion";

export interface SellerLogoValue {
  name: string;
  url: string;
}

interface SellerLogoUploaderProps {
  disabled?: boolean;
  fileName: string;
  logoUrl: string;
  onLogoChange: (value: SellerLogoValue) => void;
  onUploadingChange?: (isUploading: boolean) => void;
}

const ACCEPTED_IMAGE_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

const getUploadErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "message" in error) {
    const { message } = error as { message?: unknown };
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return "Không thể tải logo lên. Vui lòng thử lại.";
};

const getRejectionErrorMessage = (code: string | undefined): string => {
  if (code === "file-too-large") {
    return "Logo phải có kích thước từ 5 MB trở xuống.";
  }
  if (code === "file-invalid-type") {
    return "Hãy chọn ảnh JPEG, PNG hoặc WebP.";
  }
  return "Hãy chọn một ảnh logo hợp lệ.";
};

type FileRejectionList = Parameters<
  NonNullable<FileDropzoneProps["onFilesRejected"]>
>[0];

export const SellerLogoUploader = ({
  disabled = false,
  fileName,
  logoUrl,
  onLogoChange,
  onUploadingChange,
}: SellerLogoUploaderProps) => {
  const shouldReduceMotion = Boolean(useReducedMotion());
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const upload = useUploadFile({
    api: `${serverURL}/api/upload`,
    credentials: "include",
    onError: (error) => setErrorMessage(getUploadErrorMessage(error)),
    route: SELLER_LOGO_UPLOAD_ROUTE,
  });

  const handleFilesSelected = async (files: File[]) => {
    const [file] = files;
    if (!file) {
      return;
    }

    setErrorMessage(undefined);
    upload.reset();
    onUploadingChange?.(true);

    try {
      const result = await upload.uploadAsync(file, { metadata: {} });
      const publicUrl = createPublicMediaUrl(
        env.VITE_SUPABASE_URL,
        result.file.objectInfo.key
      );
      onLogoChange({ name: file.name, url: publicUrl });
    } catch (error) {
      setErrorMessage(getUploadErrorMessage(error));
    } finally {
      onUploadingChange?.(false);
    }
  };

  const handleRemove = () => {
    if (disabled || upload.isPending) {
      return;
    }

    setErrorMessage(undefined);
    upload.reset();
    onLogoChange({ name: "", url: "" });
  };

  const handleFilesRejected = (rejections: FileRejectionList) => {
    setErrorMessage(getRejectionErrorMessage(rejections[0]?.errors[0]?.code));
  };

  const isDisabled = disabled || upload.isPending;
  const dropzoneProps = {
    accept: ACCEPTED_IMAGE_TYPES,
    browseHelperText: "",
    disabled,
    error: errorMessage,
    inputLabel: "Chọn logo gian hàng",
    isUploading: upload.isPending,
    maxFiles: 1,
    maxSize: SELLER_LOGO_MAX_BYTES,
    multiple: false,
    onFilesRejected: handleFilesRejected,
    onFilesSelected: handleFilesSelected,
    progress: upload.progress,
  };

  return (
    <div className="space-y-2">
      <div className="grid">
        <AnimatePresence initial={false} mode="sync">
          {logoUrl ? (
            <m.div
              animate={{ opacity: 1, transform: "scale(1)" }}
              className="group relative col-start-1 row-start-1"
              exit={{
                opacity: shouldReduceMotion ? 0.85 : 0,
                transform: shouldReduceMotion ? "scale(1)" : "scale(0.97)",
              }}
              initial={{
                opacity: shouldReduceMotion ? 0.85 : 0,
                transform: shouldReduceMotion ? "scale(1)" : "scale(0.97)",
              }}
              key="preview"
              transition={{
                duration: shouldReduceMotion
                  ? SELLER_ONBOARDING_MOTION_DURATION.reduced
                  : SELLER_ONBOARDING_MOTION_DURATION.standard,
                ease: shouldReduceMotion
                  ? "linear"
                  : SELLER_ONBOARDING_EASE_OUT,
              }}
            >
              <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-muted/20 transition-colors group-hover:border-primary group-hover:bg-primary/5">
                <img
                  alt={
                    fileName ? `Logo ${fileName}` : "Xem trước logo gian hàng"
                  }
                  className="aspect-square w-full object-cover"
                  src={logoUrl}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-background/0 transition-colors group-hover:bg-background/15"
                />
                {upload.isPending ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                    <SpinnerIcon
                      aria-label="Đang tải logo lên"
                      className="size-6 animate-spin text-primary"
                    />
                  </div>
                ) : null}
              </div>
              <FileDropzone
                {...dropzoneProps}
                className="sr-only"
                label="Thay logo"
                renderTrigger={({ open }) => (
                  <div className="pointer-events-none absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100">
                    <Button
                      aria-label="Thay logo"
                      disabled={isDisabled}
                      onClick={open}
                      size="icon-sm"
                      title="Thay logo"
                      type="button"
                      variant="secondary"
                    >
                      <ArrowClockwiseIcon />
                    </Button>
                    <Button
                      aria-label="Xóa logo"
                      disabled={isDisabled}
                      onClick={handleRemove}
                      size="icon-sm"
                      title="Xóa logo"
                      type="button"
                      variant="secondary"
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                )}
              />
            </m.div>
          ) : (
            <m.div
              animate={{ opacity: 1, transform: "scale(1)" }}
              className="col-start-1 row-start-1"
              exit={{
                opacity: shouldReduceMotion ? 0.85 : 0,
                transform: shouldReduceMotion ? "scale(1)" : "scale(0.97)",
              }}
              initial={{
                opacity: shouldReduceMotion ? 0.85 : 0,
                transform: shouldReduceMotion ? "scale(1)" : "scale(0.97)",
              }}
              key="empty"
              transition={{
                duration: shouldReduceMotion
                  ? SELLER_ONBOARDING_MOTION_DURATION.reduced
                  : SELLER_ONBOARDING_MOTION_DURATION.standard,
                ease: shouldReduceMotion
                  ? "linear"
                  : SELLER_ONBOARDING_EASE_OUT,
              }}
            >
              <FileDropzone
                {...dropzoneProps}
                className="aspect-square min-h-0 p-3"
                label="Thêm logo"
              />
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
