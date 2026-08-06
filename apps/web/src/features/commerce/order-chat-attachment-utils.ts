export const formatOrderChatAttachmentSize = (
  byteSize: number | null
): string => {
  if (byteSize === null) {
    return "Tệp đính kèm";
  }

  if (byteSize < 1024 * 1024) {
    return `${Math.max(1, Math.round(byteSize / 1024))} KB`;
  }

  return `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
};
