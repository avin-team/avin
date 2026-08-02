import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WalletPage } from "./wallet-page";

interface MockWalletTransaction {
  amount: number;
  id: string;
  paymentReference: string;
  resultingAvailableBalance: number | null;
  status: "ATTENTION" | "COMPLETED" | "PENDING" | "REVERSED";
  timestamp: string;
  type: string;
}

const mocks = vi.hoisted(() => ({
  summaryQuery: {
    data: { availableBalance: 99_000, heldBalance: 1000 },
    isError: false,
    isLoading: false,
  },
  transactionsQuery: {
    data: { items: [] as MockWalletTransaction[], nextCursor: null },
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  },
  useQueries: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueries: mocks.useQueries,
  useQuery: mocks.useQuery,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("@avin/ui/components/button", () => ({
  Button: ({
    children,
    render: _render,
    ...props
  }: {
    children: ReactNode;
    render?: ReactNode;
  }) => (
    <button {...props} type="button">
      {children}
    </button>
  ),
}));

vi.mock("@avin/ui/components/card", () => {
  // The mock must be created inside the hoisted factory so Vitest can access it.
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const MockContainer = ({ children }: { children: ReactNode }) => (
    <section>{children}</section>
  );

  return {
    Card: MockContainer,
    CardContent: MockContainer,
    CardHeader: MockContainer,
    CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  };
});

vi.mock("@avin/ui/components/skeleton", () => ({
  Skeleton: () => <div />,
}));

vi.mock("lucide-react", () => ({
  ArrowDownToLine: () => <span />,
  ChevronDown: () => <span />,
}));

vi.mock("@/components/shell", () => ({
  Shell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

vi.mock("../api/wallet-api", () => ({
  walletSummaryQueryOptions: () => ({ queryKey: ["wallet-summary"] }),
  walletTransactionsQueryOptions: (cursor?: string) => ({
    queryKey: ["wallet-transactions", cursor],
  }),
}));

describe("WalletPage", () => {
  beforeEach(() => {
    mocks.transactionsQuery.data = {
      items: [],
      nextCursor: null,
    };
    mocks.useQueries.mockImplementation(({ queries }: { queries: unknown[] }) =>
      queries.map(() => mocks.transactionsQuery)
    );
    mocks.useQuery.mockImplementation(
      (options: { queryKey: [string, string?] }) =>
        options.queryKey[0] === "wallet-summary"
          ? mocks.summaryQuery
          : mocks.transactionsQuery
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the first transaction page when its cursor is undefined", async () => {
    mocks.transactionsQuery.data = {
      items: [
        {
          amount: 50_000,
          id: "deposit:request-1",
          paymentReference: "AVABC123456789",
          resultingAvailableBalance: 99_000,
          status: "COMPLETED",
          timestamp: "2026-08-02T10:00:00.000Z",
          type: "Nạp tiền",
        },
      ],
      nextCursor: null,
    };

    render(<WalletPage />);

    expect(await screen.findByText("+50.000 ₫")).toBeInTheDocument();
    expect(screen.getByText("Đã cộng vào ví")).toBeInTheDocument();
  });

  it("updates an observed deposit to the completed state without duplicating it", async () => {
    mocks.transactionsQuery.data = {
      items: [
        {
          amount: 50_000,
          id: "deposit:request-1",
          paymentReference: "AVABC123456789",
          resultingAvailableBalance: null,
          status: "ATTENTION",
          timestamp: "2026-08-02T10:00:00.000Z",
          type: "Nạp tiền",
        },
      ],
      nextCursor: null,
    };

    const { rerender } = render(<WalletPage />);

    expect(await screen.findByText("Cần kiểm tra")).toBeInTheDocument();

    mocks.transactionsQuery.data = {
      items: [
        {
          amount: 50_000,
          id: "deposit:request-1",
          paymentReference: "AVABC123456789",
          resultingAvailableBalance: 99_000,
          status: "COMPLETED",
          timestamp: "2026-08-02T10:02:00.000Z",
          type: "Nạp tiền",
        },
      ],
      nextCursor: null,
    };
    rerender(<WalletPage />);

    await waitFor(() => {
      expect(screen.getByText("Đã cộng vào ví")).toBeInTheDocument();
    });
    expect(screen.queryByText("Cần kiểm tra")).not.toBeInTheDocument();
    expect(screen.getAllByText("Đã cộng vào ví")).toHaveLength(1);
  });
});
