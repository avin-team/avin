export const PUBLIC_MEDIA_BUCKET = "public-media";
export const ORDER_FILES_BUCKET = "order-files";
export const ADVISOR_ATTACHMENTS_BUCKET = "advisor-attachments";

export const LISTING_IMAGE_UPLOAD_ROUTE = "listing-image";
export const SELLER_LOGO_UPLOAD_ROUTE = "seller-logo";
export const SELLER_BANNER_UPLOAD_ROUTE = "seller-banner";
export const ORDER_CHAT_ATTACHMENT_UPLOAD_ROUTE = "order-chat-attachment";
export const DISPUTE_EVIDENCE_UPLOAD_ROUTE = "dispute-evidence";
export const SELLER_ENFORCEMENT_APPEAL_EVIDENCE_UPLOAD_ROUTE =
  "seller-enforcement-appeal-evidence";
export const CHECKOUT_ATTACHMENT_UPLOAD_ROUTE = "checkout-attachment";
export const DELIVERY_ATTACHMENT_UPLOAD_ROUTE = "delivery-attachment";
export const ADVISOR_ATTACHMENT_UPLOAD_ROUTE = "advisor-attachment";

export interface ManagedObjectStore {
  deleteObject: (key: string, bucket?: string) => Promise<void>;
  getObject?: (key: string, bucket?: string) => Promise<Uint8Array>;
  putObject?: (
    key: string,
    body: Uint8Array,
    contentType: string,
    bucket?: string
  ) => Promise<void>;
  supabaseUrl: string;
}

const SELLER_BRANDING_MAX_BYTES = 5 * 1024 * 1024;

export const LISTING_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const LISTING_IMAGE_MAX_COUNT = 6;
export const LISTING_IMAGE_MIN_HEIGHT = 600;
export const LISTING_IMAGE_MIN_WIDTH = 800;

export const LISTING_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const SELLER_LOGO_MAX_BYTES = SELLER_BRANDING_MAX_BYTES;
export const SELLER_LOGO_CONTENT_TYPES = LISTING_IMAGE_CONTENT_TYPES;
export const SELLER_BANNER_MAX_BYTES = SELLER_BRANDING_MAX_BYTES;
export const SELLER_BANNER_CONTENT_TYPES = LISTING_IMAGE_CONTENT_TYPES;

export const ORDER_CHAT_ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;
export const ORDER_CHAT_ATTACHMENT_MAX_COUNT = 5;
export const ORDER_CHAT_ATTACHMENT_MAX_TOTAL_BYTES = 50 * 1024 * 1024;

export const ORDER_CHAT_ATTACHMENT_CONTENT_TYPES = [
  "application/msword",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
] as const;

export const DISPUTE_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
export const DISPUTE_EVIDENCE_MAX_COUNT = 5;
export const DISPUTE_EVIDENCE_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
] as const;

export const SELLER_ENFORCEMENT_APPEAL_EVIDENCE_MAX_BYTES =
  DISPUTE_EVIDENCE_MAX_BYTES;
export const SELLER_ENFORCEMENT_APPEAL_EVIDENCE_MAX_COUNT =
  DISPUTE_EVIDENCE_MAX_COUNT;
export const SELLER_ENFORCEMENT_APPEAL_EVIDENCE_CONTENT_TYPES =
  DISPUTE_EVIDENCE_CONTENT_TYPES;

export const COMMERCE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const COMMERCE_IMAGE_MAX_COUNT = 5;
export const COMMERCE_IMAGE_CONTENT_TYPES = LISTING_IMAGE_CONTENT_TYPES;

export const ADVISOR_ATTACHMENT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ADVISOR_ATTACHMENT_MAX_NORMALIZED_BYTES = 3 * 1024 * 1024;
export const ADVISOR_ATTACHMENT_MAX_DIMENSION = 2048;
export const ADVISOR_ATTACHMENT_MAX_PER_MESSAGE = 3;
export const ADVISOR_ATTACHMENT_MAX_PER_SESSION = 5;
export const ADVISOR_ATTACHMENT_MAX_MODEL_BYTES = 12 * 1024 * 1024;
export const ADVISOR_ATTACHMENT_UNCOMMITTED_TTL_MS = 60 * 60 * 1000;
export const ADVISOR_ATTACHMENT_CONTENT_TYPES = LISTING_IMAGE_CONTENT_TYPES;

