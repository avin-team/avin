import {
  createPublicMediaUrl,
  PROVIDER_AVATAR_MAX_BYTES,
  PROVIDER_AVATAR_UPLOAD_ROUTE,
} from "@avin/api/storage";
import { env } from "@avin/env/web";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@avin/ui/components/avatar";
import { Button } from "@avin/ui/components/button";
import { FileDropzone } from "@avin/ui/components/file-dropzone";
import type { FileDropzoneProps } from "@avin/ui/components/file-dropzone";
import { useUploadFile } from "@better-upload/client";
import {
  ArrowClockwise,
  Spinner,
  Trash,
  UserCircle,
} from "@phosphor-icons/react";
import { useState } from "react";

import { serverURL } from "@/utils/server-url";

export interface ProviderAvatarValue {
  name: string;
  url: string;
}

interface ProviderAvatarUploaderProps {
  avatarUrl: string;
  disabled?: boolean;
  onAvatarChange: (value: ProviderAvatarValue) => void;
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
  return "Không thể tải ảnh đại diện lên. Vui lòng thử lại.";
};

const getRejectionErrorMessage = (code: string | undefined): string => {
  if (code === "file-too-large") {
    return "Ảnh đại diện phải có dung lượng từ 5 MB trở xuống.";
  }
  if (code === "file-invalid-type") {
    return "Chỉ hỗ trợ định dạng JPEG, PNG hoặc WebP.";
  }
  return "Hãy chọn một tệp ảnh đại diện hợp lệ.";
};

type FileRejectionList = Parameters<
  NonNullable<FileDropzoneProps["onFilesRejected"]>
>[0];

export const ProviderAvatarUploader = ({
  avatarUrl,
  disabled = false,
  onAvatarChange,
  onUploadingChange,
}: ProviderAvatarUploaderProps) => {
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const upload = useUploadFile({
    api: `${serverURL}/api/upload`,
    credentials: "include",
    onError: (error) => setErrorMessage(getUploadErrorMessage(error)),
    route: PROVIDER_AVATAR_UPLOAD_ROUTE,
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
      onAvatarChange({ name: file.name, url: publicUrl });
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
    onAvatarChange({ name: "", url: "" });
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
    inputLabel: "Chọn ảnh đại diện đối tác",
    isUploading: upload.isPending,
    maxFiles: 1,
    maxSize: PROVIDER_AVATAR_MAX_BYTES,
    multiple: false,
    onFilesRejected: handleFilesRejected,
    onFilesSelected: handleFilesSelected,
    progress: upload.progress,
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl border border-border/70 bg-card/60 p-4 transition-colors hover:border-border">
      <div className="relative size-20 shrink-0">
        <Avatar className="size-20 border-2 border-primary/20 bg-muted/40 shadow-xs">
          {avatarUrl ? (
            <AvatarImage alt="Ảnh đại diện đối tác" src={avatarUrl} />
          ) : null}
          <AvatarFallback className="text-muted-foreground">
            <UserCircle className="size-12 opacity-40" weight="duotone" />
          </AvatarFallback>
        </Avatar>
        {upload.isPending && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70 backdrop-blur-xs">
            <Spinner
              aria-label="Đang tải ảnh đại diện lên"
              className="size-6 animate-spin text-primary"
            />
          </div>
        )}
      </div>

      <div className="flex-1 space-y-2 min-w-0 w-full sm:w-auto">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm">Ảnh đại diện đối tác (Avatar)</p>
          {avatarUrl && !isDisabled ? (
            <Button
              aria-label="Xóa ảnh đại diện"
              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
              disabled={isDisabled}
              onClick={handleRemove}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Trash className="mr-1 size-3.5" />
              Gỡ ảnh
            </Button>
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs">
          Hỗ trợ JPG, PNG, WebP (tối đa 5 MB). Ảnh sẽ hiển thị tròn trên thẻ hồ
          sơ đối tác.
        </p>

        {avatarUrl ? (
          <div>
            <FileDropzone
              {...dropzoneProps}
              className="hidden"
              renderTrigger={({ open }) => (
                <Button
                  className="gap-1.5 text-xs h-8"
                  disabled={isDisabled}
                  onClick={open}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <ArrowClockwise className="size-3.5" />
                  Thay đổi ảnh
                </Button>
              )}
            />
          </div>
        ) : (
          <FileDropzone
            {...dropzoneProps}
            className="min-h-0 border-dashed py-2.5 px-3 text-xs"
            label="Tải ảnh đại diện lên"
          />
        )}

        {errorMessage ? (
          <p className="text-destructive text-xs">{errorMessage}</p>
        ) : null}
      </div>
    </div>
  );
};
