import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppealsListCard } from "./appeals-list-card";

const mocks = vi.hoisted(() => ({
  appealDetail: {
    appeal: {
      actionId: "act_1",
      adminNote: "Đang yêu cầu thêm sao kê",
      createdAt: "2026-08-11T00:00:00Z",
      id: "appeal_1",
      outcomeReason: null,
      reviewedAt: null,
      reviewerUserId: null,
      sellerId: "seller_1",
      sellerReason: "Tôi đã bàn giao hàng đúng hẹn",
      status: "SUBMITTED" as const,
      updatedAt: "2026-08-11T00:00:00Z",
    },
    evidence: [
      {
        appealId: "appeal_1",
        byteSize: 1024 * 500,
        contentType: "image/png",
        description: "Ảnh chụp màn hình",
        fileName: "screenshot.png",
        id: "ev_1",
        storageKey: "key_1",
        submittedAt: "2026-08-11T00:00:00Z",
        submittedByUserId: "seller_1",
      },
    ],
  },
  appeals: [
    {
      actionId: "act_1",
      adminNote: "Đang yêu cầu thêm sao kê",
      createdAt: "2026-08-11T00:00:00Z",
      id: "appeal_1",
      outcomeReason: null,
      reviewedAt: null,
      reviewerUserId: null,
      sellerId: "seller_1",
      sellerReason: "Tôi đã bàn giao hàng đúng hẹn",
      status: "SUBMITTED" as const,
      updatedAt: "2026-08-11T00:00:00Z",
    },
  ],
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useQuery: (options: { queryKey: string[] }) => {
    if (options.queryKey?.includes("getAppeal")) {
      return { data: mocks.appealDetail, isPending: false };
    }
    return { data: mocks.appeals, isPending: false };
  },
}));

vi.mock("@avin/ui/components/badge", () => ({
  Badge: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
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
  const Container = ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => <section className={className}>{children}</section>;
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

vi.mock("@avin/ui/components/dialog", () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: () => null,
  DialogFooter: () => null,
  DialogHeader: () => null,
  DialogTitle: () => null,
}));

vi.mock("@/lib/orpc", () => ({
  orpc: {
    sellerEnforcement: {
      admin: {
        appeals: {
          queryOptions: () => ({ queryKey: ["appeals"] }),
        },
        getAppeal: {
          queryOptions: () => ({ queryKey: ["getAppeal"] }),
        },
        getAppealEvidenceUrl: { mutationOptions: () => ({}) },
        reviewAppeal: { mutationOptions: () => ({}) },
      },
    },
  },
}));

vi.mock("@/lib/query-client", () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

describe("AppealsListCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders submitted appeals list and evidence", () => {
    const html = renderToStaticMarkup(<AppealsListCard sellerId="seller_1" />);

    expect(html).toContain("Đơn khiếu nại quyết định (Seller Appeals)");
    expect(html).toContain("Mới nộp (Chờ thẩm định)");
    expect(html).toContain("Tôi đã bàn giao hàng đúng hẹn");
    expect(html).toContain("screenshot.png");
    expect(html).toContain("Thẩm định khiếu nại");
  });
});
