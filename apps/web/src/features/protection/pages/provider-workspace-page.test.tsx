import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProviderWorkspacePage } from "./provider-workspace-page";

vi.mock("@/features/protection/api/provider-api", () => ({
  useProviderWorkspace: () => ({
    data: {
      identity: {
        id: "provider-1",
        name: "Provider One",
        role: "PROVIDER",
      },
      privateProviderRecord: {
        source: "PROVIDER_IDENTITY",
        visibility: "PRIVATE",
      },
      publicProfile: {
        source: "PUBLISHED_PROVIDER_PROFILE_VERSION",
        status: "NOT_PUBLISHED",
        visibility: "PUBLIC",
      },
    },
    isError: false,
    isPending: false,
  }),
}));

describe("ProviderWorkspacePage", () => {
  afterEach(cleanup);

  it("separates private Provider records from the future public profile", () => {
    render(<ProviderWorkspacePage />);

    expect(
      screen.getByRole("heading", {
        name: "Không gian riêng của Đối tác Avin",
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/Hồ sơ Provider riêng/iu)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Hồ sơ công khai" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Không có số dư marketplace/iu)
    ).toBeInTheDocument();
    expect(screen.getByText(/chưa được phát hành/iu)).toBeInTheDocument();
  });
});
