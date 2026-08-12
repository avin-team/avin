import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OverviewPage } from "./overview-page";

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [] }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to?: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("@/features/seller-applications/api/seller-applications-api", () => ({
  useAdminSellerApplications: () => ({
    data: [
      {
        applicantName: "Nguyen Van A",
        id: "app-1",
        status: "PENDING_REVIEW",
        storefrontName: "Shop A",
        submittedAt: "2026-08-10T10:00:00.000Z",
      },
    ],
  }),
}));

vi.mock(
  "@/features/seller-applications/components/application-status-badge",
  () => ({
    ApplicationStatusBadge: () => <span>StatusBadge</span>,
  })
);

vi.mock("@/features/seller-applications/utils", () => ({
  formatApplicationDate: () => "10/08/2026",
}));

vi.mock("@/features/categories/api/categories-api", () => ({
  categoriesQueryOptions: () => ({ queryKey: ["categories"] }),
}));

vi.mock("@/features/categories/workflow", () => ({
  countTotalSubCategories: () => 5,
}));

vi.mock("@/features/sellers/api/seller-enforcement-api", () => ({
  useAdminSellerList: () => ({
    data: {
      items: [
        { enforcementStatus: "SUSPENDED", id: "seller-1", name: "Shop B" },
      ],
    },
  }),
}));

vi.mock("@/features/operations/api/operations-api", () => ({
  useOperationsOverviewAnalytics: () => ({
    data: {
      totalEscrowHold: 150_000_000,
      totalPendingPayout: 45_000_000,
      totalRevenue: 12_500_000,
      trend: [
        { date: "06/08", escrowHold: 18_500_000, revenue: 1_450_000 },
        { date: "07/08", escrowHold: 22_000_000, revenue: 1_800_000 },
      ],
    },
  }),
}));

vi.mock("@/features/disputes/api/disputes-api", () => ({
  useAdminDisputes: () => ({ data: [] }),
}));

vi.mock("@/features/withdrawals/api/withdrawals-api", () => ({
  useAdminWithdrawals: () => ({ data: [] }),
}));

vi.mock("@/features/listings/api/listings-api", () => ({
  useAdminListings: () => ({
    data: [{ id: "listing-1" }, { id: "listing-2" }],
  }),
}));

vi.mock("@avin/ui/components/button", () => ({
  Button: ({ children, ...props }: { children: ReactNode }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@avin/ui/components/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

const { CardMock } = vi.hoisted(() => ({
  CardMock: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@avin/ui/components/card", () => ({
  Card: CardMock,
  CardContent: CardMock,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  CardHeader: CardMock,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@avin/ui/components/chart", () => ({
  ChartContainer: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

vi.mock("./escrow-revenue-chart", () => ({
  EscrowRevenueChart: () => <div data-testid="escrow-revenue-chart" />,
}));

vi.mock("@/components/layout/header", () => ({
  Header: ({ children }: { children: ReactNode }) => (
    <header>{children}</header>
  ),
}));

vi.mock("@/components/layout/main", () => ({
  Main: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

vi.mock("@/components/theme-switch", () => ({ ThemeSwitch: () => null }));

describe("OverviewPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders overview title, escrow metrics, and quick action cards including Duyệt sản phẩm", () => {
    const html = renderToStaticMarkup(<OverviewPage />);

    expect(html).toContain("Bảng điều khiển Tổng quan");
    expect(html).toContain("Tổng số Seller");
    expect(html).toContain("Duyệt sản phẩm");
    expect(html).toContain("2 Sản phẩm");
    expect(html).toContain("Thống kê Dòng tiền Escrow &amp; Doanh thu sàn");
    expect(html).toContain("Tổng Escrow đang giữ");
    expect(html).toContain("Phí sàn đã thu");
  });
});
