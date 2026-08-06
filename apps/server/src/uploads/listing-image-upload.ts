import {
  assertEligibleSeller,
  canUploadListingImage,
} from "@avin/api/listing/seller-workspace";
import {
  createListingImageKey,
  createOrderChatAttachmentKey,
  createSellerBannerKey,
  createSellerLogoKey,
  LISTING_IMAGE_CONTENT_TYPES,
  LISTING_IMAGE_MAX_COUNT,
  LISTING_IMAGE_MAX_BYTES,
  LISTING_IMAGE_UPLOAD_ROUTE,
  ORDER_CHAT_ATTACHMENT_MAX_BYTES,
  ORDER_CHAT_ATTACHMENT_MAX_COUNT,
  ORDER_CHAT_ATTACHMENT_UPLOAD_ROUTE,
  ORDER_FILES_BUCKET,
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

const ORDER_CHAT_ATTACHMENT_CONTENT_TYPES = [
  "application/pdf",
  "application/zip",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
] as const;

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

export const handleListingImageUpload = (
  request: Request,
  router: Router
): Promise<Response> => handleRequest(request, router);
