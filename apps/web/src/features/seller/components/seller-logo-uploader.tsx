import {
  createPublicMediaUrl,
  SELLER_LOGO_MAX_BYTES,
  SELLER_LOGO_UPLOAD_ROUTE,
} from "@avin/api/storage";
import { env } from "@avin/env/web";
import { Button } from "@avin/ui/components/button";
import { FileDropzone } from "@avin/ui/components/file-dropzone";
import { useUploadFile } from "@better-upload/client";
import { LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";

interface SellerLogoUploaderProps {
  disabled?: boolean;
  fileName: string;
  logoUrl: string;
  onLogoChange: (value: { name: string; url: string }) => void;
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

export const SellerLogoUploader = ({
  disabled = false,
  fileName,
  logoUrl,
  onLogoChange,
}: SellerLogoUploaderProps) => {
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const upload = useUploadFile({
    api: `${env.VITE_SERVER_URL}/api/upload`,
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

    try {
      const result = await upload.uploadAsync(file, { metadata: {} });
      const publicUrl = createPublicMediaUrl(
        env.VITE_SUPABASE_URL,
        result.file.objectInfo.key
      );
      onLogoChange({ name: file.name, url: publicUrl });
    } catch (error) {
      setErrorMessage(getUploadErrorMessage(error));
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

  const isDisabled = disabled || upload.isPending;

  return (
    <div className="space-y-2">
      {logoUrl ? (
        <div className="relative">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/20">
            <img
              alt={fileName ? `Logo ${fileName}` : "Xem trước logo gian hàng"}
              className="aspect-square w-full object-cover"
              src={logoUrl}
            />
            {upload.isPending ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                <LoaderCircle
                  aria-label="Đang tải logo lên"
                  className="size-6 animate-spin text-primary"
                />
              </div>
            ) : null}
          </div>
          <FileDropzone
            accept={ACCEPTED_IMAGE_TYPES}
            className="sr-only"
            disabled={disabled}
            error={errorMessage}
            helperText="PNG, JPG hoặc WebP · tối đa 5MB"
            inputLabel="Chọn logo gian hàng"
            isUploading={upload.isPending}
            label="Thay logo"
            maxFiles={1}
            maxSize={SELLER_LOGO_MAX_BYTES}
            onFilesRejected={(rejections) => {
              setErrorMessage(
                getRejectionErrorMessage(rejections[0]?.errors[0]?.code)
              );
            }}
            onFilesSelected={handleFilesSelected}
            progress={upload.progress}
            renderTrigger={({ open }) => (
              <div className="absolute right-2 top-2 z-10 flex gap-1">
                <Button
                  aria-label="Thay logo"
                  disabled={isDisabled}
                  onClick={open}
                  size="icon-sm"
                  title="Thay logo"
                  type="button"
                  variant="secondary"
                >
                  <RefreshCw />
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
                  <Trash2 />
                </Button>
              </div>
            )}
            multiple={false}
          />
        </div>
      ) : (
        <FileDropzone
          accept={ACCEPTED_IMAGE_TYPES}
          className="aspect-square min-h-0 p-3"
          disabled={disabled}
          error={errorMessage}
          helperText="PNG, JPG hoặc WebP · tối đa 5MB"
          inputLabel="Chọn logo gian hàng"
          isUploading={upload.isPending}
          label="Thêm logo"
          maxFiles={1}
          maxSize={SELLER_LOGO_MAX_BYTES}
          onFilesRejected={(rejections) => {
            setErrorMessage(
              getRejectionErrorMessage(rejections[0]?.errors[0]?.code)
            );
          }}
          onFilesSelected={handleFilesSelected}
          progress={upload.progress}
          multiple={false}
        />
      )}
    </div>
  );
};
