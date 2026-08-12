import { createElement } from "react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WithdrawalQueuePage } from "./withdrawal-queue-page";

const mocks = vi.hoisted(() => ({
  query: {
    data: [
      {
        amount: 50_000,
        approvedAt: null,
        bankAccount: {
          accountName: "TRAN MINH QUANG",
          accountNumber: "0912345678",
          bankName: "MBBank",
        },
        cancelledAt: null,
        createdAt: "2026-08-09T08:00:00.000Z",
        id: "withdrawal-1",
        paidAt: null,
        paidTransactionId: null,
        paymentReference: null,
        rejectionReason: null,
        requestTransactionId: "transaction-1",
        reversalTransactionId: null,
        sellerEmail: "quang@example.com",
        sellerId: "seller-1",
        sellerImage: null,
        sellerName: "Quang Tran",
        status: "REQUESTED",
        updatedAt: "2026-08-09T08:00:00.000Z",
      },
    ],
    isError: false,
    isPending: false,
    refetch: vi.fn(),
  },
}));

vi.mock("../api/withdrawals-api", () => ({
  useAdminWithdrawals: () => mocks.query,
  useApproveWithdrawal: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useMarkWithdrawalPaid: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useRejectWithdrawal: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));
vi.mock("@avin/ui/components/button", () => ({
  Button: ({ children, ...props }: { children: ReactNode }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));
vi.mock("@avin/ui/components/card", () => {
  const containerTag = "section";
  const CardContainer = ({ children }: { children: ReactNode }) =>
    createElement(containerTag, null, children);
  return {
    Card: CardContainer,
    CardContent: CardContainer,
    CardHeader: CardContainer,
    CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  };
});
vi.mock("@avin/ui/components/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));
vi.mock("@avin/ui/components/table", () => {
  const containerTag = "div";
  const TableContainer = ({ children }: { children: ReactNode }) =>
    createElement(containerTag, null, children);
  return {
    Table: TableContainer,
    TableBody: TableContainer,
    TableCell: TableContainer,
    TableHead: TableContainer,
    TableHeader: TableContainer,
    TableRow: TableContainer,
  };
});
vi.mock("@avin/ui/components/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
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
vi.mock("../components/withdrawal-action-dialog", () => ({
  WithdrawalActionDialog: () => null,
}));

describe("WithdrawalQueuePage", () => {
  beforeEach(() => vi.clearAllMocks());
  it("shows a live requested withdrawal and the approval actions", () => {
    const content = renderToStaticMarkup(<WithdrawalQueuePage />);

    expect(content).toContain("MBBank");
    expect(content).toContain("50.000 ₫");
    expect(content).toContain("Duyệt");
    expect(content).toContain("Từ chối");
  });
});
