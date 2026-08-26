export const PUBLIC_MEDIA_BUCKET = "public-media";
export const ORDER_FILES_BUCKET = "order-files";
export const PROTECTION_RISK_ORIGINALS_BUCKET = ORDER_FILES_BUCKET;
export const PROTECTION_RISK_PUBLIC_BUCKET = PUBLIC_MEDIA_BUCKET;

export const LISTING_IMAGE_UPLOAD_ROUTE = "listing-image";
export const SELLER_LOGO_UPLOAD_ROUTE = "seller-logo";
export const SELLER_BANNER_UPLOAD_ROUTE = "seller-banner";
export const ORDER_CHAT_ATTACHMENT_UPLOAD_ROUTE = "order-chat-attachment";
export const DISPUTE_EVIDENCE_UPLOAD_ROUTE = "dispute-evidence";
export const SELLER_ENFORCEMENT_APPEAL_EVIDENCE_UPLOAD_ROUTE =
  "seller-enforcement-appeal-evidence";
export const CHECKOUT_ATTACHMENT_UPLOAD_ROUTE = "checkout-attachment";
export const DELIVERY_ATTACHMENT_UPLOAD_ROUTE = "delivery-attachment";
export const RISK_REPORT_EVIDENCE_UPLOAD_ROUTE = "risk-report-evidence";
export const RISK_REPORT_DERIVATIVE_UPLOAD_ROUTE = "risk-report-derivative";
export const PROVIDER_RISK_INCIDENT_EVIDENCE_UPLOAD_ROUTE =
  "provider-risk-incident-evidence";
export const PROVIDER_AVATAR_UPLOAD_ROUTE = "provider-avatar";

export interface ManagedObjectStore {
  deleteObject: (key: string, bucket?: string) => Promise<void>;
  putObject?: (input: {
    body: Uint8Array;
    bucket: string;
    cacheControl?: string;
    contentLength: number;
    contentType: string;
    key: string;
  }) => Promise<void>;
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
export const PROVIDER_AVATAR_MAX_BYTES = SELLER_BRANDING_MAX_BYTES;
export const PROVIDER_AVATAR_CONTENT_TYPES = LISTING_IMAGE_CONTENT_TYPES;

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

export const RISK_REPORT_EVIDENCE_MAX_BYTES = 20 * 1024 * 1024;
export const RISK_REPORT_EVIDENCE_MAX_COUNT = 10;
export const RISK_REPORT_EVIDENCE_MAX_VIDEO_COUNT = 2;
export const RISK_REPORT_EVIDENCE_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "video/mp4",
  "video/webm",
] as const;

/** Native Avin Check reports accept these evidence types; plain-text files remain
 * supported only by legacy/provider evidence flows. */
export const RISK_REPORT_NATIVE_EVIDENCE_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
] as const;
export const RISK_REPORT_EVIDENCE_MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export const isNativeRiskReportEvidenceContentType = (
  contentType: string
): contentType is (typeof RISK_REPORT_NATIVE_EVIDENCE_CONTENT_TYPES)[number] =>
  RISK_REPORT_NATIVE_EVIDENCE_CONTENT_TYPES.includes(
    contentType as (typeof RISK_REPORT_NATIVE_EVIDENCE_CONTENT_TYPES)[number]
  );

export const getNativeRiskReportEvidenceMaxBytes = (
  contentType: string
): number =>
  contentType === "video/mp4" || contentType === "video/webm"
    ? RISK_REPORT_EVIDENCE_MAX_VIDEO_BYTES
    : RISK_REPORT_EVIDENCE_MAX_BYTES;

export const SELLER_ENFORCEMENT_APPEAL_EVIDENCE_MAX_BYTES =
  DISPUTE_EVIDENCE_MAX_BYTES;
export const SELLER_ENFORCEMENT_APPEAL_EVIDENCE_MAX_COUNT =
  DISPUTE_EVIDENCE_MAX_COUNT;
export const SELLER_ENFORCEMENT_APPEAL_EVIDENCE_CONTENT_TYPES =
  DISPUTE_EVIDENCE_CONTENT_TYPES;

export const COMMERCE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const COMMERCE_IMAGE_MAX_COUNT = 5;
export const COMMERCE_IMAGE_CONTENT_TYPES = LISTING_IMAGE_CONTENT_TYPES;

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

