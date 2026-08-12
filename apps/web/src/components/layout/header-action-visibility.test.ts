import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { describe, expect, it } from "vitest";

import { getHeaderActionVisibility } from "@/components/layout/header-action-visibility";

describe("getHeaderActionVisibility", () => {
  it("hides chat and store actions for a seller without a profile", () => {
    expect(
      getHeaderActionVisibility(ACCOUNT_ROLE.SELLER, false, false)
    ).toEqual({
      showChat: false,
      showSellerStore: false,
    });
  });

  it("hides chat and store actions while the seller awaits approval", () => {
    expect(getHeaderActionVisibility(ACCOUNT_ROLE.SELLER, true, false)).toEqual(
      {
        showChat: false,
        showSellerStore: false,
      }
    );
  });

  it("shows chat and store actions for an approved seller with a profile", () => {
    expect(getHeaderActionVisibility(ACCOUNT_ROLE.SELLER, true, true)).toEqual({
      showChat: true,
      showSellerStore: true,
    });
  });

  it("keeps chat available to buyers", () => {
    expect(getHeaderActionVisibility(ACCOUNT_ROLE.BUYER, false, false)).toEqual(
      {
        showChat: true,
        showSellerStore: false,
      }
    );
  });
});
