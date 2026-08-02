import {
  createPublicMediaUrl,
  LISTING_IMAGE_MAX_BYTES,
  LISTING_IMAGE_UPLOAD_ROUTE,
} from "@avin/api/storage";
import { env } from "@avin/env/web";
import { Button } from "@avin/ui/components/button";
import { FileDropzone } from "@avin/ui/components/file-dropzone";
import { useUploadFile } from "@better-upload/client";
import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";

interface ListingImageUploaderProps {
  disabled: boolean;
  onDirty: () => void;
  onImageChange: (value: { images: string[]; thumbnailUrl: string }) => void;
  listingId: string;
  thumbnailUrl: string;
}

const ACCEPTED_IMAGE_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

const getUploadErrorMessage = (): string =>
  "Không thể tải ảnh lên. Vui lòng thử lại.";

const getRejectionErrorMessage = (code: string | undefined): string => {
  if (code === "file-too-large") {
    return "Ảnh phải có dung lượng từ 5 MB trở xuống.";
  }
  if (code === "file-invalid-type") {
    return "Chỉ dùng ảnh JPEG, PNG hoặc WebP.";
  }
  return "Chọn một ảnh sản phẩm hợp lệ rồi thử lại.";
};

export const ListingImageUploader = ({
  disabled,
  onDirty,
  onImageChange,
  listingId,
  thumbnailUrl,
}: ListingImageUploaderProps) => {
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const upload = useUploadFile({
    api: `${env.VITE_SERVER_URL}/api/upload`,
    credentials: "include",
    onError: () => setErrorMessage(getUploadErrorMessage()),
    route: LISTING_IMAGE_UPLOAD_ROUTE,
  });

  const handleFilesSelected = async (files: File[]) => {
    const [file] = files;
    if (!file) {
      return;
    }

    setErrorMessage(undefined);
    upload.reset();

    try {
      const result = await upload.uploadAsync(file, {
        metadata: { listingId },
      });
      const publicUrl = createPublicMediaUrl(
        env.VITE_SUPABASE_URL,
        result.file.objectInfo.key
      );
      onDirty();
      onImageChange({ images: [publicUrl], thumbnailUrl: publicUrl });
    } catch {
      setErrorMessage(getUploadErrorMessage());
    }
  };

  const handleRemove = () => {
    if (disabled || upload.isPending) {
      return;
    }

    setErrorMessage(undefined);
    upload.reset();
    onDirty();
    onImageChange({ images: [], thumbnailUrl: "" });
  };

  const isDisabled = disabled || upload.isPending;

  return (
    <div className="space-y-4">
      {thumbnailUrl ? (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/20">
          <img
            alt="Xem trước ảnh đại diện sản phẩm"
            className="aspect-video w-full object-cover"
            src={thumbnailUrl}
          />
        </div>
      ) : null}
      <FileDropzone
        accept={ACCEPTED_IMAGE_TYPES}
        disabled={disabled}
        error={errorMessage}
        helperText="JPEG, PNG hoặc WebP · tối đa 5 MB"
        inputLabel="Chọn ảnh đại diện sản phẩm"
        isUploading={upload.isPending}
        label={thumbnailUrl ? "Thả ảnh thay thế vào đây" : "Thêm ảnh đại diện"}
        maxFiles={1}
        maxSize={LISTING_IMAGE_MAX_BYTES}
        onFilesRejected={(rejections) => {
          setErrorMessage(
            getRejectionErrorMessage(rejections[0]?.errors[0]?.code)
          );
        }}
        onFilesSelected={handleFilesSelected}
        progress={upload.progress}
        browseHelperText="Kéo thả hoặc bấm để chọn ảnh"
        progressLabel="Tiến độ tải ảnh"
        progressSuffix="đã tải"
        uploadingHelperText="Vui lòng chờ trong khi ảnh được tải lên."
        uploadingLabel="Đang tải ảnh…"
        renderTrigger={({ open }) => (
          <div className="flex flex-wrap justify-center gap-2">
            {thumbnailUrl ? (
              <Button
                disabled={isDisabled}
                onClick={open}
                size="sm"
                type="button"
                variant="outline"
              >
                <RefreshCw />
                Thay ảnh
              </Button>
            ) : (
              <Button
                disabled={isDisabled}
                onClick={open}
                size="sm"
                type="button"
              >
                <ImagePlus />
                Chọn ảnh
              </Button>
            )}
            {thumbnailUrl ? (
              <Button
                disabled={isDisabled}
                onClick={handleRemove}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Trash2 />
                Xóa ảnh
              </Button>
            ) : null}
          </div>
        )}
        multiple={false}
      />
    </div>
  );
};
