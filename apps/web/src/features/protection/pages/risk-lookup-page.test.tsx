import type * as TanstackReactQuery from "@tanstack/react-query";
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
  reportsData: [] as unknown[],
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof TanstackReactQuery>();
  return {
    ...actual,
    useQuery: () => ({ data: mocks.reportsData, isPending: false }),
  };
});

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    state: _state,
    ...props
  }: {
    children: ReactNode;
    params?: { slug: string };
    state?: unknown;
  }) => (
    <a href={params ? `/avin-check/warning/${params.slug}` : "#"} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/auth/api/session-query", () => ({
  useSession: () => ({
    data: mocks.reportsData.length > 0 ? { user: { id: "user-1" } } : null,
    isPending: false,
  }),
}));

vi.mock("@/utils/orpc", () => ({
  orpc: {
    protection: {
      riskReport: {
        getMine: {
          queryOptions: () => ({ queryKey: ["getMine"] }),
        },
      },
    },
  },
}));

vi.mock("../api/risk-lookup-api", () => ({
  usePublicRiskIdentifierSearch: () => ({
    data: {
      exactMatch: true,
      groups: [
        {
          groupId: "group-bank-account-1",
          hasPublicWarning: true,
          identifier: {
            maskedValue: "**** 6789",
            publicValue: null,
            type: "BANK_ACCOUNT",
          },
          latestPublishedAt: "2026-08-01T10:00:00.000Z",
          reportCount: 1,
          sourceCount: 1,
          status: "PUBLISHED",
          warnings: [
            {
              affectedVictimCount: 2,
              claimedLoss: 200_000,
              externalSource: {
                name: "Avin",
                title: null,
                url: null,
              },
              identifier: {
                maskedValue: "**** 6789",
                publicValue: null,
                type: "BANK_ACCOUNT",
              },
              publicPath: "/avin-check/warning/warning-report-1",
              publicSlug: "warning-report-1",
              publicSummary: "Có dấu hiệu lừa đảo.",
              publishedAt: "2026-08-01T10:00:00.000Z",
              status: "PUBLISHED",
              type: "BANK_WALLET_PHONE",
            },
          ],
        },
      ],
      hasMore: false,
      nextCursor: null,
      totalReports: 1,
      warnings: [
        {
          affectedVictimCount: 2,
          claimedLoss: 200_000,
          externalSource: {
            name: "Avin",
            title: null,
            url: null,
          },
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
      activity: {
        day: [
          {
            affectedVictims: 1,
            claimedLoss: 50_000,
            period: "2026-08-03",
            reports: 1,
          },
        ],
        month: [
          {
            affectedVictims: 4,
            claimedLoss: 200_000,
            period: "2026-08",
            reports: 2,
          },
        ],
        year: [
          {
            affectedVictims: 4,
            claimedLoss: 200_000,
            period: "2026",
            reports: 2,
          },
        ],
      },
      affectedVictims: 4,
      currentReports: 2,
      lastUpdatedAt: "2026-08-03T10:00:00.000Z",
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

  it("renders each periodic range from statistics API data", () => {
    render(<RiskLookupPage />);

    expect(screen.getByText("Năm 2026")).toBeInTheDocument();
    expect(screen.getByText("200.000 VND")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Theo tháng" }));
    expect(screen.getByText("Tháng 8/2026")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Theo ngày" }));
    expect(screen.getByText("03/08/2026")).toBeInTheDocument();
  });

  it("submits exact lookup through a mutation without putting the value in navigation", async () => {
    render(<RiskLookupPage />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "0123-456.789" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" }));

    await waitFor(() => {
      expect(mocks.mutateAsync).toHaveBeenCalledWith({
        kind: "AUTO",
        value: "0123-456.789",
      });
    });
    expect(window.location.search).toBe("");
    expect(document.title).not.toContain("0123-456.789");
  });

  it("always uses automatic recognition without a lookup-type selector", async () => {
    render(<RiskLookupPage />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "facebook.com/acme" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" }));

    await waitFor(() => {
      expect(mocks.mutateAsync).toHaveBeenCalledWith({
        kind: "AUTO",
        value: "facebook.com/acme",
      });
    });
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("lets the user clear a lookup and select a matching identifier filter", () => {
    render(<RiskLookupPage />);

    const identifierFilter = screen.getByRole("button", {
      name: "STK: **** 6789 (1)",
    });
    fireEvent.click(identifierFilter);
    expect(identifierFilter).toHaveAttribute("aria-pressed", "true");

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "0123-456.789" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Xóa nội dung tra cứu" })
    );
    expect(input).toHaveValue("");
  });

  it("shows the approved safe no-result wording and report action", async () => {
    mocks.mutateAsync.mockResolvedValueOnce({
      exactMatch: false,
      groups: [],
      hasMore: false,
      nextCursor: null,
      totalReports: 0,
      warnings: [],
    });
    render(<RiskLookupPage />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Chưa tìm thấy cảnh báo công khai trùng khớp. Điều này không có nghĩa đối tượng hoặc giao dịch an toàn."
        )
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("link", { name: "Gửi tố cáo về định danh này" })
    ).toBeInTheDocument();
  });

  it("does not show 'Báo cáo của tôi' when user has no reports", () => {
    mocks.reportsData = [];
    render(<RiskLookupPage />);

    expect(
      screen.queryByRole("link", { name: "Báo cáo của tôi" })
    ).not.toBeInTheDocument();
  });

  it("shows 'Báo cáo của tôi' when user has reports", () => {
    mocks.reportsData = [{ id: "report-1", status: "DRAFT" }];
    render(<RiskLookupPage />);

    expect(
      screen.getByRole("link", { name: "Báo cáo của tôi" })
    ).toBeInTheDocument();
  });
});
