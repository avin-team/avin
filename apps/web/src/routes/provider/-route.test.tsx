import { beforeEach, describe, expect, it, vi } from "vitest";

import { Route } from "@/routes/provider/index";

const { requireProviderSession } = vi.hoisted(() => ({
  requireProviderSession: vi.fn(),
}));

vi.mock("@/features/protection/guards/require-provider-session", () => ({
  requireProviderSession,
}));

const runBeforeLoad = () => Route.options.beforeLoad?.({} as never);

describe("Provider workspace route", () => {
  beforeEach(() => {
    requireProviderSession.mockReset();
  });

  it("requires the Provider-specific session guard", async () => {
    const session = {
      data: {
        user: { id: "provider-1", role: "PROVIDER" },
      },
    };
    requireProviderSession.mockResolvedValue(session);

    await expect(runBeforeLoad()).resolves.toEqual({ session });
    expect(requireProviderSession).toHaveBeenCalledOnce();
  });
});
