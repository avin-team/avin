import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireProviderSession } from "./require-provider-session";

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("@/features/protection/api/provider-auth-client", () => ({
  providerAuthClient: {
    getSession,
  },
}));

describe("requireProviderSession", () => {
  beforeEach(() => {
    getSession.mockReset();
  });

  it("returns a Provider session", async () => {
    const session = {
      data: {
        user: {
          id: "provider-1",
          role: ACCOUNT_ROLE.PROVIDER,
        },
      },
    };
    getSession.mockResolvedValue(session);

    await expect(requireProviderSession()).resolves.toBe(session);
  });

  it.each([
    { role: ACCOUNT_ROLE.BUYER },
    { role: ACCOUNT_ROLE.SELLER },
    { role: ACCOUNT_ROLE.ADMIN },
    { role: undefined },
  ])("redirects a non-Provider session to Provider login", async (user) => {
    getSession.mockResolvedValue({ data: { user } });

    await expect(requireProviderSession()).rejects.toMatchObject({
      options: { to: "/provider/login" },
    });
  });
});
