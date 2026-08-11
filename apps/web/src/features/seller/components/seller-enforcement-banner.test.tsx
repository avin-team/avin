import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SellerEnforcementBanner } from "./seller-enforcement-banner";

const mocks = vi.hoisted(() => ({
  appeals: {
    data: [],
    isPending: false,
  },
  enforcement: {
    data: null as unknown,
    isPending: false,
  },
  useQuery: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useQuery: mocks.useQuery,
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@avin/ui/components/alert", () => ({
  Alert: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => (
    <div className={className} role="alert">
      {children}
    </div>
  ),
  AlertDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertTitle: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
}));

vi.mock("@avin/ui/components/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@avin/ui/components/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button onClick={onClick} type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/utils/orpc", () => ({
  orpc: {
    sellerEnforcement: {
      seller: {
        appeals: {
          key: () => ["sellerEnforcement", "appeals"],
          queryOptions: () => ({ queryKey: ["sellerEnforcement", "appeals"] }),
        },
        get: {
          key: () => ["sellerEnforcement", "get"],
          queryOptions: () => ({ queryKey: ["sellerEnforcement", "get"] }),
        },
        getAppeal: {
          queryOptions: () => ({
            queryKey: ["sellerEnforcement", "getAppeal"],
          }),
        },
        getAppealEvidenceUrl: { mutationOptions: () => ({}) },
        submitAppeal: { mutationOptions: () => ({}) },
      },
    },
    sellerStore: {
      getProfile: {
        key: () => ["sellerStore", "getProfile"],
      },
    },
  },
}));

describe("SellerEnforcementBanner", () => {
  beforeEach(() => {
    mocks.useQuery.mockImplementation((options: { queryKey: string[] }) => {
      if (options.queryKey.includes("appeals")) {
        return mocks.appeals;
      }
      return mocks.enforcement;
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders nothing when seller state is CLEAR", () => {
    mocks.enforcement.data = {
      action: null,
      expiresAt: null,
      sellerId: "seller_1",
      state: "CLEAR",
      updatedAt: null,
    };
    render(<SellerEnforcementBanner />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders suspended warning banner and lets seller open appeal dialog", () => {
    mocks.enforcement.data = {
      action: {
        actionType: "SUSPEND",
        createdAt: new Date(),
        effectiveAt: new Date("2026-08-11T00:00:00Z"),
        expiresAt: new Date("2026-08-18T00:00:00Z"),
        id: "act_1",
        newState: "SUSPENDED",
        previousState: "CLEAR",
        reasonCode: "POLICY_VIOLATION",
        sellerId: "seller_1",
        sellerReason: "Bàn giao chậm nhiều đơn hàng liên tiếp",
      },
      expiresAt: new Date("2026-08-18T00:00:00Z"),
      sellerId: "seller_1",
      state: "SUSPENDED",
      updatedAt: new Date(),
    };
    mocks.appeals.data = [];

    render(<SellerEnforcementBanner />);

    expect(
      screen.getByText("Gian hàng đang bị tạm dừng hoạt động (Suspended)")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Lý do xử lý: “Bàn giao chậm nhiều đơn hàng liên tiếp”")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Gửi khiếu nại quyết định/iu })
    ).toBeInTheDocument();
  });

  it("renders banned compliance mode banner", () => {
    mocks.enforcement.data = {
      action: {
        actionType: "BAN",
        createdAt: new Date(),
        effectiveAt: new Date("2026-08-11T00:00:00Z"),
        expiresAt: null,
        id: "act_2",
        newState: "BANNED",
        previousState: "CLEAR",
        reasonCode: "FRAUD_RISK",
        sellerId: "seller_1",
        sellerReason: "Cung cấp thông tin không đúng sự thật",
      },
      expiresAt: null,
      sellerId: "seller_1",
      state: "BANNED",
      updatedAt: new Date(),
    };
    mocks.appeals.data = [];

    render(<SellerEnforcementBanner />);

    expect(
      screen.getByText(
        "Tài khoản Seller bị cấm hoạt động (Banned) · Chế độ tuân thủ"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("Lý do xử lý: “Cung cấp thông tin không đúng sự thật”")
    ).toBeInTheDocument();
  });
});
