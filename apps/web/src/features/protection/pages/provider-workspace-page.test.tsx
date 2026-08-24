import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProviderWorkspacePage } from "./provider-workspace-page";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    className,
    to,
  }: {
    children: React.ReactNode;
    className?: string;
    to: string;
  }) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/protection/api/provider-api", () => ({
  useProviderApplicationActions: () => ({
    saveDraft: { isPending: false, mutateAsync: vi.fn() },
    submit: { isPending: false, mutateAsync: vi.fn() },
  }),
  useProviderProfileRevisionActions: () => ({
    saveDraft: { isPending: false, mutateAsync: vi.fn() },
    start: { isPending: false, mutateAsync: vi.fn() },
    submit: { isPending: false, mutateAsync: vi.fn() },
  }),
  useProviderProtectionPolicyActions: () => ({
    accept: { isPending: false, mutateAsync: vi.fn() },
  }),
  useProviderWorkspace: () => ({
    data: {
      identity: {
        id: "provider-1",
        name: "Provider One",
        role: "BUYER",
      },
      privateProviderRecord: {
        source: "MARKETPLACE_ACCOUNT",
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

  it("renders the clean application form for eligible applicants", () => {
    render(<ProviderWorkspacePage />);

    expect(
      screen.getByRole("heading", {
        name: "Không gian riêng của Đối tác Avin",
      })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Quay lại" })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "1. Thông tin cá nhân" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("2. Tài khoản đối soát & Cam kết")
    ).toBeInTheDocument();
    expect(screen.getByText("Avin Check Certified")).toBeInTheDocument();
  });
});
