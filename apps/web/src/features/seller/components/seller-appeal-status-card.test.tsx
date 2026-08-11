import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SellerAppealStatusCard } from "./seller-appeal-status-card";

const mocks = vi.hoisted(() => ({
  appealDetail: {
    data: null as unknown,
    isError: false,
    isPending: false,
  },
  evidenceUrlMutate: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({
    isPending: false,
    mutateAsync: mocks.evidenceUrlMutate,
  }),
  useQuery: mocks.useQuery,
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

vi.mock("@avin/ui/components/card", () => ({
  Card: ({ children }: { children: ReactNode }) => (
    <section>{children}</section>
  ),
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: ReactNode }) => (
    <header>{children}</header>
  ),
  CardTitle: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
}));

vi.mock("@avin/ui/components/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

vi.mock("@/utils/orpc", () => ({
  orpc: {
    sellerEnforcement: {
      seller: {
        getAppeal: {
          queryOptions: () => ({
            queryKey: ["sellerEnforcement", "getAppeal"],
          }),
        },
        getAppealEvidenceUrl: { mutationOptions: () => ({}) },
      },
    },
  },
}));

describe("SellerAppealStatusCard", () => {
  beforeEach(() => {
    mocks.useQuery.mockReturnValue(mocks.appealDetail);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders submitted appeal details with evidence", () => {
    mocks.appealDetail.data = {
      appeal: {
        actionId: "act_1",
        createdAt: new Date("2026-08-11T02:00:00Z"),
        id: "appeal_1",
        outcomeReason: null,
        reviewedAt: null,
        sellerId: "seller_1",
        sellerReason: "Đã có tin nhắn xác nhận hoàn thành",
        status: "SUBMITTED",
        updatedAt: new Date("2026-08-11T02:00:00Z"),
      },
      evidence: [
        {
          appealId: "appeal_1",
          byteSize: 1024 * 1024,
          contentType: "application/pdf",
          description: "Biên bản nghiệm thu",
          fileName: "evidence.pdf",
          id: "ev_1",
          storageKey: "key_1",
          submittedAt: new Date(),
          submittedByUserId: "seller_1",
        },
      ],
    };

    render(<SellerAppealStatusCard appealId="appeal_1" />);

    expect(
      screen.getByText("Trạng thái đơn khiếu nại (Appeal)")
    ).toBeInTheDocument();
    expect(screen.getByText(/Đã gửi khiếu nại/iu)).toBeInTheDocument();
    expect(
      screen.getByText("Đã có tin nhắn xác nhận hoàn thành")
    ).toBeInTheDocument();
    expect(screen.getByText("evidence.pdf")).toBeInTheDocument();
  });

  it("renders overturned appeal with reviewer outcome reason", () => {
    mocks.appealDetail.data = {
      appeal: {
        actionId: "act_1",
        createdAt: new Date("2026-08-11T02:00:00Z"),
        id: "appeal_1",
        outcomeReason: "Xác minh lại bằng chứng: Seller không có lỗi",
        reviewedAt: new Date("2026-08-11T04:00:00Z"),
        sellerId: "seller_1",
        sellerReason: "Đã có tin nhắn xác nhận hoàn thành",
        status: "OVERTURNED",
        updatedAt: new Date("2026-08-11T04:00:00Z"),
      },
      evidence: [],
    };

    render(<SellerAppealStatusCard appealId="appeal_1" />);

    expect(screen.getByText(/Chấp thuận khiếu nại/iu)).toBeInTheDocument();
    expect(
      screen.getByText("Xác minh lại bằng chứng: Seller không có lỗi")
    ).toBeInTheDocument();
  });
});
