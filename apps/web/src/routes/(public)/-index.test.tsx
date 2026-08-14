import { beforeEach, describe, expect, it, vi } from "vitest";

import { Route } from "@/routes/(public)/index";

const { redirectMobileGuest } = vi.hoisted(() => ({
  redirectMobileGuest: vi.fn(),
}));

vi.mock("@/features/auth/guards/redirect-mobile-guest", () => ({
  redirectMobileGuest,
}));

const runBeforeLoad = () => Route.options.beforeLoad?.({} as never);

describe("home route", () => {
  beforeEach(() => {
    redirectMobileGuest.mockReset();
  });

  it("checks mobile guest access before redirecting to categories", async () => {
    redirectMobileGuest.mockReturnValue(Promise.resolve());

    await expect(runBeforeLoad()).rejects.toMatchObject({
      options: {
        to: "/category",
      },
    });
    expect(redirectMobileGuest).toHaveBeenCalledOnce();
  });
});
