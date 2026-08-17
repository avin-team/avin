import {
  ADVISOR_ATTACHMENT_CONTENT_TYPES,
  ADVISOR_ATTACHMENT_MAX_DIMENSION,
  ADVISOR_ATTACHMENT_MAX_NORMALIZED_BYTES,
  ADVISOR_ATTACHMENT_MAX_UPLOAD_BYTES,
} from "@avin/api/storage";
import sharp from "sharp";

export type AdvisorImageContentType =
  (typeof ADVISOR_ATTACHMENT_CONTENT_TYPES)[number];

const ADVISOR_IMAGE_MAX_PIXELS = 20_000_000;
const SUSPICIOUS_ATTACHMENT_TEXT =
  /(?:password|passwd|otp|one[-_ ]?time password|access[-_ ]?token|api[-_ ]?key|secret|cvv|credit[-_ ]?card|passport|identity[-_ ]?card|id[-_ ]?card|cccd|căn cước|hộ chiếu|mật khẩu)/iu;

const hasSignature = (
  bytes: Uint8Array,
  signature: readonly number[],
  offset = 0
): boolean => {
  if (bytes.length < offset + signature.length) {
    return false;
  }
  return signature.every((value, index) => bytes[index + offset] === value);
};

const imageSignatures: readonly {
  contentType: AdvisorImageContentType;
  matches: (bytes: Uint8Array) => boolean;
}[] = [
  {
    contentType: "image/jpeg",
    matches: (bytes) =>
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff,
  },
  {
    contentType: "image/png",
    matches: (bytes) =>
      hasSignature(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    contentType: "image/webp",
    matches: (bytes) =>
      hasSignature(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      hasSignature(bytes, [0x57, 0x45, 0x42, 0x50], 8),
  },
];

export class AdvisorAttachmentRejectionError extends Error {
  readonly code: string;

  constructor(message: string, code = "INVALID_ATTACHMENT") {
    super(message);
    this.code = code;
    this.name = "AdvisorAttachmentRejectionError";
  }
}

export { AdvisorAttachmentRejectionError as AdvisorAttachmentRejection };

const decodeText = (bytes: Uint8Array): string => {
  try {
    return new TextDecoder().decode(bytes.slice(0, 1_000_000));
  } catch {
    return "";
  }
};

export const detectAdvisorImageContentType = (
  bytes: Uint8Array
): AdvisorImageContentType | null =>
  imageSignatures.find((signature) => signature.matches(bytes))?.contentType ??
  null;

export const hasLikelyUnsafeAdvisorAttachmentContent = (
  fileName: string,
  bytes: Uint8Array
): boolean =>
  SUSPICIOUS_ATTACHMENT_TEXT.test(`${fileName} ${decodeText(bytes)}`);

export const assertAdvisorImagePayload = ({
  bytes,
  contentType,
  fileName,
}: {
  bytes: Uint8Array;
  contentType: string;
  fileName: string;
}): void => {
  if (
    bytes.byteLength === 0 ||
    bytes.byteLength > ADVISOR_ATTACHMENT_MAX_UPLOAD_BYTES
  ) {
    throw new AdvisorAttachmentRejectionError(
      "Ảnh phải có dữ liệu và không vượt quá 10 MB.",
      "ATTACHMENT_TOO_LARGE"
    );
  }

  if (
    !ADVISOR_ATTACHMENT_CONTENT_TYPES.includes(
      contentType as AdvisorImageContentType
    )
  ) {
    throw new AdvisorAttachmentRejectionError(
      "Ảnh Advisor chỉ hỗ trợ JPEG, PNG hoặc WebP.",
      "ATTACHMENT_UNSUPPORTED_TYPE"
    );
  }

  const detected = detectAdvisorImageContentType(bytes);
  if (detected !== contentType) {
    throw new AdvisorAttachmentRejectionError(
      "Định dạng ảnh không khớp với MIME đã khai báo.",
      "ATTACHMENT_MIME_MISMATCH"
    );
  }

  if (hasLikelyUnsafeAdvisorAttachmentContent(fileName, bytes)) {
    throw new AdvisorAttachmentRejectionError(
      "Không tải lên password, OTP, token, thông tin thanh toán hoặc giấy tờ định danh.",
      "ATTACHMENT_UNSAFE_CONTENT"
    );
  }
};

const normalizeWithSharp = async (
  bytes: Uint8Array,
  contentType: AdvisorImageContentType
): Promise<{ data: Buffer; height: number; width: number }> => {
  const image = sharp(bytes, {
    animated: false,
    failOn: "error",
    limitInputPixels: ADVISOR_IMAGE_MAX_PIXELS,
  })
    .rotate()
    .resize({
      fit: "inside",
      height: ADVISOR_ATTACHMENT_MAX_DIMENSION,
      width: ADVISOR_ATTACHMENT_MAX_DIMENSION,
      withoutEnlargement: true,
    });

  let normalized: { data: Buffer; info: { height: number; width: number } };
  if (contentType === "image/jpeg") {
    normalized = await image.jpeg({ mozjpeg: true, quality: 82 }).toBuffer({
      resolveWithObject: true,
    });
  } else if (contentType === "image/png") {
    normalized = await image
      .png({ compressionLevel: 9, palette: true })
      .toBuffer({
        resolveWithObject: true,
      });
  } else {
    normalized = await image.webp({ effort: 5, quality: 82 }).toBuffer({
      resolveWithObject: true,
    });
  }
  return {
    data: normalized.data,
    height: normalized.info.height,
    width: normalized.info.width,
  };
};

export const normalizeAdvisorImage = async ({
  bytes,
  contentType,
  fileName,
}: {
  bytes: Uint8Array;
  contentType: string;
  fileName: string;
}): Promise<{
  byteSize: number;
  bytes: Uint8Array;
  contentType: AdvisorImageContentType;
  height: number;
  width: number;
}> => {
  assertAdvisorImagePayload({ bytes, contentType, fileName });
  const normalizedContentType = contentType as AdvisorImageContentType;

  let normalized: { data: Buffer; height: number; width: number };
  try {
    normalized = await normalizeWithSharp(bytes, normalizedContentType);
  } catch {
    throw new AdvisorAttachmentRejectionError(
      "Ảnh bị hỏng hoặc không thể giải mã an toàn.",
      "ATTACHMENT_MALFORMED"
    );
  }

  if (
    normalized.data.byteLength === 0 ||
    normalized.data.byteLength > ADVISOR_ATTACHMENT_MAX_NORMALIZED_BYTES
  ) {
    throw new AdvisorAttachmentRejectionError(
      "Ảnh sau khi chuẩn hóa vẫn vượt quá 3 MB.",
      "ATTACHMENT_NORMALIZED_TOO_LARGE"
    );
  }

  return {
    byteSize: normalized.data.byteLength,
    bytes: normalized.data,
    contentType: normalizedContentType,
    height: normalized.height,
    width: normalized.width,
  };
};
