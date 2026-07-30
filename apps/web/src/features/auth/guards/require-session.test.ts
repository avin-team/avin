import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireSession } from "@/features/auth/guards/require-session";

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("@/features/auth/api/auth-client", () => ({
  authClient: {
    getSession,
  },
}));

describe("requireSession", () => {
  beforeEach(() => {
    getSession.mockReset();
  });

  it("returns the current session when the user is authenticated", async () => {
    const session = {
      data: {
        user: {
          id: "user-1",
        },
      },
    };
    getSession.mockResolvedValue(session);

    await expect(requireSession()).resolves.toBe(session);
  });

  it("redirects to login when the user is not authenticated", async () => {
    getSession.mockResolvedValue({ data: null });

    await expect(requireSession()).rejects.toMatchObject({
      options: {
        to: "/(auth)/login",
      },
    });
  });
});