export const isOrderChatAttachmentContentType = (
  contentType: string
): contentType is (typeof ORDER_CHAT_ATTACHMENT_CONTENT_TYPES)[number] =>
  ORDER_CHAT_ATTACHMENT_CONTENT_TYPES.includes(
    contentType as (typeof ORDER_CHAT_ATTACHMENT_CONTENT_TYPES)[number]
  );

type ListingImageContentType = (typeof LISTING_IMAGE_CONTENT_TYPES)[number];

const LISTING_IMAGE_EXTENSIONS: Record<ListingImageContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const SAFE_PATH_SEGMENT = /^[a-zA-Z0-9_-]+$/u;
const MANAGED_LISTING_IMAGE_KEY =
  /^listings\/[a-zA-Z0-9_-]+\/thumbnail\/[a-f0-9-]{36}\.(?:jpg|png|webp)$/iu;

export const createListingImageKey = (
  listingId: string,
  contentType: string,
  objectId = crypto.randomUUID()
): string => {
  const extension =
    LISTING_IMAGE_EXTENSIONS[contentType as ListingImageContentType];

  if (!extension) {
    throw new Error(`Unsupported listing image type: ${contentType}`);
  }

  if (!SAFE_PATH_SEGMENT.test(listingId) || !SAFE_PATH_SEGMENT.test(objectId)) {
    throw new Error("Invalid listing image path segment");
  }

  return `listings/${listingId}/thumbnail/${objectId}.${extension}`;
};

export const createSellerLogoKey = (
  sellerId: string,
  contentType: string,
  objectId = crypto.randomUUID()
): string => {
  const extension =
    LISTING_IMAGE_EXTENSIONS[contentType as ListingImageContentType];

  if (!extension) {
    throw new Error(`Unsupported seller logo type: ${contentType}`);
  }

  if (!SAFE_PATH_SEGMENT.test(sellerId) || !SAFE_PATH_SEGMENT.test(objectId)) {
    throw new Error("Invalid seller logo path segment");
  }

  return `sellers/${sellerId}/logo/${objectId}.${extension}`;
};

export const createSellerBannerKey = (
  sellerId: string,
  contentType: string,
  objectId = crypto.randomUUID()
): string => {
  const extension =
    LISTING_IMAGE_EXTENSIONS[contentType as ListingImageContentType];

  if (!extension) {
    throw new Error(`Unsupported seller banner type: ${contentType}`);
  }

  if (!SAFE_PATH_SEGMENT.test(sellerId) || !SAFE_PATH_SEGMENT.test(objectId)) {
    throw new Error("Invalid seller banner path segment");
  }

  return `sellers/${sellerId}/banner/${objectId}.${extension}`;
};

export const createOrderChatAttachmentKey = (
  orderId: string,
  userId: string,
  objectId = crypto.randomUUID()
): string => {
  if (
    !SAFE_PATH_SEGMENT.test(orderId) ||
    !SAFE_PATH_SEGMENT.test(userId) ||
    !SAFE_PATH_SEGMENT.test(objectId)
  ) {
    throw new Error("Invalid order chat attachment path segment");
  }

  return `orders/${orderId}/chat/${userId}/${objectId}`;
};

const DISPUTE_EVIDENCE_EXTENSIONS: Record<
  (typeof DISPUTE_EVIDENCE_CONTENT_TYPES)[number],
  string
> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "text/plain": "txt",
};

export const createDisputeEvidenceKey = (
  orderItemId: string,
  userId: string,
  contentType: string,
  objectId = crypto.randomUUID()
): string => {
  const extension =
    DISPUTE_EVIDENCE_EXTENSIONS[
      contentType as (typeof DISPUTE_EVIDENCE_CONTENT_TYPES)[number]
    ];
  if (!extension) {
    throw new Error(`Unsupported dispute evidence type: ${contentType}`);
  }
  if (
    !SAFE_PATH_SEGMENT.test(orderItemId) ||
    !SAFE_PATH_SEGMENT.test(userId) ||
    !SAFE_PATH_SEGMENT.test(objectId)
  ) {
    throw new Error("Invalid dispute evidence path segment");
  }
  return `orders/${orderItemId}/disputes/${userId}/${objectId}.${extension}`;
};