export const createProviderAvatarKey = (
  providerUserId: string,
  contentType: string,
  objectId = crypto.randomUUID()
): string => {
  const extension =
    LISTING_IMAGE_EXTENSIONS[contentType as ListingImageContentType];

  if (!extension) {
    throw new Error(`Unsupported provider avatar type: ${contentType}`);
  }

  if (
    !SAFE_PATH_SEGMENT.test(providerUserId) ||
    !SAFE_PATH_SEGMENT.test(objectId)
  ) {
    throw new Error("Invalid provider avatar path segment");
  }

  return `providers/${providerUserId}/avatar/${objectId}.${extension}`;
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

type RiskReportEvidenceContentType =
  (typeof RISK_REPORT_EVIDENCE_CONTENT_TYPES)[number];

const RISK_REPORT_EVIDENCE_EXTENSIONS: Record<
  RiskReportEvidenceContentType,
  string
> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "text/plain": "txt",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

const getRiskReportEvidenceExtension = (contentType: string): string => {
  const extension =
    RISK_REPORT_EVIDENCE_EXTENSIONS[
      contentType as RiskReportEvidenceContentType
    ];
  if (!extension) {
    throw new Error(`Unsupported risk report evidence type: ${contentType}`);
  }
  return extension;
};

export const isRiskReportEvidenceFileNameAllowed = (
  fileName: string,
  contentType: string
): boolean => {
  if (
    fileName.includes("/") ||
    fileName.includes("\\") ||
    [...fileName].some((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint !== undefined && codePoint < 0x20;
    })
  ) {
    return false;
  }
  try {
    return fileName
      .trim()
      .toLowerCase()
      .endsWith(`.${getRiskReportEvidenceExtension(contentType)}`);
  } catch {
    return false;
  }
};

export const isNativeRiskReportEvidenceFileNameAllowed = (
  fileName: string,
  contentType: string
): boolean =>
  isNativeRiskReportEvidenceContentType(contentType) &&
  isRiskReportEvidenceFileNameAllowed(fileName, contentType);

const assertRiskReportStorageSegments = (segments: string[]): void => {
  if (segments.some((segment) => !SAFE_PATH_SEGMENT.test(segment))) {
    throw new Error("Invalid risk report storage path segment");
  }
};

export const createRiskReportEvidenceKey = (
  reportId: string,
  contentType: string,
  objectId = crypto.randomUUID()
): string => {
  const extension = getRiskReportEvidenceExtension(contentType);
  assertRiskReportStorageSegments([reportId, objectId]);
  return `risk-reports/private/${reportId}/${objectId}.${extension}`;
};

export const isRiskReportEvidenceKey = (
  key: string,
  reportId: string
): boolean => {
  try {
    assertRiskReportStorageSegments([reportId]);
  } catch {
    return false;
  }
  const prefix = `risk-reports/private/${reportId}/`;
  return new RegExp(
    `^${prefix.replaceAll("/", "\\/")}[a-f0-9-]{36}\\.(?:pdf|jpg|png|webp|txt|mp4|webm)$`,
    "iu"
  ).test(key);
};

export const createProviderRiskIncidentEvidenceKey = (
  incidentId: string,
  providerUserId: string,
  contentType: string,
  objectId = crypto.randomUUID()
): string => {
  const extension = getRiskReportEvidenceExtension(contentType);
  assertRiskReportStorageSegments([incidentId, providerUserId, objectId]);
  return `risk-incidents/private/${incidentId}/${providerUserId}/${objectId}.${extension}`;
};

export const isProviderRiskIncidentEvidenceKey = (
  key: string,
  incidentId: string,
  providerUserId: string
): boolean => {
  try {
    assertRiskReportStorageSegments([incidentId, providerUserId]);
  } catch {
    return false;
  }
  const prefix = `risk-incidents/private/${incidentId}/${providerUserId}/`;
  return new RegExp(
    `^${prefix.replaceAll("/", "\\/")}[a-f0-9-]{36}\\.(?:pdf|jpg|png|webp|txt|mp4|webm)$`,
    "iu"
  ).test(key);
};

export const createRiskReportDerivativeKey = (
  reportId: string,
  evidenceId: string,
  contentType: string,
  objectId = crypto.randomUUID()
): string => {
  const extension = getRiskReportEvidenceExtension(contentType);
  assertRiskReportStorageSegments([reportId, evidenceId, objectId]);
  return `risk-reports/public/${reportId}/${evidenceId}/${objectId}.${extension}`;
};

export const isRiskReportDerivativeKey = (
  key: string,
  reportId: string,
  evidenceId: string
): boolean => {
  try {
    assertRiskReportStorageSegments([reportId, evidenceId]);
  } catch {
    return false;
  }
  const prefix = `risk-reports/public/${reportId}/${evidenceId}/`;
  return new RegExp(
    `^${prefix.replaceAll("/", "\\/")}[a-f0-9-]{36}\\.(?:pdf|jpg|png|webp|txt|mp4|webm)$`,
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

export const createCheckoutAttachmentKey = (
  checkoutKey: string,
  userId: string,
  listingId: string,
  contentType: string,
  objectId = crypto.randomUUID()
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
