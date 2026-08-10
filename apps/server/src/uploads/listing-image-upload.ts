import {
  assertEligibleSeller,
  canUploadListingImage,
} from "@avin/api/listing/seller-workspace";
import {
  createListingImageKey,
  createCheckoutAttachmentKey,
  createDeliveryAttachmentKey,
  createOrderChatAttachmentKey,
  createDisputeEvidenceKey,
  createSellerBannerKey,
  createSellerLogoKey,
  LISTING_IMAGE_CONTENT_TYPES,
  LISTING_IMAGE_MAX_COUNT,
  LISTING_IMAGE_MAX_BYTES,
  LISTING_IMAGE_UPLOAD_ROUTE,
  ORDER_CHAT_ATTACHMENT_MAX_BYTES,
  ORDER_CHAT_ATTACHMENT_MAX_COUNT,
  ORDER_CHAT_ATTACHMENT_CONTENT_TYPES,
  ORDER_CHAT_ATTACHMENT_UPLOAD_ROUTE,
  ORDER_FILES_BUCKET,
  DISPUTE_EVIDENCE_CONTENT_TYPES,
  DISPUTE_EVIDENCE_MAX_BYTES,
  DISPUTE_EVIDENCE_MAX_COUNT,
  DISPUTE_EVIDENCE_UPLOAD_ROUTE,
  CHECKOUT_ATTACHMENT_UPLOAD_ROUTE,
  DELIVERY_ATTACHMENT_UPLOAD_ROUTE,
  COMMERCE_IMAGE_CONTENT_TYPES,
  COMMERCE_IMAGE_MAX_BYTES,
  COMMERCE_IMAGE_MAX_COUNT,
  PUBLIC_MEDIA_BUCKET,
  SELLER_BANNER_CONTENT_TYPES,
  SELLER_BANNER_MAX_BYTES,
  SELLER_BANNER_UPLOAD_ROUTE,
  SELLER_LOGO_CONTENT_TYPES,
  SELLER_LOGO_MAX_BYTES,
  SELLER_LOGO_UPLOAD_ROUTE,
} from "@avin/api/storage";
import { auth } from "@avin/auth";
import { db } from "@avin/db";
import { handleRequest, RejectUpload, route } from "@better-upload/server";
import type { Router } from "@better-upload/server";
import { z } from "zod";

const listingImageClientMetadataSchema = z.object({
  listingId: z.uuid(),
});

const sellerLogoClientMetadataSchema = z.object({});
const sellerBannerClientMetadataSchema = z.object({});
const orderChatAttachmentClientMetadataSchema = z.object({ orderId: z.uuid() });
const disputeEvidenceClientMetadataSchema = z.object({
  itemId: z.uuid(),
});
const checkoutAttachmentClientMetadataSchema = z.object({
  checkoutKey: z.uuid(),
  listingId: z.uuid(),
});
const deliveryAttachmentClientMetadataSchema = z.object({
  itemId: z.uuid(),
});

interface DisputeEvidenceUploadItem {
  deliveryReviewDeadlineAt: Date | null;
  processingDeadlineAt: Date;
  status: string;
  warrantyExpiresAt: Date | null;
  dispute: {
    status: string;
    evidence: { id: string }[];
  } | null;
  order: {
    buyerId: string;
    sellerId: string;
  };
}

const canBuyerOpenDisputeEvidence = (
  item: DisputeEvidenceUploadItem,
  userId: string,
  now: Date
): boolean => {
  if (item.order.buyerId !== userId || item.dispute) {
    return false;
  }

  if (
    (item.status === "AWAITING_SELLER" || item.status === "IN_PROGRESS") &&
    now >= item.processingDeadlineAt
  ) {
    return true;
  }

  if (
    item.status === "DELIVERED" &&
    item.deliveryReviewDeadlineAt !== null &&
    now <= item.deliveryReviewDeadlineAt
  ) {
    return true;
  }

  return (
    item.status === "IN_WARRANTY" &&
    (item.warrantyExpiresAt === null || now < item.warrantyExpiresAt)
  );
};

const canSellerRespondToDispute = (
  item: DisputeEvidenceUploadItem,
  userId: string
): boolean =>
  item.order.sellerId === userId &&
  item.status === "DISPUTED" &&
  item.dispute?.status === "OPEN";

