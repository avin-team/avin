import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RiskLookupPage } from "./risk-lookup-page";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    ...props
  }: {
    children: ReactNode;
    params?: { slug: string };
  }) => (
    <a href={params ? `/avin-check/warning/${params.slug}` : "#"} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../api/risk-lookup-api", () => ({
  usePublicRiskIdentifierSearch: () => ({
    data: {
      exactMatch: true,
      warnings: [
        {
          identifier: {
            maskedValue: "**** 6789",
            publicValue: null,
            type: "BANK_ACCOUNT",
          },
          publicPath: "/avin-check/warning/warning-report-1",
          publicSlug: "warning-report-1",
          publishedAt: "2026-08-01T10:00:00.000Z",
          status: "PUBLISHED",
          type: "BANK_WALLET_PHONE",
        },
      ],
    },
    isError: false,
    isPending: false,
    mutateAsync: mocks.mutateAsync,
  }),
  usePublicRiskStatistics: () => ({
    data: {
      currentReports: 2,
      lastUpdatedAt: "2026-08-03T10:00:00.000Z",
      providersByStatus: [
        { count: 2, status: "ACTIVE" },
        { count: 0, status: "SUSPENDED_PENDING_REVIEW" },
        { count: 0, status: "WITHDRAWAL_PENDING" },
        { count: 1, status: "WITHDRAWN" },
        { count: 0, status: "REMOVED_FOR_FRAUD" },
      ],
      publishedRiskIdentifiers: 3,
      reportsByPeriod: [{ count: 2, period: "2026-08" }],
      verifiedClaimedLoss: 200_000,
    },
    isError: false,
    isPending: false,
  }),
}));

vi.mock("../api/risk-warning-api", () => ({
  usePublicRiskWarnings: () => ({
    data: [],
    isError: false,
    isPending: false,
  }),
}));

describe("RiskLookupPage", () => {
  afterEach(() => {
    cleanup();
    mocks.mutateAsync.mockReset();
  });

  it("renders masked exact results and public activity statistics", () => {
    render(<RiskLookupPage />);

    expect(
      screen.getByRole("heading", {
        name: "Kiểm tra dấu hiệu lừa đảo.",
      })
    ).toBeInTheDocument();
    expect(screen.getAllByText("**** 6789")[0]).toBeInTheDocument();
    expect(screen.getByText("Số điện thoại, số tài khoản")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveAttribute("autocomplete", "off");
  });

  it("submits exact lookup through a mutation without putting the value in navigation", async () => {
    render(<RiskLookupPage />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "0123-456.789" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" }));

    await waitFor(() => {
      expect(mocks.mutateAsync).toHaveBeenCalledWith({
        type: "BANK_ACCOUNT",
        value: "0123-456.789",
      });
    });
    expect(window.location.search).toBe("");
    expect(document.title).not.toContain("0123-456.789");
  });
});
