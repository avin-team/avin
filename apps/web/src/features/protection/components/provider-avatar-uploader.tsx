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
  CheckCircle,
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
    browseHelperText: "Kéo thả ảnh vào đây hoặc nhấp để chọn",
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
    <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-linear-to-br from-primary/[0.07] via-card to-card p-4 shadow-xs sm:p-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-12 -top-16 size-40 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative grid gap-5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center">
        <div className="flex flex-col items-center gap-2.5 sm:self-start">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Xem trước
          </span>
          <div className="relative rounded-full bg-background/80 p-1.5 shadow-sm ring-1 ring-border/80">
            <Avatar className="size-24 border border-primary/20 bg-muted/50 shadow-inner">
              {avatarUrl ? (
                <AvatarImage alt="Ảnh đại diện đối tác" src={avatarUrl} />
              ) : null}
              <AvatarFallback className="bg-primary/[0.06] text-primary/55">
                <UserCircle className="size-14" weight="duotone" />
              </AvatarFallback>
            </Avatar>
            {upload.isPending ? (
              <div className="absolute inset-1.5 flex items-center justify-center rounded-full bg-background/75 backdrop-blur-sm">
                <Spinner
                  aria-label="Đang tải ảnh đại diện lên"
                  className="size-6 animate-spin text-primary"
                />
              </div>
            ) : null}
            {avatarUrl && !upload.isPending ? (
              <CheckCircle
                aria-label="Ảnh đại diện đã được tải lên"
                className="absolute bottom-0.5 right-0.5 size-6 rounded-full bg-background text-primary shadow-sm"
                weight="fill"
              />
            ) : null}
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">Ảnh đại diện đối tác</p>
              {avatarUrl ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[0.7rem] font-medium text-primary">
                  <CheckCircle className="size-3.5" weight="fill" />
                  Đã tải ảnh
                </span>
              ) : null}
            </div>
            <p className="max-w-xl text-xs leading-5 text-muted-foreground">
              Chọn ảnh vuông, rõ khuôn mặt hoặc logo. Ảnh sẽ được cắt tròn khi
              hiển thị trên hồ sơ công khai.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-0.5 text-[0.68rem] font-medium text-muted-foreground">
              <span className="rounded-md border border-border/70 bg-background/60 px-2 py-1">
                Tỷ lệ 1:1
              </span>
              <span className="rounded-md border border-border/70 bg-background/60 px-2 py-1">
                JPG · PNG · WebP
              </span>
              <span className="rounded-md border border-border/70 bg-background/60 px-2 py-1">
                Tối đa 5 MB
              </span>
            </div>
          </div>

          {avatarUrl ? (
            <FileDropzone
              {...dropzoneProps}
              className="hidden"
              renderTrigger={({ open }) => (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    className="h-9 gap-1.5 transition-transform duration-150 active:scale-[0.98]"
                    disabled={isDisabled}
                    onClick={open}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <ArrowClockwise className="size-4" />
                    Chọn ảnh khác
                  </Button>
                  <Button
                    aria-label="Xóa ảnh đại diện"
                    className="h-9 gap-1.5 text-destructive transition-transform duration-150 hover:bg-destructive/10 hover:text-destructive active:scale-[0.98]"
                    disabled={isDisabled}
                    onClick={handleRemove}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash className="size-4" />
                    Gỡ ảnh
                  </Button>
                </div>
              )}
            />
          ) : (
            <FileDropzone
              {...dropzoneProps}
              className="min-h-28 border-primary/25 bg-background/55 px-4 py-4 transition-[border-color,background-color,transform] duration-150 hover:border-primary/50 hover:bg-primary/[0.04] active:scale-[0.995]"
              label="Chọn ảnh từ thiết bị"
            />
          )}
        </div>
      </div>
    </div>
  );
};