const assertDisputeEvidenceFileTypes = (files: { type: string }[]): void => {
  for (const file of files) {
    if (
      !DISPUTE_EVIDENCE_CONTENT_TYPES.includes(
        file.type as (typeof DISPUTE_EVIDENCE_CONTENT_TYPES)[number]
      )
    ) {
      throw new RejectUpload(
        "Bằng chứng chỉ hỗ trợ PDF, TXT, JPEG, PNG hoặc WebP"
      );
    }
  }
};

const assertCommerceImageFileTypes = (files: { type: string }[]): void => {
  for (const file of files) {
    if (
      !COMMERCE_IMAGE_CONTENT_TYPES.includes(
        file.type as (typeof COMMERCE_IMAGE_CONTENT_TYPES)[number]
      )
    ) {
      throw new RejectUpload("Ảnh chỉ hỗ trợ JPEG, PNG hoặc WebP");
    }
  }
};

export const createListingImageUploadRouter = (
  client: Router["client"]
): Router => ({
  bucketName: PUBLIC_MEDIA_BUCKET,
  client,
  routes: {
    [LISTING_IMAGE_UPLOAD_ROUTE]: route({
      clientMetadataSchema: listingImageClientMetadataSchema,
      fileTypes: [...LISTING_IMAGE_CONTENT_TYPES],
      maxFileSize: LISTING_IMAGE_MAX_BYTES,
      maxFiles: LISTING_IMAGE_MAX_COUNT,
      multipleFiles: true,
      onBeforeUpload: async ({ clientMetadata, files, req }) => {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
          throw new RejectUpload("Sign in before uploading a listing image");
        }

        try {
          await assertEligibleSeller(session.user.id);
        } catch {
          throw new RejectUpload(
            "Only eligible sellers can upload listing images"
          );
        }

        const found = await db.query.listing.findFirst({
          columns: { sellerId: true, status: true },
          where: (table, { eq }) => eq(table.id, clientMetadata.listingId),
        });

        if (!found || !canUploadListingImage(session.user.id, found)) {
          throw new RejectUpload(
            "You can only upload images for your own active listing"
          );
        }

        for (const file of files) {
          if (
            !LISTING_IMAGE_CONTENT_TYPES.includes(
              file.type as (typeof LISTING_IMAGE_CONTENT_TYPES)[number]
            )
          ) {
            throw new RejectUpload(
              "Listing images must be JPEG, PNG, or WebP files"
            );
          }
        }

        return {
          generateObjectInfo: ({ file }) => ({
            cacheControl: "public, max-age=31536000, immutable",
            key: createListingImageKey(clientMetadata.listingId, file.type),
          }),
        };
      },
    }),
    [SELLER_LOGO_UPLOAD_ROUTE]: route({
      clientMetadataSchema: sellerLogoClientMetadataSchema,
      fileTypes: [...SELLER_LOGO_CONTENT_TYPES],
      maxFileSize: SELLER_LOGO_MAX_BYTES,
      multipleFiles: false,
      onBeforeUpload: async ({ file, req }) => {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
          throw new RejectUpload("Sign in before uploading a seller logo");
        }

        if (
          !SELLER_LOGO_CONTENT_TYPES.includes(
            file.type as (typeof SELLER_LOGO_CONTENT_TYPES)[number]
          )
        ) {
          throw new RejectUpload(
            "Seller logos must be JPEG, PNG, or WebP files"
          );
        }

        return {
          objectInfo: {
            cacheControl: "public, max-age=31536000, immutable",
            key: createSellerLogoKey(session.user.id, file.type),
          },
        };
      },
    }),
    [SELLER_BANNER_UPLOAD_ROUTE]: route({
      clientMetadataSchema: sellerBannerClientMetadataSchema,
      fileTypes: [...SELLER_BANNER_CONTENT_TYPES],
      maxFileSize: SELLER_BANNER_MAX_BYTES,
      multipleFiles: false,
      onBeforeUpload: async ({ file, req }) => {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
          throw new RejectUpload("Sign in before uploading a seller banner");
        }

        if (
          !SELLER_BANNER_CONTENT_TYPES.includes(
            file.type as (typeof SELLER_BANNER_CONTENT_TYPES)[number]
          )
        ) {
          throw new RejectUpload(
            "Seller banners must be JPEG, PNG, or WebP files"
          );
        }

        return {
          objectInfo: {
            cacheControl: "public, max-age=31536000, immutable",
            key: createSellerBannerKey(session.user.id, file.type),
          },
        };
      },
    }),
  },
});

