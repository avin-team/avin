import type { OrderItemTimelineView } from "@avin/api/commerce/fulfillment";
import type { BuyerOrderView } from "@avin/api/commerce/orders";
import { cleanup, render, screen } from "@testing-library/react";
import type {
  ButtonHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OrderDetailPage } from "@/features/commerce/pages/order-detail-page";

const mocks = vi.hoisted(() => ({
  ordersQuery: {
    data: [] as BuyerOrderView[],
    isError: false,
    isPending: false,
    refetch: vi.fn(),
  },
  timelineQuery: {
    data: null as OrderItemTimelineView | null,
    isError: false,
    isPending: false,
    refetch: vi.fn(),
  },
  useMutation: vi.fn(() => ({
    isPending: false,
    mutateAsync: vi.fn(),
  })),
  useQuery: vi.fn(),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: "item-delivered" }),
  useSearch: () => ({}),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: mocks.useMutation,
  useQuery: mocks.useQuery,
  useQueryClient: mocks.useQueryClient,
}));

vi.mock("@/utils/orpc", () => ({
  orpc: {
    commerce: {
      orders: {
        item: {
          cancelByBuyer: { mutationOptions: () => ({}) },
          confirmDelivery: { mutationOptions: () => ({}) },
          openDispute: { mutationOptions: () => ({}) },
          timeline: {
            queryOptions: ({ input }: { input: { itemId: string } }) => ({
              queryKey: ["timeline", input.itemId],
            }),
          },
        },
        listMineAsBuyer: {
          queryOptions: () => ({ queryKey: ["buyer-orders"] }),
        },
      },
    },
  },
}));

vi.mock("@/components/shell", () => ({
  Shell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

vi.mock("@/features/commerce/components/order-item-timeline", () => ({
  OrderItemTimeline: ({ timeline }: { timeline: OrderItemTimelineView }) => (
    <div data-testid={`timeline-${timeline.orderItemId}`}>Timeline</div>
  ),
}));

vi.mock("@avin/ui/components/alert", () => {
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const Container = ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  );
  return {
    Alert: Container,
    AlertDescription: Container,
    AlertTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  };
});

vi.mock("@avin/ui/components/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
  AlertDialogContent: () => null,
  AlertDialogDescription: () => null,
  AlertDialogFooter: () => null,
  AlertDialogHeader: () => null,
  AlertDialogTitle: () => null,
}));

vi.mock("@avin/ui/components/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@avin/ui/components/button", () => ({
  Button: ({
    children,
    render: _render,
    size: _size,
    variant: _variant,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    render?: ReactNode;
    size?: string;
    variant?: string;
  }) => (
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
  FieldGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FieldLabel: ({ children }: { children: ReactNode }) => (
    <label>{children}</label>
  ),
}));

vi.mock("@avin/ui/components/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

vi.mock("@avin/ui/components/textarea", () => ({
  Textarea: (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
}));

vi.mock("@phosphor-icons/react", () => ({
  ArrowClockwise: () => <span />,
  ArrowLeft: () => <span />,
  Calendar: () => <span />,
  CheckCircle: () => <span />,
  Receipt: () => <span />,
  Storefront: () => <span />,
  WarningCircle: () => <span />,
  XCircle: () => <span />,
}));

const listing = {
  slug: "design-service",
  thumbnailUrl: "https://example.com/design.png",
  title: "Thiết kế landing page",
  type: "SERVICE" as const,
};

const order: BuyerOrderView = {
  buyerId: "buyer-1",
  checkoutId: "checkout-1",
  createdAt: "2026-08-03T00:00:00.000Z",
  currency: "VND",
  id: "order-1",
  items: [
    {
      deliveredAt: "2026-08-03T01:00:00.000Z",
      deliveryReviewDeadlineAt: "9999-12-31T00:00:00.000Z",
      escrowHold: { amount: 200_000, id: "escrow-2", status: "HELD" },
      id: "item-delivered",
      listing: {
        ...listing,
        title: "Tối ưu quảng cáo",
      },
      listingId: "listing-2",
      priceAmount: 200_000,
      processingDeadlineAt: "2026-08-02T00:00:00.000Z",
      processingTimeHours: 24,
      status: "DELIVERED",
      warrantyExpiresAt: null,
      warrantyPolicy: { durationHours: 48, terms: "Sửa lỗi trong 48 giờ." },
    },
  ],
  seller: { id: "seller-1", image: null, name: "Studio Avin" },
  sellerId: "seller-1",
  totalAmount: 200_000,
};

const makeTimeline = (
  item: BuyerOrderView["items"][number]
): OrderItemTimelineView => ({
  current: {
    deliveredAt: item.deliveredAt,
    deliveryReviewDeadlineAt: item.deliveryReviewDeadlineAt,
    orderId: order.id,
    processingDeadlineAt: item.processingDeadlineAt,
    status: item.status,
    warrantyExpiresAt: item.warrantyExpiresAt,
    warrantyPolicy: item.warrantyPolicy,
    warrantyStartedAt: null,
  },
  deliverySubmission: null,
  dispute: null,
  events: [],
  orderItemId: item.id,
});

describe("OrderDetailPage", () => {
  beforeEach(() => {
    mocks.ordersQuery.data = [order];
    mocks.ordersQuery.isError = false;
    mocks.ordersQuery.isPending = false;
    mocks.useQuery.mockImplementation((options: { queryKey: string[] }) =>
      options.queryKey[0] === "buyer-orders"
        ? mocks.ordersQuery
        : {
            ...mocks.timelineQuery,
            data: makeTimeline(order.items[0]),
          }
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders full details of an OrderItem including seller, status, timeline and actions", () => {
    render(<OrderDetailPage />);

    expect(screen.getByText(/Studio Avin/u)).toBeInTheDocument();
    expect(screen.getByText("Tối ưu quảng cáo")).toBeInTheDocument();
    expect(screen.getAllByText("Đã bàn giao")[0]).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Xác nhận đã nhận" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mở Dispute" })
    ).toBeInTheDocument();
    expect(screen.getByTestId("timeline-item-delivered")).toBeInTheDocument();
  });
});
