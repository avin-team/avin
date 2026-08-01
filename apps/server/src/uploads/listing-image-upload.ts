import {
  assertEligibleSeller,
  canUploadListingImage,
} from "@avin/api/listing/seller-workspace";
import {
  createListingImageKey,
  LISTING_IMAGE_CONTENT_TYPES,
  LISTING_IMAGE_MAX_BYTES,
  LISTING_IMAGE_UPLOAD_ROUTE,
  PUBLIC_MEDIA_BUCKET,
} from "@avin/api/storage";
import { auth } from "@avin/auth";
import { db } from "@avin/db";
import { handleRequest, RejectUpload, route } from "@better-upload/server";
import type { Router } from "@better-upload/server";
import { z } from "zod";

const listingImageClientMetadataSchema = z.object({
  listingId: z.uuid(),
});

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
  },
});

export const handleListingImageUpload = (
  request: Request,
  router: Router
): Promise<Response> => handleRequest(request, router);