export const createOrderChatAttachmentUploadRouter = (
  client: Router["client"]
): Router => ({
  bucketName: ORDER_FILES_BUCKET,
  client,
  routes: {
    [ORDER_CHAT_ATTACHMENT_UPLOAD_ROUTE]: route({
      clientMetadataSchema: orderChatAttachmentClientMetadataSchema,
      fileTypes: [...ORDER_CHAT_ATTACHMENT_CONTENT_TYPES],
      maxFileSize: ORDER_CHAT_ATTACHMENT_MAX_BYTES,
      maxFiles: ORDER_CHAT_ATTACHMENT_MAX_COUNT,
      multipleFiles: true,
      onBeforeUpload: async ({ clientMetadata, req }) => {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
          throw new RejectUpload(
            "Sign in before uploading an order attachment"
          );
        }

        const found = await db.query.order.findFirst({
          columns: { buyerId: true, sellerId: true },
          where: (table, { eq }) => eq(table.id, clientMetadata.orderId),
        });

        if (
          !found ||
          (found.buyerId !== session.user.id &&
            found.sellerId !== session.user.id)
        ) {
          throw new RejectUpload(
            "Only order participants can upload chat attachments"
          );
        }

        return {
          generateObjectInfo: () => ({
            cacheControl: "private, max-age=0",
            key: createOrderChatAttachmentKey(
              clientMetadata.orderId,
              session.user.id
            ),
          }),
        };
      },
    }),
  },
});

export const createDisputeEvidenceUploadRouter = (
  client: Router["client"]
): Router => ({
  bucketName: ORDER_FILES_BUCKET,
  client,
  routes: {
    [DISPUTE_EVIDENCE_UPLOAD_ROUTE]: route({
      clientMetadataSchema: disputeEvidenceClientMetadataSchema,
      fileTypes: [...DISPUTE_EVIDENCE_CONTENT_TYPES],
      maxFileSize: DISPUTE_EVIDENCE_MAX_BYTES,
      maxFiles: DISPUTE_EVIDENCE_MAX_COUNT,
      multipleFiles: true,
      onBeforeUpload: async ({ clientMetadata, files, req }) => {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
          throw new RejectUpload("Sign in before uploading dispute evidence");
        }

        const item = await db.query.orderItem.findFirst({
          columns: {
            deliveryReviewDeadlineAt: true,
            processingDeadlineAt: true,
            status: true,
            warrantyExpiresAt: true,
          },
          where: (table, { eq }) => eq(table.id, clientMetadata.itemId),
          with: {
            dispute: {
              columns: {
                id: true,
                responseDeadlineAt: true,
                status: true,
              },
              with: {
                evidence: {
                  columns: { id: true },
                },
              },
            },
            order: {
              columns: { buyerId: true, sellerId: true },
            },
          },
        });

        if (!item) {
          throw new RejectUpload("OrderItem không tồn tại");
        }

        const now = new Date();
        const isBuyerOpening = canBuyerOpenDisputeEvidence(
          item,
          session.user.id,
          now
        );
        const isSellerResponding = canSellerRespondToDispute(
          item,
          session.user.id
        );
        if (!isBuyerOpening && !isSellerResponding) {
          throw new RejectUpload(
            "Bạn không có quyền tải bằng chứng cho OrderItem này"
          );
        }

        const existingEvidenceCount = item.dispute?.evidence.length ?? 0;
        if (
          isSellerResponding &&
          existingEvidenceCount + files.length > DISPUTE_EVIDENCE_MAX_COUNT
        ) {
          throw new RejectUpload(
            `Mỗi Dispute tối đa ${DISPUTE_EVIDENCE_MAX_COUNT} tệp bằng chứng.`
          );
        }

        assertDisputeEvidenceFileTypes(files);

        return {
          generateObjectInfo: ({ file }) => ({
            cacheControl: "private, max-age=0",
            key: createDisputeEvidenceKey(
              clientMetadata.itemId,
              session.user.id,
              file.type
            ),
          }),
        };
      },
    }),
  },
});

