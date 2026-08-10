import {
  COMMERCE_IMAGE_CONTENT_TYPES,
  COMMERCE_IMAGE_MAX_BYTES,
  COMMERCE_IMAGE_MAX_COUNT,
} from "@avin/api/storage";
import { env } from "@avin/env/web";
import { Button } from "@avin/ui/components/button";
import { FileDropzone } from "@avin/ui/components/file-dropzone";
import { useUploadFiles } from "@better-upload/client";
import { TrashIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

const ACCEPTED_IMAGE_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

export interface OrderImageAttachment {
  byteSize: number;
  contentType: string;
  fileName: string;
  id: string;
  previewUrl?: string;
  storageKey: string;
}

export interface OrderImageUploadMetadata {
  byteSize: number;
  contentType: string;
  fileName: string;
  storageKey: string;
}

interface OrderImageUploaderProps {
  disabled?: boolean;
  metadata: Record<string, string>;
  onAttachmentsChange?: (attachments: OrderImageAttachment[]) => void;
  onBusyChange?: (busy: boolean) => void;
  onCreateAttachment: (
    input: OrderImageUploadMetadata
  ) => Promise<OrderImageAttachment>;
  onDiscardAttachment: (attachmentId: string) => Promise<void>;
  route: string;
  uploadPath: string;
}

const getRejectionErrorMessage = (code: string | undefined): string => {
  if (code === "file-too-large") {
    return "Ảnh phải có dung lượng từ 10 MB trở xuống.";
  }
  if (code === "file-invalid-type") {
    return "Chỉ dùng ảnh JPEG, PNG hoặc WebP.";
  }
  return "Chọn ảnh hợp lệ rồi thử lại.";
};

const isCommerceImageContentType = (
  value: string
): value is (typeof COMMERCE_IMAGE_CONTENT_TYPES)[number] =>
  COMMERCE_IMAGE_CONTENT_TYPES.includes(
    value as (typeof COMMERCE_IMAGE_CONTENT_TYPES)[number]
  );

export const OrderImageUploader = ({
  disabled = false,
  metadata,
  onAttachmentsChange,
  onBusyChange,
  onCreateAttachment,
  onDiscardAttachment,
  route,
  uploadPath,
}: OrderImageUploaderProps) => {
  const [attachments, setAttachments] = useState<OrderImageAttachment[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isBusy, setIsBusy] = useState(false);
  const attachmentsRef = useRef(attachments);
  const upload = useUploadFiles({
    api: `${env.VITE_SERVER_URL}${uploadPath}`,
    credentials: "include",
    onError: () => setErrorMessage("Không thể tải ảnh lên. Vui lòng thử lại."),
    route,
    uploadBatchSize: COMMERCE_IMAGE_MAX_COUNT,
  });

  useEffect(
    () => () => {
      for (const attachment of attachmentsRef.current) {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      }
    },
    []
  );

  const handleFilesSelected = async (files: File[]): Promise<void> => {
    const currentAttachments = attachmentsRef.current;
    const availableSlots = COMMERCE_IMAGE_MAX_COUNT - currentAttachments.length;
    if (availableSlots <= 0) {
      setErrorMessage(
        `Chỉ được đính kèm tối đa ${COMMERCE_IMAGE_MAX_COUNT} ảnh.`
      );
      return;
    }

    setErrorMessage(undefined);
    const selectedFiles = files.slice(0, availableSlots);
    setIsBusy(true);
    onBusyChange?.(true);
    try {
      const result = await upload.uploadAsync(selectedFiles, { metadata });
      const uploadedAttachments = await Promise.all(
        result.files.flatMap(async (uploadedFile) => {
          const contentType = uploadedFile.raw.type;
          if (!isCommerceImageContentType(contentType)) {
            return [];
          }
          const attachment = await onCreateAttachment({
            byteSize: uploadedFile.raw.size,
            contentType,
            fileName: uploadedFile.raw.name,
            storageKey: uploadedFile.objectInfo.key,
          });
          return [
            {
              ...attachment,
              previewUrl: URL.createObjectURL(uploadedFile.raw),
            },
          ];
        })
      );
      const nextAttachments = [
        ...currentAttachments,
        ...uploadedAttachments.flat(),
      ];
      attachmentsRef.current = nextAttachments;
      setAttachments(nextAttachments);
      onAttachmentsChange?.(nextAttachments);
      if (result.failedFiles.length > 0) {
        setErrorMessage("Một số ảnh chưa tải lên được. Hãy thử lại.");
      }
    } catch {
      setErrorMessage("Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setIsBusy(false);
      onBusyChange?.(false);
    }
  };

  const handleRemove = async (attachment: OrderImageAttachment) => {
    setIsBusy(true);
    onBusyChange?.(true);
    try {
      await onDiscardAttachment(attachment.id);
      const nextAttachments = attachmentsRef.current.filter(
        (item) => item.id !== attachment.id
      );
      attachmentsRef.current = nextAttachments;
      setAttachments(nextAttachments);
      onAttachmentsChange?.(nextAttachments);
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    } catch {
      setErrorMessage("Không thể xóa ảnh. Vui lòng thử lại.");
    } finally {
      setIsBusy(false);
      onBusyChange?.(false);
    }
  };

  return (
    <div className="grid gap-3">
      <FileDropzone
        accept={ACCEPTED_IMAGE_TYPES}
        disabled={disabled || isBusy}
        helperText="JPEG, PNG hoặc WebP · tối đa 5 ảnh · 10 MB mỗi ảnh"
        inputLabel="Chọn ảnh đính kèm"
        isUploading={upload.isPending}
        label="Thêm hình ảnh"
        maxFiles={Math.max(1, COMMERCE_IMAGE_MAX_COUNT - attachments.length)}
        maxSize={COMMERCE_IMAGE_MAX_BYTES}
        multiple
        onFilesRejected={(rejections) => {
          setErrorMessage(
            getRejectionErrorMessage(rejections[0]?.errors[0]?.code)
          );
        }}
        onFilesSelected={(files) => void handleFilesSelected(files)}
        progress={upload.averageProgress}
        uploadingLabel="Đang tải ảnh…"
      />
      {attachments.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {attachments.map((attachment) => (
            <li
              className="group relative overflow-hidden rounded-xl border border-border/60 bg-muted"
              key={attachment.id}
            >
              {attachment.previewUrl ? (
                <img
                  alt={attachment.fileName}
                  className="aspect-square w-full object-cover"
                  src={attachment.previewUrl}
                />
              ) : (
                <div className="flex aspect-square items-center justify-center p-2 text-center text-xs text-muted-foreground">
                  {attachment.fileName}
                </div>
              )}
              <Button
                aria-label={`Xóa ảnh ${attachment.fileName}`}
                className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                disabled={disabled || isBusy}
                onClick={() => void handleRemove(attachment)}
                size="icon-sm"
                type="button"
                variant="destructive"
              >
                <TrashIcon aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
};
