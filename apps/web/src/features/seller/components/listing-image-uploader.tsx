import {
  createPublicMediaUrl,
  LISTING_IMAGE_MAX_BYTES,
  LISTING_IMAGE_MAX_COUNT,
  LISTING_IMAGE_UPLOAD_ROUTE,
} from "@avin/api/storage";
import { env } from "@avin/env/web";
import { Button } from "@avin/ui/components/button";
import type { FileDropzoneProps } from "@avin/ui/components/file-dropzone";
import { FileDropzone } from "@avin/ui/components/file-dropzone";
import { Progress } from "@avin/ui/components/progress";
import { useUploadFiles } from "@better-upload/client";
import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  RefreshCw,
  Trash2,
  Undo2,
} from "lucide-react";
import { useState } from "react";

import { validateListingImage } from "./listing-image-validation";

interface FailedImageUpload {
  file: File;
  message: string;
}

type FileRejection = Parameters<
  NonNullable<FileDropzoneProps["onFilesRejected"]>
>[0][number];

interface ListingImageUploaderProps {
  disabled: boolean;
  images: string[];
  listingId: string;
  onDirty: () => void;
  onImageChange: (value: { images: string[]; thumbnailUrl: string }) => void;
  onImagesUploaded?: (imageUrls: string[]) => void;
  onUploadingChange?: (isUploading: boolean) => void;
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
  return "Chọn ảnh sản phẩm hợp lệ rồi thử lại.";
};

const getFileKey = (file: File): string =>
  `${file.name}:${file.size}:${file.lastModified}`;

const getCurrentImages = (images: string[], thumbnailUrl: string): string[] => {
  if (images.length > 0) {
    return images;
  }
  if (thumbnailUrl) {
    return [thumbnailUrl];
  }
  return [];
};

