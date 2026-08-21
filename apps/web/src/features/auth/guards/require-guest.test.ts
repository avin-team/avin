import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireGuest } from "@/features/auth/guards/require-guest";

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("@/features/auth/api/auth-client", () => ({
  authClient: {
    getSession,
  },
}));

describe("requireGuest", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    getSession.mockReset();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it("does not throw when user is not authenticated", async () => {
    getSession.mockResolvedValue({ data: null });

    await expect(requireGuest(queryClient)).resolves.toBeUndefined();
  });

  it("redirects to home when user is already authenticated", async () => {
    getSession.mockResolvedValue({
      data: {
        user: { id: "user-1" },
      },
    });

    await expect(requireGuest(queryClient)).rejects.toMatchObject({
      options: {
        to: "/",
      },
    });
  });
});