export const createCheckoutAttachmentUploadRouter = (
  client: Router["client"]
): Router => ({
  bucketName: ORDER_FILES_BUCKET,
  client,
  routes: {
    [CHECKOUT_ATTACHMENT_UPLOAD_ROUTE]: route({
      clientMetadataSchema: checkoutAttachmentClientMetadataSchema,
      fileTypes: [...COMMERCE_IMAGE_CONTENT_TYPES],
      maxFileSize: COMMERCE_IMAGE_MAX_BYTES,
      maxFiles: COMMERCE_IMAGE_MAX_COUNT,
      multipleFiles: true,
      onBeforeUpload: async ({ clientMetadata, files, req }) => {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
          throw new RejectUpload("Chưa đăng nhập để tải ảnh đính kèm");
        }

        const userCart = await db.query.cart.findFirst({
          columns: { id: true },
          where: (table, { eq }) => eq(table.userId, session.user.id),
        });
        if (!userCart) {
          throw new RejectUpload("Không tìm thấy giỏ hàng của bạn");
        }

        const cartEntry = await db.query.cartItem.findFirst({
          columns: { id: true },
          where: (table, { and, eq }) =>
            and(
              eq(table.cartId, userCart.id),
              eq(table.listingId, clientMetadata.listingId)
            ),
        });
        if (!cartEntry) {
          throw new RejectUpload("Listing không thuộc Cart của bạn");
        }

        const existingDrafts = await db.query.checkoutAttachmentDraft.findMany({
          columns: { id: true },
          where: (table, { and, eq }) =>
            and(
              eq(table.checkoutKey, clientMetadata.checkoutKey),
              eq(table.listingId, clientMetadata.listingId),
              eq(table.userId, session.user.id)
            ),
        });
        if (existingDrafts.length + files.length > COMMERCE_IMAGE_MAX_COUNT) {
          throw new RejectUpload(
            `Mỗi Listing chỉ được đính kèm tối đa ${COMMERCE_IMAGE_MAX_COUNT} ảnh`
          );
        }

        assertCommerceImageFileTypes(files);
        return {
          generateObjectInfo: ({ file }) => ({
            cacheControl: "private, max-age=0",
            key: createCheckoutAttachmentKey(
              clientMetadata.checkoutKey,
              session.user.id,
              clientMetadata.listingId,
              file.type
            ),
          }),
        };
      },
    }),
  },
});

export const createDeliveryAttachmentUploadRouter = (
  client: Router["client"]
): Router => ({
  bucketName: ORDER_FILES_BUCKET,
  client,
  routes: {
    [DELIVERY_ATTACHMENT_UPLOAD_ROUTE]: route({
      clientMetadataSchema: deliveryAttachmentClientMetadataSchema,
      fileTypes: [...COMMERCE_IMAGE_CONTENT_TYPES],
      maxFileSize: COMMERCE_IMAGE_MAX_BYTES,
      maxFiles: COMMERCE_IMAGE_MAX_COUNT,
      multipleFiles: true,
      onBeforeUpload: async ({ clientMetadata, files, req }) => {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session || session.user.role !== "SELLER") {
          throw new RejectUpload("Chỉ Seller mới có thể tải ảnh bàn giao");
        }

        const item = await db.query.orderItem.findFirst({
          columns: { status: true },
          where: (table, { eq }) => eq(table.id, clientMetadata.itemId),
          with: { order: { columns: { sellerId: true } } },
        });
        if (
          !item ||
          item.order.sellerId !== session.user.id ||
          item.status !== "IN_PROGRESS"
        ) {
          throw new RejectUpload(
            "Bạn chỉ có thể tải ảnh khi đang xử lý OrderItem của mình"
          );
        }

        const existingDrafts = await db.query.orderFile.findMany({
          columns: { id: true },
          where: (table, { and, eq, isNull, like }) =>
            and(
              eq(table.orderItemId, clientMetadata.itemId),
              eq(table.uploadedByUserId, session.user.id),
              isNull(table.deliverySubmissionId),
              isNull(table.orderMessageId),
              like(
                table.storageKey,
                `orders/${clientMetadata.itemId}/delivery/%`
              )
            ),
        });
        if (existingDrafts.length + files.length > COMMERCE_IMAGE_MAX_COUNT) {
          throw new RejectUpload(
            `Mỗi lần bàn giao chỉ được đính kèm tối đa ${COMMERCE_IMAGE_MAX_COUNT} ảnh`
          );
        }

        assertCommerceImageFileTypes(files);
        return {
          generateObjectInfo: ({ file }) => ({
            cacheControl: "private, max-age=0",
            key: createDeliveryAttachmentKey(
              clientMetadata.itemId,
              session.user.id,
              file.type
            ),
          }),
        };
      },
    }),
  },
});

export const handleUploadRequest = (
  request: Request,
  router: Router
): Promise<Response> => handleRequest(request, router);