export const isDisputeEvidenceKey = (
  key: string,
  orderItemId: string,
  userId: string
): boolean => {
  if (!SAFE_PATH_SEGMENT.test(orderItemId) || !SAFE_PATH_SEGMENT.test(userId)) {
    return false;
  }
  const prefix = `orders/${orderItemId}/disputes/${userId}/`;
  return new RegExp(
    `^${prefix.replaceAll("/", "\\/")}[a-f0-9-]{36}\\.(?:pdf|jpg|png|webp|txt)$`,
    "iu"
  ).test(key);
};

export const createSellerEnforcementAppealEvidenceKey = (
  actionId: string,
  sellerId: string,
  contentType: string,
  objectId = crypto.randomUUID()
): string => {
  const extension =
    DISPUTE_EVIDENCE_EXTENSIONS[
      contentType as (typeof DISPUTE_EVIDENCE_CONTENT_TYPES)[number]
    ];
  if (!extension) {
    throw new Error(
      `Unsupported Seller Enforcement appeal evidence type: ${contentType}`
    );
  }
  if (
    !SAFE_PATH_SEGMENT.test(actionId) ||
    !SAFE_PATH_SEGMENT.test(sellerId) ||
    !SAFE_PATH_SEGMENT.test(objectId)
  ) {
    throw new Error("Invalid Seller Enforcement appeal evidence path segment");
  }
  return `seller-enforcement-appeals/${actionId}/${sellerId}/${objectId}.${extension}`;
};

export const isSellerEnforcementAppealEvidenceKey = (
  key: string,
  actionId: string,
  sellerId: string
): boolean => {
  if (!SAFE_PATH_SEGMENT.test(actionId) || !SAFE_PATH_SEGMENT.test(sellerId)) {
    return false;
  }
  const prefix = `seller-enforcement-appeals/${actionId}/${sellerId}/`;
  return new RegExp(
    `^${prefix.replaceAll("/", "\\/")}[a-f0-9-]{36}\\.(?:pdf|jpg|png|webp|txt)$`,
    "iu"
  ).test(key);
};

export const isOrderChatAttachmentKey = (
  key: string,
  orderId: string,
  userId: string
): boolean =>
  key.startsWith(`orders/${orderId}/chat/${userId}/`) &&
  SAFE_PATH_SEGMENT.test(key.split("/").at(-1) ?? "");

const COMMERCE_IMAGE_EXTENSIONS: Record<
  (typeof COMMERCE_IMAGE_CONTENT_TYPES)[number],
  string
> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const getCommerceImageExtension = (contentType: string): string => {
  const extension =
    COMMERCE_IMAGE_EXTENSIONS[
      contentType as (typeof COMMERCE_IMAGE_CONTENT_TYPES)[number]
    ];
  if (!extension) {
    throw new Error(`Unsupported commerce image type: ${contentType}`);
  }
  return extension;
};

const assertCommercePathSegments = (segments: string[]): void => {
  if (segments.some((segment) => !SAFE_PATH_SEGMENT.test(segment))) {
    throw new Error("Invalid commerce attachment path segment");
  }
};

export const createAdvisorAttachmentKey = (
  sessionId: string,
  attachmentId: string,
  contentType: string
): string => {
  const extension = getCommerceImageExtension(contentType);
  assertCommercePathSegments([sessionId, attachmentId]);
  return `sessions/${sessionId}/attachments/${attachmentId}.${extension}`;
};

export const isAdvisorAttachmentKey = (
  key: string,
  sessionId: string,
  attachmentId: string
): boolean => {
  try {
    assertCommercePathSegments([sessionId, attachmentId]);
  } catch {
    return false;
  }
  const prefix = `sessions/${sessionId}/attachments/${attachmentId}.`;
  return key.startsWith(prefix) && /(?:jpg|png|webp)$/iu.test(key);
};

