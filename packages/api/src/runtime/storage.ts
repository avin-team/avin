export const PUBLIC_MEDIA_BUCKET = "public-media";

export const LISTING_IMAGE_UPLOAD_ROUTE = "listing-image";
export const SELLER_LOGO_UPLOAD_ROUTE = "seller-logo";
export const SELLER_BANNER_UPLOAD_ROUTE = "seller-banner";

export interface ManagedObjectStore {
  deleteObject: (key: string) => Promise<void>;
  supabaseUrl: string;
}

export const LISTING_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const LISTING_IMAGE_MAX_COUNT = 6;
export const LISTING_IMAGE_MIN_HEIGHT = 600;
export const LISTING_IMAGE_MIN_WIDTH = 800;

export const LISTING_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const SELLER_LOGO_MAX_BYTES = LISTING_IMAGE_MAX_BYTES;
export const SELLER_LOGO_CONTENT_TYPES = LISTING_IMAGE_CONTENT_TYPES;
export const SELLER_BANNER_MAX_BYTES = LISTING_IMAGE_MAX_BYTES;
export const SELLER_BANNER_CONTENT_TYPES = LISTING_IMAGE_CONTENT_TYPES;

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
