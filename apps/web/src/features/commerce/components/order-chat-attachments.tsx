import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@avin/ui/components/attachment";
import { Dialog, DialogContent, DialogTitle } from "@avin/ui/components/dialog";
import { FileIcon, ImageIcon } from "@phosphor-icons/react";
import * as React from "react";

import { formatOrderChatAttachmentSize } from "../order-chat-attachment-utils";

interface ChatAttachment {
  byteSize: number | null;
  contentType: string;
  fileName: string;
  id: string;
}

interface OrderChatMessageAttachmentsProps {
  attachments: ChatAttachment[];
  getAttachmentUrl: (attachmentId: string) => Promise<string>;
}

const isImageAttachment = (contentType: string): boolean =>
  contentType.startsWith("image/");

interface OrderChatImageAttachmentProps {
  attachment: ChatAttachment;
  getAttachmentUrl: (attachmentId: string) => Promise<string>;
  onPreview: (attachment: ChatAttachment) => void;
}

const OrderChatImageAttachment = ({
  attachment,
  getAttachmentUrl,
  onPreview,
}: OrderChatImageAttachmentProps) => {
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    const loadUrl = async () => {
      try {
        const nextUrl = await getAttachmentUrl(attachment.id);
        if (active) {
          setUrl(nextUrl);
        }
      } catch {
        if (active) {
          setUrl(null);
        }
      }
    };

    void loadUrl();

    return () => {
      active = false;
    };
  }, [attachment.id, getAttachmentUrl]);

  return (
    <Attachment className="w-48" orientation="vertical" size="sm">
      <AttachmentMedia className="w-full" variant="image">
        {url ? (
          <img alt={attachment.fileName} src={url} />
        ) : (
          <ImageIcon aria-hidden="true" />
        )}
      </AttachmentMedia>
      {url ? (
        <AttachmentTrigger
          aria-label={`Xem ảnh ${attachment.fileName}`}
          onClick={() => onPreview(attachment)}
        />
      ) : null}
    </Attachment>
  );
};

export const OrderChatMessageAttachments = ({
  attachments,
  getAttachmentUrl,
}: OrderChatMessageAttachmentsProps) => {
  const [previewImage, setPreviewImage] = React.useState<{
    name: string;
    url: string;
  } | null>(null);

  const openImagePreview = async (
    attachment: ChatAttachment
  ): Promise<void> => {
    const url = await getAttachmentUrl(attachment.id);
    setPreviewImage({ name: attachment.fileName, url });
  };

  const openDocument = async (attachmentId: string): Promise<void> => {
    try {
      const url = await getAttachmentUrl(attachmentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      // The parent mutation reports attachment URL failures consistently.
    }
  };

  return (
    <>
      <AttachmentGroup className="mt-1 max-w-full">
        {attachments.map((attachment) =>
          isImageAttachment(attachment.contentType) ? (
            <OrderChatImageAttachment
              attachment={attachment}
              getAttachmentUrl={getAttachmentUrl}
              key={attachment.id}
              onPreview={(image) => void openImagePreview(image)}
            />
          ) : (
            <Attachment key={attachment.id} size="sm">
              <AttachmentMedia>
                <FileIcon aria-hidden="true" />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>{attachment.fileName}</AttachmentTitle>
                <AttachmentDescription>
                  {formatOrderChatAttachmentSize(attachment.byteSize)}
                </AttachmentDescription>
              </AttachmentContent>
              <AttachmentTrigger
                aria-label={`Mở tệp ${attachment.fileName}`}
                onClick={() => void openDocument(attachment.id)}
              />
            </Attachment>
          )
        )}
      </AttachmentGroup>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setPreviewImage(null);
          }
        }}
        open={Boolean(previewImage)}
      >
        <DialogContent
          className="border-none bg-black/95 p-2 sm:max-w-6xl"
          showCloseButton
        >
          <DialogTitle className="sr-only">
            {previewImage?.name ?? "Ảnh đính kèm"}
          </DialogTitle>
          {previewImage ? (
            <img
              alt={previewImage.name}
              className="max-h-[85vh] w-full object-contain"
              src={previewImage.url}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};
