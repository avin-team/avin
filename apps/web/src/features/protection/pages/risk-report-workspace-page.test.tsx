import type * as TanstackReactQuery from "@tanstack/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RiskReportWorkspacePage } from "./risk-report-workspace-page";

const queryStateReports = {
  data: [] as unknown[],
  isError: false,
  isPending: false,
  refetch: vi.fn(),
};

const queryStateCorrections = {
  data: [] as unknown[],
  isError: false,
  isPending: false,
  refetch: vi.fn(),
};

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    search,
    to,
    ...props
  }: {
    children: ReactNode;
    search?: { reportId?: string };
    to: string;
  }) => (
    <a
      href={search?.reportId ? `${to}?reportId=${search.reportId}` : to}
      {...props}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/utils/orpc", () => ({
  orpc: {
    protection: {
      riskReport: {
        correctionsMine: {
          queryOptions: () => ({ queryKey: ["correctionsMine"] }),
        },
        deleteDraft: {
          mutationOptions: () => ({ mutationFn: vi.fn() }),
        },
        getMine: {
          queryOptions: () => ({ queryKey: ["getMine"] }),
        },
        requestWithdrawal: {
          mutationOptions: () => ({ mutationFn: vi.fn() }),
        },
      },
    },
  },
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof TanstackReactQuery>();
  return {
    ...actual,
    useMutation: () => ({
      isPending: false,
      mutateAsync: vi.fn(),
    }),
    useQuery: (options: { queryKey: string[] }) => {
      if (options.queryKey[0] === "correctionsMine") {
        return queryStateCorrections;
      }
      return queryStateReports;
    },
  };
});

describe("RiskReportWorkspacePage", () => {
  afterEach(() => {
    cleanup();
    queryStateReports.data = [];
    queryStateReports.isError = false;
    queryStateReports.isPending = false;
    queryStateCorrections.data = [];
    queryStateCorrections.isError = false;
    queryStateCorrections.isPending = false;
  });

  it("renders empty state when there are no reports", () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <RiskReportWorkspacePage />
      </QueryClientProvider>
    );

    expect(
      screen.getByRole("heading", { name: "Theo dõi các báo cáo rủi ro." })
    ).toBeInTheDocument();
    expect(screen.getByText("Chưa có báo cáo nào")).toBeInTheDocument();
    expect(screen.getByText("Tạo báo cáo đầu tiên")).toBeInTheDocument();
  });

  it("renders reports list with friendly names and status badges", () => {
    queryStateReports.data = [
      {
        claimedLoss: 5_000_000,
        createdAt: "2026-08-26T15:00:00.000Z",
        id: "report-1",
        identifiers: [
          {
            displayName: "Techcombank - 190333",
            holderName: "NGUYEN VAN A",
            institutionName: "Techcombank",
            isPrimary: true,
            type: "BANK_ACCOUNT",
            value: "1903338888",
          },
        ],
        reviewReason: null,
        status: "DRAFT",
        type: "BANK_WALLET_PHONE",
        updatedAt: "2026-08-26T15:07:02.000Z",
        withdrawalStatus: "NONE",
      },
      {
        claimedLoss: null,
        createdAt: "2026-08-26T14:00:00.000Z",
        id: "report-2",
        identifiers: [
          {
            displayName: "Website giả mạo",
            isPrimary: true,
            type: "WEBSITE",
            value: "https://fake-login-bank.com",
          },
        ],
        reviewReason: "Vui lòng chụp thêm ảnh biên lai chuyển khoản rõ nét.",
        status: "CHANGES_REQUESTED",
        type: "MALICIOUS_WEBSITE",
        updatedAt: "2026-08-26T15:02:36.000Z",
        withdrawalStatus: "NONE",
      },
    ];

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <RiskReportWorkspacePage />
      </QueryClientProvider>
    );

    expect(
      screen.getByText("Techcombank: 1903338888 (NGUYEN VAN A)")
    ).toBeInTheDocument();
    expect(screen.getByText("Bản nháp")).toBeInTheDocument();
    expect(screen.getByText("Tiếp tục bản nháp")).toBeInTheDocument();
    expect(screen.getByText("Xoá bản nháp")).toBeInTheDocument();

    expect(screen.getByText("Website lừa đảo · Giả mạo")).toBeInTheDocument();
    expect(screen.getByText("Cần bổ sung thông tin")).toBeInTheDocument();
    expect(
      screen.getByText("Vui lòng chụp thêm ảnh biên lai chuyển khoản rõ nét.")
    ).toBeInTheDocument();
    expect(screen.getByText("Bổ sung thông tin")).toBeInTheDocument();
  });
});
