import { describe, expect, it } from "vitest";

import { listingRouter } from "./router";

describe("listing router interface", () => {
  it("exposes discovery, governance, workspace, and admin moderation under the Listing aggregate", () => {
    expect(Object.keys(listingRouter).toSorted()).toEqual([
      "adminModeration",
      "categoryGovernance",
      "discovery",
      "sellerWorkspace",
    ]);
    expect(Object.keys(listingRouter.discovery).toSorted()).toEqual([
      "categories",
      "categoryBySlug",
      "listingById",
      "listings",
    ]);
    expect(Object.keys(listingRouter.categoryGovernance).toSorted()).toEqual([
      "archive",
      "createParent",
      "createSub",
      "delete",
      "list",
      "reorderParents",
      "reorderSubs",
      "updateParent",
      "updateStatus",
      "updateSub",
    ]);
    expect(Object.keys(listingRouter.sellerWorkspace).toSorted()).toEqual([
      "archive",
      "createDraft",
      "deleteDraft",
      "discardImageUploads",
      "get",
      "getDraft",
      "getMediaAccess",
      "listMine",
      "pause",
      "publish",
      "resume",
      "servicePackages",
      "updateDraft",
    ]);
    expect(Object.keys(listingRouter.adminModeration).toSorted()).toEqual([
      "archive",
      "auditLog",
      "hide",
      "list",
      "restore",
    ]);
  });
});
