import { QueryClient } from "@tanstack/react-query";
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
  let queryClient: QueryClient;

  beforeEach(() => {
    getSession.mockReset();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it("returns the current session when the user is authenticated", async () => {
    const sessionData = {
      user: {
        id: "user-1",
      },
    };
    getSession.mockResolvedValue({ data: sessionData });

    await expect(requireSession(queryClient)).resolves.toEqual({
      data: sessionData,
    });
  });

  it("redirects to login when the user is not authenticated", async () => {
    getSession.mockResolvedValue({ data: null });

    await expect(requireSession(queryClient)).rejects.toMatchObject({
      options: {
        to: "/login",
      },
    });
  });
});
