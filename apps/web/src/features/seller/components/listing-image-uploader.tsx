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

const getUploadErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "message" in error) {
    const { message } = error as { message?: unknown };
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return "The image could not be uploaded. Try again.";
};

const getRejectionErrorMessage = (code: string | undefined): string => {
  if (code === "file-too-large") {
    return "Image must be 5 MB or smaller.";
  }
  if (code === "file-invalid-type") {
    return "Use a JPEG, PNG, or WebP image.";
  }
  return "Choose one valid listing image and try again.";
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
    onError: (error) => setErrorMessage(getUploadErrorMessage(error)),
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
    onDirty();
    onImageChange({ images: [], thumbnailUrl: "" });
  };

  const isDisabled = disabled || upload.isPending;

  return (
    <div className="space-y-4">
      {thumbnailUrl ? (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/20">
          <img
            alt="Listing primary preview"
            className="aspect-video w-full object-cover"
            src={thumbnailUrl}
          />
        </div>
      ) : null}
      <FileDropzone
        accept={ACCEPTED_IMAGE_TYPES}
        disabled={disabled}
        error={errorMessage}
        helperText="JPEG, PNG, or WebP · maximum 5 MB"
        inputLabel="Choose a listing primary image"
        isUploading={upload.isPending}
        label={
          thumbnailUrl ? "Drop a replacement image" : "Add a primary image"
        }
        maxFiles={1}
        maxSize={LISTING_IMAGE_MAX_BYTES}
        onFilesRejected={(rejections) => {
          setErrorMessage(
            getRejectionErrorMessage(rejections[0]?.errors[0]?.code)
          );
        }}
        onFilesSelected={handleFilesSelected}
        progress={upload.progress}
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
                Replace image
              </Button>
            ) : (
              <Button
                disabled={isDisabled}
                onClick={open}
                size="sm"
                type="button"
              >
                <ImagePlus />
                Choose image
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
                Remove
              </Button>
            ) : null}
          </div>
        )}
        multiple={false}
      />
    </div>
  );
};
