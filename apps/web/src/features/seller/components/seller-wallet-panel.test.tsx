import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SellerWalletPanel } from "./seller-wallet-panel";

const mocks = vi.hoisted(() => ({
  summary: {
    data: {
      availableBalance: 120_000,
      heldBalance: 25_000,
      pendingBalance: 80_000,
    },
    isError: false,
    isPending: false,
    refetch: vi.fn(),
  },
  useMutation: vi.fn(() => ({ isPending: false, mutateAsync: vi.fn() })),
  useQuery: vi.fn(),
  withdrawals: {
    data: [
      {
        amount: 25_000,
        approvedAt: null,
        bankAccount: {
          accountName: "NGUYEN VAN A",
          accountNumber: "0123456789",
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
        sellerId: "seller-1",
        status: "REQUESTED",
        updatedAt: "2026-08-09T08:00:00.000Z",
      },
    ],
    isError: false,
    isPending: false,
    refetch: vi.fn(),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: mocks.useMutation,
  useQuery: mocks.useQuery,
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@avin/ui/components/button", () => ({
  Button: ({ children, ...props }: { children: ReactNode }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@avin/ui/components/card", () => {
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const Container = ({ children }: { children: ReactNode }) => (
    <section>{children}</section>
  );
  return {
    Card: Container,
    CardContent: Container,
    CardDescription: ({ children }: { children: ReactNode }) => (
      <p>{children}</p>
    ),
    CardHeader: Container,
    CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  };
});

vi.mock("@avin/ui/components/field", () => ({
  Field: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FieldDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  FieldError: () => null,
  FieldGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FieldLabel: ({ children }: { children: ReactNode }) => (
    <label>{children}</label>
  ),
}));

vi.mock("@avin/ui/components/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));
vi.mock("@avin/ui/components/skeleton", () => ({ Skeleton: () => <div /> }));
vi.mock("@avin/ui/components/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/utils/orpc", () => ({
  orpc: {
    wallet: {
      seller: {
        cancelWithdrawal: { mutationOptions: () => ({}) },
        getSummary: { queryOptions: () => ({ queryKey: ["summary"] }) },
        listWithdrawals: {
          queryOptions: () => ({ queryKey: ["withdrawals"] }),
        },
        requestWithdrawal: { mutationOptions: () => ({}) },
      },
    },
  },
}));

describe("SellerWalletPanel", () => {
  beforeEach(() => {
    mocks.useQuery.mockImplementation((options: { queryKey: string[] }) =>
      options.queryKey[0] === "summary" ? mocks.summary : mocks.withdrawals
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows balances and lets a seller cancel a requested withdrawal", () => {
    render(<SellerWalletPanel />);

    expect(screen.getByText("120.000 ₫")).toBeInTheDocument();
    expect(screen.getByText("Đang chờ duyệt")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hủy yêu cầu" })
    ).toBeInTheDocument();
  });
});
