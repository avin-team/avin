import { describe, expect, it } from "vitest";

import {
  createListingImageKey,
  createSellerLogoKey,
  createPublicMediaUrl,
  getManagedListingImageKeysToDelete,
  PUBLIC_MEDIA_BUCKET,
} from "./storage";

const SUPABASE_URL = "https://example.supabase.co";
const LISTING_ID = "11111111-1111-4111-8111-111111111111";
const SELLER_ID = "seller_123";
const OLD_OBJECT_ID = "22222222-2222-4222-8222-222222222222";
const NEW_OBJECT_ID = "33333333-3333-4333-8333-333333333333";

describe("listing image storage helpers", () => {
  it("creates a managed key from the listing and MIME type", () => {
    expect(createListingImageKey(LISTING_ID, "image/jpeg", OLD_OBJECT_ID)).toBe(
      `listings/${LISTING_ID}/thumbnail/${OLD_OBJECT_ID}.jpg`
    );
  });

  it("rejects MIME types outside the listing image allowlist", () => {
    expect(() =>
      createListingImageKey(LISTING_ID, "image/gif", OLD_OBJECT_ID)
    ).toThrow("Unsupported listing image type");
  });

  it("builds the public URL for an uploaded object", () => {
    const key = createListingImageKey(LISTING_ID, "image/webp", NEW_OBJECT_ID);

    expect(createPublicMediaUrl(SUPABASE_URL, key)).toBe(
      `${SUPABASE_URL}/storage/v1/object/public/${PUBLIC_MEDIA_BUCKET}/${key}`
    );
  });

  it("returns only replaced managed objects and ignores external URLs", () => {
    const oldUrl = createPublicMediaUrl(
      SUPABASE_URL,
      createListingImageKey(LISTING_ID, "image/png", OLD_OBJECT_ID)
    );
    const newUrl = createPublicMediaUrl(
      SUPABASE_URL,
      createListingImageKey(LISTING_ID, "image/png", NEW_OBJECT_ID)
    );

    expect(
      getManagedListingImageKeysToDelete(
        {
          nextImages: [newUrl],
          nextThumbnailUrl: newUrl,
          previousImages: [oldUrl, "https://cdn.example.com/external.png"],
          previousThumbnailUrl: oldUrl,
        },
        { supabaseUrl: SUPABASE_URL }
      )
    ).toEqual([`listings/${LISTING_ID}/thumbnail/${OLD_OBJECT_ID}.png`]);
  });

  it("keeps a managed object when the next listing still references it", () => {
    const oldUrl = createPublicMediaUrl(
      SUPABASE_URL,
      createListingImageKey(LISTING_ID, "image/jpeg", OLD_OBJECT_ID)
    );

    expect(
      getManagedListingImageKeysToDelete(
        {
          nextImages: [oldUrl],
          nextThumbnailUrl: oldUrl,
          previousImages: [oldUrl],
          previousThumbnailUrl: oldUrl,
        },
        { supabaseUrl: SUPABASE_URL }
      )
    ).toEqual([]);
  });
});

describe("seller logo storage helpers", () => {
  it("creates a managed key from the seller and MIME type", () => {
    expect(createSellerLogoKey(SELLER_ID, "image/png", OLD_OBJECT_ID)).toBe(
      `sellers/${SELLER_ID}/logo/${OLD_OBJECT_ID}.png`
    );
  });

  it("rejects MIME types outside the seller logo allowlist", () => {
    expect(() =>
      createSellerLogoKey(SELLER_ID, "image/gif", OLD_OBJECT_ID)
    ).toThrow("Unsupported seller logo type");
  });

  it("builds a public URL for a seller logo", () => {
    const key = createSellerLogoKey(SELLER_ID, "image/webp", NEW_OBJECT_ID);

    expect(createPublicMediaUrl(SUPABASE_URL, key)).toBe(
      `${SUPABASE_URL}/storage/v1/object/public/${PUBLIC_MEDIA_BUCKET}/${key}`
    );
  });
});
