import {
  LISTING_IMAGE_CONTENT_TYPES,
  LISTING_IMAGE_MAX_COUNT,
  LISTING_IMAGE_UPLOAD_ROUTE,
} from "@avin/api/storage";
import { custom } from "@better-upload/server/clients";
import { describe, expect, it, vi } from "vitest";

import { createListingImageUploadRouter } from "./listing-image-upload";

const { assertEligibleSeller, canUploadListingImage, findListing, getSession } =
  vi.hoisted(() => ({
    assertEligibleSeller: vi.fn(),
    canUploadListingImage: vi.fn(),
    findListing: vi.fn(),
    getSession: vi.fn(),
  }));

vi.mock("@avin/auth", () => ({
  auth: { api: { getSession } },
}));

vi.mock("@avin/db", () => ({
  db: { query: { listing: { findFirst: findListing } } },
}));

vi.mock("@avin/api/listing/seller-workspace", () => ({
  assertEligibleSeller,
  canUploadListingImage,
}));

const getListingImageRoute = () => {
  const routeFactory = createListingImageUploadRouter(
    custom({
      accessKeyId: "test",
      host: "localhost",
      region: "test",
      secretAccessKey: "test",
      secure: false,
    })
  ).routes[LISTING_IMAGE_UPLOAD_ROUTE];
  if (!routeFactory) {
    throw new Error("Listing image upload route is not configured");
  }
  return routeFactory();
};

describe("listing image upload route", () => {
  it("accepts a batch and creates a unique object key for each image", async () => {
    getSession.mockResolvedValue({ user: { id: "seller-1" } });
    findListing.mockResolvedValue({ sellerId: "seller-1", status: "DRAFT" });
    canUploadListingImage.mockReturnValue(true);
    const route = getListingImageRoute();
    const files = [
      { name: "one.png", size: 100, type: "image/png" },
      { name: "two.webp", size: 100, type: "image/webp" },
    ];
    const [firstFile, secondFile] = files;
    if (!firstFile || !secondFile) {
      throw new Error("Test files are missing");
    }

    const result = await route.onBeforeUpload?.({
      clientMetadata: { listingId: "listing-1" },
      files,
      req: new Request("http://localhost/api/upload"),
    });

    expect(route.maxFiles).toBe(LISTING_IMAGE_MAX_COUNT);
    expect(route.fileTypes).toEqual([...LISTING_IMAGE_CONTENT_TYPES]);
    expect(result?.generateObjectInfo).toBeDefined();

    const firstObject = await result?.generateObjectInfo?.({ file: firstFile });
    const secondObject = await result?.generateObjectInfo?.({
      file: secondFile,
    });
    expect(firstObject?.key).toMatch(
      /^listings\/listing-1\/thumbnail\/[a-f0-9-]{36}\.png$/u
    );
    expect(secondObject?.key).toMatch(
      /^listings\/listing-1\/thumbnail\/[a-f0-9-]{36}\.webp$/u
    );
    expect(firstObject?.key).not.toBe(secondObject?.key);
  });

  it("rejects a batch containing an unsupported image type", async () => {
    getSession.mockResolvedValue({ user: { id: "seller-1" } });
    findListing.mockResolvedValue({ sellerId: "seller-1", status: "DRAFT" });
    canUploadListingImage.mockReturnValue(true);
    const route = getListingImageRoute();

    await expect(
      route.onBeforeUpload?.({
        clientMetadata: { listingId: "listing-1" },
        files: [{ name: "one.gif", size: 100, type: "image/gif" }],
        req: new Request("http://localhost/api/upload"),
      })
    ).rejects.toThrow("Listing images must be JPEG, PNG, or WebP files");
  });
});
