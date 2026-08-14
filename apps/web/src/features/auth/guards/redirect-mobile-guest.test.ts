import { beforeEach, describe, expect, it, vi } from "vitest";

import { redirectMobileGuest } from "@/features/auth/guards/redirect-mobile-guest";

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("@/features/auth/api/auth-client", () => ({
  authClient: {
    getSession,
  },
}));

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
};

describe("redirectMobileGuest", () => {
  beforeEach(() => {
    getSession.mockReset();
    setViewportWidth(768);
  });

  it("does not fetch a session for desktop visitors", async () => {
    await expect(redirectMobileGuest()).resolves.toBeUndefined();
    expect(getSession).not.toHaveBeenCalled();
  });

  it("allows authenticated mobile visitors", async () => {
    setViewportWidth(767);
    getSession.mockResolvedValue({
      data: {
        user: { id: "user-1" },
      },
    });

    await expect(redirectMobileGuest()).resolves.toBeUndefined();
  });

  it("redirects unauthenticated mobile visitors to login", async () => {
    setViewportWidth(767);
    getSession.mockResolvedValue({ data: null });

    await expect(redirectMobileGuest()).rejects.toMatchObject({
      options: {
        to: "/login",
      },
    });
  });
});
