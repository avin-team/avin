import { beforeEach, describe, expect, it, vi } from "vitest";

import { Route } from "@/routes/(public)/avin-check/apply";

const { requireSession } = vi.hoisted(() => ({
  requireSession: vi.fn(),
}));

vi.mock("@/features/auth/guards/require-session", () => ({
  requireSession,
}));

vi.mock("@/features/protection/pages/provider-workspace-page", () => ({
  ProviderWorkspacePage: () => null,
}));

const runBeforeLoad = () =>
  Route.options.beforeLoad?.({
    context: { queryClient: "query-client" },
    location: {
      pathname: "/avin-check/apply",
      search: Object.create(null),
      searchStr: "?foo=bar",
    },
  } as never);

describe("Avin Check application route", () => {
  beforeEach(() => {
    requireSession.mockReset();
  });

  it("passes the serialized search string to the login return URL", async () => {
    requireSession.mockResolvedValue({ data: null });

    await expect(runBeforeLoad()).resolves.toEqual({ data: null });
    expect(requireSession).toHaveBeenCalledWith(
      "query-client",
      "/avin-check/apply?foo=bar"
    );
  });
});
