import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ProviderWorkspace } from "@/features/protection/api/provider-api";

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

const mockWorkspaceData: ProviderWorkspace = {
  application: null,
  bond: null,
  bondWithdrawal: null,
  depositIntent: null,
  identity: {
    id: "provider-1",
    name: "Provider One",
    role: "BUYER",
  },
  policy: null,
  privateProviderRecord: {
    source: "MARKETPLACE_ACCOUNT",
    visibility: "PRIVATE",
  },
  profileRevision: null,
  publicProfile: null,
  riskIncidents: [],
};

const mockWorkspaceState = {
  data: mockWorkspaceData as ProviderWorkspace | undefined,
  isError: false,
  isPending: false,
};

vi.mock("@/features/protection/api/provider-api", () => ({
  useProviderApplicationActions: () => ({
    createDepositIntent: { isPending: false, mutateAsync: vi.fn() },
    saveDraft: { isPending: false, mutateAsync: vi.fn() },
    submit: { isPending: false, mutateAsync: vi.fn() },
  }),
  useProviderBondActions: () => ({
    createTopUpIntent: { isPending: false, mutateAsync: vi.fn() },
  }),
  useProviderDepositIntent: () => ({ data: null, isPending: false }),
  useProviderProfileRevisionActions: () => ({
    saveDraft: { isPending: false, mutateAsync: vi.fn() },
    start: { isPending: false, mutateAsync: vi.fn() },
    submit: { isPending: false, mutateAsync: vi.fn() },
  }),
  useProviderProtectionPolicyActions: () => ({
    accept: { isPending: false, mutateAsync: vi.fn() },
  }),
  useProviderWorkspace: () => mockWorkspaceState,
}));

describe("ProviderWorkspacePage", () => {
  afterEach(() => {
    cleanup();
    mockWorkspaceState.isPending = false;
    mockWorkspaceState.isError = false;
  });

  it("renders loading skeleton while fetching workspace data", () => {
    mockWorkspaceState.isPending = true;
    mockWorkspaceState.data = undefined;

    render(<ProviderWorkspacePage />);

    expect(
      screen.getByTestId("provider-application-form-skeleton")
    ).toBeInTheDocument();
  });

  it("renders the clean application form for eligible applicants", () => {
    mockWorkspaceState.isPending = false;
    mockWorkspaceState.data = mockWorkspaceData;

    render(<ProviderWorkspacePage />);

    expect(
      screen.queryByRole("heading", {
        name: "Không gian riêng của Đối tác Avin",
      })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Đăng ký đối tác" })
    ).toBeInTheDocument();
    const backLink = screen.getByRole("link", { name: "Quay lại" });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/avin-check/directory");
    expect(
      screen.getByRole("tab", { name: "1. Thông tin & liên hệ" })
    ).toBeInTheDocument();
    expect(screen.getByText("2. Quỹ đảm bảo & cam kết")).toBeInTheDocument();
    expect(screen.getByText("Đăng ký đối tác")).toBeInTheDocument();
  });
});