export const ListingImageUploader = ({
  disabled,
  images,
  listingId,
  onDirty,
  onImageChange,
  onImagesUploaded,
  onUploadingChange,
  thumbnailUrl,
}: ListingImageUploaderProps) => {
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [failedUploads, setFailedUploads] = useState<FailedImageUpload[]>([]);
  const [isProcessingSelection, setIsProcessingSelection] = useState(false);
  const [isValidatingDimensions, setIsValidatingDimensions] = useState(false);
  const [removedImage, setRemovedImage] = useState<{
    image: string;
    index: number;
  }>();
  const upload = useUploadFiles({
    api: `${env.VITE_SERVER_URL}/api/upload`,
    credentials: "include",
    onError: () => setErrorMessage(getUploadErrorMessage()),
    route: LISTING_IMAGE_UPLOAD_ROUTE,
    uploadBatchSize: 3,
  });

  const currentImages = getCurrentImages(images, thumbnailUrl);
  const isUploading =
    upload.isPending || isProcessingSelection || isValidatingDimensions;
  const isDisabled = disabled || isUploading;

  const commitImages = (nextImages: string[]) => {
    onDirty();
    onImageChange({
      images: nextImages,
      thumbnailUrl: nextImages[0] ?? "",
    });
  };

  const addFailedUploads = (nextFailedUploads: FailedImageUpload[]) => {
    if (nextFailedUploads.length === 0) {
      return;
    }

    const failedByKey = new Map(
      nextFailedUploads.map((failedUpload) => [
        getFileKey(failedUpload.file),
        failedUpload,
      ])
    );
    setFailedUploads((currentFailedUploads) => {
      for (const failedUpload of currentFailedUploads) {
        failedByKey.set(getFileKey(failedUpload.file), failedUpload);
      }
      return [...failedByKey.values()];
    });
  };

  const handleFilesSelected = async (files: File[]): Promise<void> => {
    setRemovedImage(undefined);
    const availableSlots = LISTING_IMAGE_MAX_COUNT - currentImages.length;
    if (availableSlots <= 0) {
      setErrorMessage(`Tin đăng đã đủ ${LISTING_IMAGE_MAX_COUNT} ảnh.`);
      return;
    }

    const filesToUpload = files.slice(0, availableSlots);
    const ignoredFileCount = files.length - filesToUpload.length;
    setErrorMessage(
      ignoredFileCount > 0
        ? `Chỉ có thể thêm ${availableSlots} ảnh nữa. Các ảnh còn lại chưa được thêm.`
        : undefined
    );
    onUploadingChange?.(true);
    setIsProcessingSelection(true);
    setIsValidatingDimensions(true);

    const validFiles: File[] = [];
    const invalidUploads: FailedImageUpload[] = [];
    try {
      const validationResults = await Promise.all(
        filesToUpload.map(async (file) => ({
          file,
          validationError: await validateListingImage(file),
        }))
      );
      for (const { file, validationError } of validationResults) {
        if (validationError) {
          invalidUploads.push({ file, message: validationError });
        } else {
          validFiles.push(file);
        }
      }
      setIsValidatingDimensions(false);
      addFailedUploads(invalidUploads);

      if (validFiles.length === 0) {
        return;
      }

      upload.reset();
      const validFileKeys = new Set(validFiles.map(getFileKey));
      setFailedUploads((currentFailedUploads) =>
        currentFailedUploads.filter(
          (failedUpload) => !validFileKeys.has(getFileKey(failedUpload.file))
        )
      );

      try {
        const result = await upload.uploadAsync(validFiles, {
          metadata: { listingId },
        });
        const uploadedByFileKey = new Map(
          result.files.map((uploadedFile) => [
            getFileKey(uploadedFile.raw),
            uploadedFile,
          ])
        );
        const uploadedUrls = validFiles.flatMap((file) => {
          const uploadedFile = uploadedByFileKey.get(getFileKey(file));
          return uploadedFile
            ? [
                createPublicMediaUrl(
                  env.VITE_SUPABASE_URL,
                  uploadedFile.objectInfo.key
                ),
              ]
            : [];
        });

        if (uploadedUrls.length > 0) {
          commitImages([...currentImages, ...uploadedUrls]);
          onImagesUploaded?.(uploadedUrls);
        }

        addFailedUploads(
          result.failedFiles.map((failedFile) => ({
            file: failedFile.raw,
            message: failedFile.error.message || getUploadErrorMessage(),
          }))
        );
        if (result.failedFiles.length > 0) {
          setErrorMessage("Một số ảnh chưa tải lên được. Bạn có thể thử lại.");
        }
      } catch {
        addFailedUploads(
          validFiles.map((file) => ({
            file,
            message: getUploadErrorMessage(),
          }))
        );
        setErrorMessage(getUploadErrorMessage());
      }
    } catch {
      addFailedUploads(invalidUploads);
      setErrorMessage(getUploadErrorMessage());
    } finally {
      setIsValidatingDimensions(false);
      setIsProcessingSelection(false);
      onUploadingChange?.(false);
    }
  };

  const handleRetry = async (failedUpload: FailedImageUpload) => {
    setFailedUploads((currentFailedUploads) =>
      currentFailedUploads.filter(
        (currentFailedUpload) =>
          getFileKey(currentFailedUpload.file) !== getFileKey(failedUpload.file)
      )
    );
    await handleFilesSelected([failedUpload.file]);
  };

  const handleRemoveImage = (index: number) => {
    if (isDisabled) {
      return;
    }
    const image = currentImages[index];
    if (!image) {
      return;
    }

    setRemovedImage({ image, index });
    commitImages(currentImages.filter((_, imageIndex) => imageIndex !== index));
  };

  const handleMoveImage = (fromIndex: number, toIndex: number) => {
    if (isDisabled || toIndex < 0 || toIndex >= currentImages.length) {
      return;
    }

    const nextImages = [...currentImages];
    const [movedImage] = nextImages.splice(fromIndex, 1);
    if (!movedImage) {
      return;
    }
    nextImages.splice(toIndex, 0, movedImage);
    setRemovedImage(undefined);
    commitImages(nextImages);
  };

  const handleUndoRemove = () => {
    if (
      !removedImage ||
      isDisabled ||
      currentImages.includes(removedImage.image)
    ) {
      return;
    }

    const nextImages = [...currentImages];
    nextImages.splice(
      Math.min(removedImage.index, nextImages.length),
      0,
      removedImage.image
    );
    setRemovedImage(undefined);
    commitImages(nextImages);
  };

  const handleFilesRejected = (rejections: FileRejection[]) => {
    addFailedUploads(
      rejections.map((rejection) => ({
        file: rejection.file,
        message: getRejectionErrorMessage(rejection.errors[0]?.code),
      }))
    );
    setErrorMessage(getRejectionErrorMessage(rejections[0]?.errors[0]?.code));
  };

  return (
    <div className="space-y-4">
      {currentImages.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {currentImages.map((image, index) => (
            <div
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-muted/20"
              draggable={!isDisabled}
              key={image}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(index));
              }}
              onDrop={(event) => {
                const fromIndex = Number(
                  event.dataTransfer.getData("text/plain")
                );
                if (Number.isInteger(fromIndex)) {
                  handleMoveImage(fromIndex, index);
                }
              }}
            >
              <img
                alt={`Ảnh sản phẩm ${index + 1}${index === 0 ? " · Ảnh đại diện" : ""}`}
                className="aspect-video w-full object-cover"
                draggable={false}
                src={image}
              />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/75 to-transparent p-2 text-xs text-white">
                <span className="font-medium">
                  {index === 0 ? "Ảnh đại diện" : `Ảnh ${index + 1}`}
                </span>
                <span className="text-white/75">Kéo để sắp xếp</span>
              </div>
              <div className="flex items-center justify-between gap-1 p-2">
                <div className="flex items-center gap-1">
                  <Button
                    aria-label={`Đưa ảnh ${index + 1} lên`}
                    disabled={isDisabled || index === 0}
                    onClick={() => handleMoveImage(index, index - 1)}
                    size="icon-sm"
                    title="Đưa ảnh lên"
                    type="button"
                    variant="ghost"
                  >
                    <ArrowLeft />
                  </Button>
                  <Button
                    aria-label={`Đưa ảnh ${index + 1} xuống`}
                    disabled={isDisabled || index === currentImages.length - 1}
                    onClick={() => handleMoveImage(index, index + 1)}
                    size="icon-sm"
                    title="Đưa ảnh xuống"
                    type="button"
                    variant="ghost"
                  >
                    <ArrowRight />
                  </Button>
                </div>
                <Button
                  aria-label={`Xóa ảnh ${index + 1}`}
                  disabled={isDisabled}
                  onClick={() => handleRemoveImage(index)}
                  size="icon-sm"
                  title="Xóa ảnh"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {removedImage ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 p-3 text-sm">
          <span>Đã xóa ảnh khỏi thư viện.</span>
          <Button
            disabled={isDisabled}
            onClick={handleUndoRemove}
            size="sm"
            type="button"
            variant="outline"
          >
            <Undo2 />
            Hoàn tác
          </Button>
        </div>
      ) : null}

      {currentImages.length < LISTING_IMAGE_MAX_COUNT ? (
        <FileDropzone
          accept={ACCEPTED_IMAGE_TYPES}
          disabled={disabled}
          helperText="JPEG, PNG hoặc WebP · tối đa 5 MB mỗi ảnh · tối thiểu 800×600 px"
          inputLabel="Chọn ảnh sản phẩm"
          isUploading={isUploading}
          label={
            currentImages.length > 0
              ? "Thêm ảnh vào thư viện"
              : "Thêm ảnh đại diện"
          }
          maxFiles={0}
          maxSize={LISTING_IMAGE_MAX_BYTES}
          multiple
          onFilesRejected={handleFilesRejected}
          onFilesSelected={handleFilesSelected}
          progress={upload.averageProgress}
          browseHelperText="Kéo thả hoặc bấm để chọn nhiều ảnh"
          progressLabel="Tiến độ tải ảnh"
          progressSuffix="đã tải"
          uploadingHelperText="Vui lòng chờ cho đến khi mọi ảnh tải xong."
          uploadingLabel="Đang tải ảnh…"
          renderTrigger={({ open }) => (
            <Button disabled={isDisabled} onClick={open} type="button">
              <ImagePlus />
              Thêm ảnh
            </Button>
          )}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Tin đăng đã đủ {LISTING_IMAGE_MAX_COUNT} ảnh.
        </p>
      )}

      {upload.isPending && upload.progresses.length > 0 ? (
        <div
          aria-live="polite"
          className="space-y-2 rounded-xl bg-muted/40 p-3"
        >
          {upload.progresses.map((progress) => (
            <div className="space-y-1" key={getFileKey(progress.raw)}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-foreground">
                  {progress.name}
                </span>
                <span className="text-muted-foreground">
                  {Math.round(progress.progress * 100)}%
                </span>
              </div>
              <Progress value={progress.progress * 100} />
            </div>
          ))}
        </div>
      ) : null}

      {failedUploads.length > 0 ? (
        <div aria-live="polite" className="space-y-2">
          {failedUploads.map((failedUpload) => (
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm"
              key={getFileKey(failedUpload.file)}
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {failedUpload.file.name}
                </p>
                <p className="text-xs text-destructive">
                  {failedUpload.message}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  disabled={isDisabled}
                  onClick={() => void handleRetry(failedUpload)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <RefreshCw />
                  Thử lại
                </Button>
                <Button
                  aria-label={`Bỏ ảnh lỗi ${failedUpload.file.name}`}
                  disabled={isDisabled}
                  onClick={() =>
                    setFailedUploads((currentFailedUploads) =>
                      currentFailedUploads.filter(
                        (currentFailedUpload) =>
                          getFileKey(currentFailedUpload.file) !==
                          getFileKey(failedUpload.file)
                      )
                    )
                  }
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Bỏ qua
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
};
