import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearAdminSessionCache,
  requireAdminSession,
} from "./require-admin-session";

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    getSession,
  },
}));

describe("requireAdminSession", () => {
  beforeEach(() => {
    clearAdminSessionCache();
    getSession.mockReset();
  });

  it("returns session data when user is authenticated with ADMIN role", async () => {
    const mockSession = {
      data: {
        user: {
          email: "admin@avin.vn",
          id: "admin-1",
          role: "ADMIN",
        },
      },
    };
    getSession.mockResolvedValue(mockSession);

    const result = await requireAdminSession("/dashboard");
    expect(result).toBe(mockSession.data);
    expect(getSession).toHaveBeenCalledWith();
  });

  it("reuses the admin session across route navigations", async () => {
    const mockSession = {
      data: {
        user: {
          id: "admin-1",
          role: "ADMIN",
        },
      },
    };
    getSession.mockResolvedValue(mockSession);

    await requireAdminSession("/sellers");
    await requireAdminSession("/seller-applications");

    expect(getSession).toHaveBeenCalledTimes(1);
  });

  it("redirects to /sign-in when user is not authenticated", async () => {
    getSession.mockResolvedValue({ data: null });

    await expect(requireAdminSession("/dashboard")).rejects.toMatchObject({
      options: {
        search: { redirect: "/dashboard" },
        to: "/sign-in",
      },
    });
  });

  it("redirects to /sign-in when user has non-ADMIN role", async () => {
    getSession.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          role: "BUYER",
        },
      },
    });

    await expect(requireAdminSession("/dashboard")).rejects.toMatchObject({
      options: {
        search: { redirect: "/dashboard" },
        to: "/sign-in",
      },
    });
  });

  it("redirects to /sign-in when getSession throws a network fetch error", async () => {
    getSession.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(requireAdminSession("/dashboard")).rejects.toMatchObject({
      options: {
        search: { redirect: "/dashboard" },
        to: "/sign-in",
      },
    });
  });
});
