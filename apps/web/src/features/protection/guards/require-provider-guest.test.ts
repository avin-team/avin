import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireProviderGuest } from "./require-provider-guest";

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("@/features/protection/api/provider-auth-client", () => ({
  providerAuthClient: {
    getSession,
  },
}));

describe("requireProviderGuest", () => {
  beforeEach(() => {
    getSession.mockReset();
  });

  it("allows an unauthenticated visitor", async () => {
    getSession.mockResolvedValue({ data: null });

    await expect(requireProviderGuest()).resolves.toBeUndefined();
  });

  it("redirects an authenticated Provider to the workspace", async () => {
    getSession.mockResolvedValue({
      data: {
        user: { id: "provider-1", role: ACCOUNT_ROLE.PROVIDER },
      },
    });

    await expect(requireProviderGuest()).rejects.toMatchObject({
      options: { to: "/provider" },
    });
  });
});
