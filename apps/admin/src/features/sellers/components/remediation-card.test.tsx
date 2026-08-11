import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EnforcementRemediation } from "../types";
import { RemediationCard } from "./remediation-card";

const mocks = vi.hoisted(() => ({
  items: [
    {
      createdAt: "2026-08-11T00:00:00Z",
      failureReason: null,
      id: "item_rem_1",
      orderItemId: "order_item_123",
      remediationId: "rem_1",
      retryCount: 0,
      status: "REFUNDED" as const,
      updatedAt: "2026-08-11T00:00:00Z",
    },
  ],
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useQuery: () => ({
    data: mocks.items,
    isPending: false,
  }),
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

vi.mock("@/lib/orpc", () => ({
  orpc: {
    sellerEnforcement: {
      admin: {
        remediationItems: {
          queryOptions: () => ({ queryKey: ["remediationItems"] }),
        },
        retryRemediation: { mutationOptions: () => ({}) },
      },
    },
  },
}));

vi.mock("@/lib/query-client", () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

describe("RemediationCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when remediation is null", () => {
    const html = renderToStaticMarkup(
      <RemediationCard remediation={null} sellerId="seller_1" />
    );
    expect(html).toBe("");
  });

  it("renders remediation status and items", () => {
    const mockRemediation: EnforcementRemediation = {
      actionId: "act_1",
      createdAt: "2026-08-11T00:00:00Z",
      finishedAt: "2026-08-11T00:05:00Z",
      id: "rem_1",
      lastError: null,
      sellerId: "seller_1",
      status: "COMPLETED",
      totalItems: 1,
      updatedAt: "2026-08-11T00:05:00Z",
    };

    const html = renderToStaticMarkup(
      <RemediationCard remediation={mockRemediation} sellerId="seller_1" />
    );

    expect(html).toContain(
      "Tiến trình bồi hoàn &amp; xử lý đơn hàng (Remediation)"
    );
    expect(html).toContain("Hoàn tất hủy &amp; hoàn tiền");
    expect(html).toContain("1 OrderItems");
    expect(html).toContain("order_item_123");
    expect(html).toContain("REFUNDED");
  });
});
