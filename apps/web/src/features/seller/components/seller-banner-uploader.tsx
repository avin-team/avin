import {
  createPublicMediaUrl,
  SELLER_BANNER_MAX_BYTES,
  SELLER_BANNER_UPLOAD_ROUTE,
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
import { useState } from "react";

import { serverURL } from "@/utils/server-url";

export interface SellerBannerValue {
  name: string;
  url: string;
}

interface SellerBannerUploaderProps {
  bannerUrl: string;
  disabled?: boolean;
  fileName: string;
  onBannerChange: (value: SellerBannerValue) => void;
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

  return "Không thể tải banner lên. Vui lòng thử lại.";
};

const getRejectionErrorMessage = (code: string | undefined): string => {
  if (code === "file-too-large") {
    return "Banner phải có kích thước từ 5 MB trở xuống.";
  }
  if (code === "file-invalid-type") {
    return "Hãy chọn ảnh JPEG, PNG hoặc WebP.";
  }
  return "Hãy chọn một ảnh banner hợp lệ.";
};

type FileRejectionList = Parameters<
  NonNullable<FileDropzoneProps["onFilesRejected"]>
>[0];

export const SellerBannerUploader = ({
  bannerUrl,
  disabled = false,
  fileName,
  onBannerChange,
  onUploadingChange,
}: SellerBannerUploaderProps) => {
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const upload = useUploadFile({
    api: `${serverURL}/api/upload`,
    credentials: "include",
    onError: (error) => setErrorMessage(getUploadErrorMessage(error)),
    route: SELLER_BANNER_UPLOAD_ROUTE,
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
      onBannerChange({ name: file.name, url: publicUrl });
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
    onBannerChange({ name: "", url: "" });
  };

  const handleFilesRejected = (rejections: FileRejectionList) => {
    setErrorMessage(getRejectionErrorMessage(rejections[0]?.errors[0]?.code));
  };

  const isDisabled = disabled || upload.isPending;
  const dropzoneProps = {
    accept: ACCEPTED_IMAGE_TYPES,
    disabled,
    error: errorMessage,
    inputLabel: "Chọn banner gian hàng",
    isUploading: upload.isPending,
    maxFiles: 1,
    maxSize: SELLER_BANNER_MAX_BYTES,
    multiple: false,
    onFilesRejected: handleFilesRejected,
    onFilesSelected: handleFilesSelected,
    progress: upload.progress,
  };

  return (
    <div className="flex flex-col gap-2">
      {bannerUrl ? (
        <div className="group relative">
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-muted/20 transition-colors group-hover:border-primary group-hover:bg-primary/5">
            <img
              alt={
                fileName ? `Banner ${fileName}` : "Xem trước banner gian hàng"
              }
              className="aspect-[2.4/1] w-full object-cover"
              src={bannerUrl}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-background/0 transition-colors group-hover:bg-background/15"
            />
            {upload.isPending ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                <SpinnerIcon
                  aria-label="Đang tải banner lên"
                  className="size-6 animate-spin text-primary"
                  data-icon="inline-start"
                />
              </div>
            ) : null}
          </div>
          <FileDropzone
            {...dropzoneProps}
            className="sr-only"
            label="Thay banner"
            renderTrigger={({ open }) => (
              <div className="pointer-events-none absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100">
                <Button
                  aria-label="Thay banner"
                  disabled={isDisabled}
                  onClick={open}
                  size="icon-sm"
                  title="Thay banner"
                  type="button"
                  variant="secondary"
                >
                  <ArrowClockwiseIcon data-icon="inline-start" />
                </Button>
                <Button
                  aria-label="Xóa banner"
                  disabled={isDisabled}
                  onClick={handleRemove}
                  size="icon-sm"
                  title="Xóa banner"
                  type="button"
                  variant="secondary"
                >
                  <TrashIcon data-icon="inline-start" />
                </Button>
              </div>
            )}
          />
        </div>
      ) : (
        <FileDropzone
          {...dropzoneProps}
          className="aspect-[2.4/1] min-h-0 p-3"
          label="Thêm banner"
        />
      )}
    </div>
  );
};
