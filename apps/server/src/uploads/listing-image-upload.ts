import {
  assertEligibleSeller,
  canUploadListingImage,
} from "@avin/api/listing/seller-workspace";
import {
  createListingImageKey,
  createSellerBannerKey,
  createSellerLogoKey,
  LISTING_IMAGE_CONTENT_TYPES,
  LISTING_IMAGE_MAX_BYTES,
  LISTING_IMAGE_UPLOAD_ROUTE,
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
      multipleFiles: false,
      onBeforeUpload: async ({ clientMetadata, file, req }) => {
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

        if (
          !LISTING_IMAGE_CONTENT_TYPES.includes(
            file.type as (typeof LISTING_IMAGE_CONTENT_TYPES)[number]
          )
        ) {
          throw new RejectUpload(
            "Listing images must be JPEG, PNG, or WebP files"
          );
        }

        return {
          objectInfo: {
            cacheControl: "public, max-age=31536000, immutable",
            key: createListingImageKey(clientMetadata.listingId, file.type),
          },
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

export const handleListingImageUpload = (
  request: Request,
  router: Router
): Promise<Response> => handleRequest(request, router);
