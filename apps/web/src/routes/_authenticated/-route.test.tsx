import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Route } from "@/routes/_authenticated/route";

const { requireSession } = vi.hoisted(() => ({
  requireSession: vi.fn(),
}));

vi.mock("@/components/layout/main-layout", () => ({
  MainLayout: () => null,
}));

vi.mock("@/features/auth/guards/require-session", () => ({
  requireSession,
}));

const runBeforeLoad = (pathname: string) =>
  Route.options.beforeLoad?.({ location: { pathname } } as never);

describe("authenticated route", () => {
  beforeEach(() => {
    requireSession.mockReset();
  });

  it("allows a seller session without an onboarding flag to open another screen", async () => {
    const session = {
      data: {
        user: {
          id: "seller-1",
          role: ACCOUNT_ROLE.SELLER,
        },
      },
    };
    requireSession.mockResolvedValue(session);

    await expect(runBeforeLoad("/security")).resolves.toEqual({ session });
  });

  it("does not force onboarding while navigating after authentication", async () => {
    const session = {
      data: {
        user: {
          hasSeenSellerOnboarding: false,
          id: "seller-1",
          role: ACCOUNT_ROLE.SELLER,
        },
      },
    };
    requireSession.mockResolvedValue(session);

    await expect(runBeforeLoad("/security")).resolves.toEqual({ session });
  });
});
