import { describe, expect, it } from "vitest";

import { listingRouter } from "./router";

describe("listing router interface", () => {
  it("exposes discovery and governance under the Listing aggregate", () => {
    expect(Object.keys(listingRouter).toSorted()).toEqual([
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
      "getDraft",
      "listMine",
      "pause",
      "publish",
      "resume",
      "updateDraft",
    ]);
  });
});
