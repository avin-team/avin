import { ArrowSquareOutIcon, FileIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { orpc } from "@/lib/orpc";

import type { DisputeChatAttachment as DisputeChatAttachmentData } from "../types";

interface DisputeChatAttachmentProps {
  readonly attachment: DisputeChatAttachmentData;
}

const isImageAttachment = (contentType: string): boolean =>
  contentType.startsWith("image/");

export const DisputeChatAttachment = ({
  attachment,
}: DisputeChatAttachmentProps) => {
  const { mutateAsync: getAttachmentUrl } = useMutation(
    orpc.commerce.chat.getAttachmentUrl.mutationOptions()
  );
  const [url, setUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;

    const loadUrl = async () => {
      try {
        const result = await getAttachmentUrl({
          attachmentId: attachment.id,
        });
        if (active) {
          setUrl(result.url);
        }
      } catch {
        if (active) {
          setHasError(true);
        }
      }
    };

    void loadUrl();

    return () => {
      active = false;
    };
  }, [attachment.id, getAttachmentUrl]);

  if (hasError) {
    return (
      <span className="text-xs text-muted-foreground">
        Không thể tải {attachment.fileName}
      </span>
    );
  }

  if (!url) {
    return (
      <span className="text-xs text-muted-foreground">
        Đang tải {attachment.fileName}…
      </span>
    );
  }

  if (isImageAttachment(attachment.contentType)) {
    return (
      <a
        className="block max-w-56 overflow-hidden rounded-xl border border-border/60 bg-muted"
        href={url}
        rel="noopener noreferrer"
        target="_blank"
      >
        <img
          alt={attachment.fileName}
          className="max-h-48 w-full object-contain"
          src={url}
        />
      </a>
    );
  }

  return (
    <a
      className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs hover:bg-muted"
      href={url}
      rel="noopener noreferrer"
      target="_blank"
    >
      <FileIcon aria-hidden="true" className="size-4" />
      <span className="max-w-48 truncate">{attachment.fileName}</span>
      <ArrowSquareOutIcon aria-hidden="true" className="size-3.5" />
    </a>
  );
};