export const createCheckoutAttachmentKey = (
  checkoutKey: string,
  userId: string,
  listingId: string,
  contentType: string,
  objectId: string = crypto.randomUUID()
): string => {
  const extension = getCommerceImageExtension(contentType);
  assertCommercePathSegments([checkoutKey, userId, listingId, objectId]);
  return `checkouts/${userId}/${checkoutKey}/${listingId}/${objectId}.${extension}`;
};

export const isCheckoutAttachmentKey = (
  key: string,
  checkoutKey: string,
  userId: string,
  listingId: string
): boolean => {
  try {
    assertCommercePathSegments([checkoutKey, userId, listingId]);
  } catch {
    return false;
  }
  const prefix = `checkouts/${userId}/${checkoutKey}/${listingId}/`;
  return new RegExp(
    `^${prefix.replaceAll("/", "\\/")}[a-f0-9-]{36}\\.(?:jpg|png|webp)$`,
    "iu"
  ).test(key);
};

export const createDeliveryAttachmentKey = (
  orderItemId: string,
  sellerId: string,
  contentType: string,
  objectId = crypto.randomUUID()
): string => {
  const extension = getCommerceImageExtension(contentType);
  assertCommercePathSegments([orderItemId, sellerId, objectId]);
  return `orders/${orderItemId}/delivery/${sellerId}/${objectId}.${extension}`;
};

export const isDeliveryAttachmentKey = (
  key: string,
  orderItemId: string,
  sellerId: string
): boolean => {
  try {
    assertCommercePathSegments([orderItemId, sellerId]);
  } catch {
    return false;
  }
  const prefix = `orders/${orderItemId}/delivery/${sellerId}/`;
  return new RegExp(
    `^${prefix.replaceAll("/", "\\/")}[a-f0-9-]{36}\\.(?:jpg|png|webp)$`,
    "iu"
  ).test(key);
};

export const createPublicMediaUrl = (
  supabaseUrl: string,
  key: string
): string => {
  const url = new URL(supabaseUrl);
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  url.pathname = `/storage/v1/object/public/${PUBLIC_MEDIA_BUCKET}/${encodedKey}`;
  return url.toString();
};

const getManagedPublicMediaKey = (
  value: string,
  supabaseUrl: string
): string | null => {
  let url: URL;
  let expectedUrl: URL;

  try {
    url = new URL(value);
    expectedUrl = new URL(supabaseUrl);
  } catch {
    return null;
  }

  const bucketPrefix = `/storage/v1/object/public/${PUBLIC_MEDIA_BUCKET}/`;
  if (
    url.origin !== expectedUrl.origin ||
    url.search ||
    url.hash ||
    !url.pathname.startsWith(bucketPrefix)
  ) {
    return null;
  }

  let key: string;
  try {
    key = decodeURIComponent(url.pathname.slice(bucketPrefix.length));
  } catch {
    return null;
  }

  return MANAGED_LISTING_IMAGE_KEY.test(key) ? key : null;
};

interface ListingImageReferences {
  nextImages?: string[] | null;
  nextThumbnailUrl?: string | null;
  previousImages?: string[] | null;
  previousThumbnailUrl?: string | null;
}

export const getManagedListingImageKeysToDelete = (
  references: ListingImageReferences,
  options: { supabaseUrl: string }
): string[] => {
  const previousReferences = [
    references.previousThumbnailUrl,
    ...(references.previousImages ?? []),
  ].filter((value): value is string => Boolean(value));
  const nextReferences = [
    references.nextThumbnailUrl,
    ...(references.nextImages ?? []),
  ].filter((value): value is string => Boolean(value));
  const nextKeys = new Set(
    nextReferences
      .map((value) => getManagedPublicMediaKey(value, options.supabaseUrl))
      .filter((value): value is string => value !== null)
  );

  return [
    ...new Set(
      previousReferences
        .map((value) => getManagedPublicMediaKey(value, options.supabaseUrl))
        .filter((value): value is string => value !== null)
    ),
  ].filter((key) => !nextKeys.has(key));
};
