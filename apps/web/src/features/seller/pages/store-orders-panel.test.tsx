import type { OrderItemTimelineView } from "@avin/api/commerce/fulfillment";
import type { SellerOrderView } from "@avin/api/commerce/orders";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  ButtonHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StoreOrdersPanel } from "@/features/seller/pages/store-orders-panel";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  ordersQuery: {
    data: [] as SellerOrderView[],
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
  useMutation: vi.fn(),
  useQuery: vi.fn(),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
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
          cancelBySeller: { mutationOptions: () => ({}) },
          startFulfillment: { mutationOptions: () => ({}) },
          submitDelivery: { mutationOptions: () => ({}) },
          timeline: {
            queryOptions: ({ input }: { input: { itemId: string } }) => ({
              queryKey: ["timeline", input.itemId],
            }),
          },
        },
        listMine: {
          queryOptions: () => ({ queryKey: ["seller-orders"] }),
        },
      },
    },
  },
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
  AlertDialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogDescription: () => null,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: () => null,
}));

vi.mock("@avin/ui/components/sheet", () => ({
  Sheet: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
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
  CaretRight: () => <span />,
  CheckCircle: () => <span />,
  ClipboardText: () => <span />,
  Clock: () => <span />,
  Funnel: () => <span />,
  MagnifyingGlass: () => <span />,
  PaperPlaneRight: () => <span />,
  Play: () => <span />,
  WarningCircle: () => <span />,
  XCircle: () => <span />,
}));

vi.mock("@/features/commerce/components/order-item-timeline", () => ({
  OrderItemTimeline: ({ timeline }: { timeline: OrderItemTimelineView }) => (
    <div data-testid={`timeline-${timeline.orderItemId}`}>Timeline</div>
  ),
}));

const baseItem = {
  customInputs: [
    { fieldKey: "profile_link", fieldType: "url", value: "https://buyer.test" },
  ],
  deliveredAt: null,
  deliveryReviewDeadlineAt: null,
  escrowHold: { amount: 150_000, id: "escrow-1", status: "HELD" as const },
  id: "item-1",
  listing: {
    slug: "social-service",
    thumbnailUrl: null,
    title: "Tăng tương tác mạng xã hội",
    type: "SERVICE" as const,
  },
  listingId: "listing-1",
  priceAmount: 150_000,
  processingDeadlineAt: "9999-12-31T00:00:00.000Z",
  processingTimeHours: 48,
  status: "AWAITING_SELLER" as const,
  warrantyExpiresAt: null,
  warrantyPolicy: { durationHours: 72, terms: "Sửa lỗi trong 72 giờ." },
};

const order: SellerOrderView = {
  buyerId: "buyer-1",
  checkoutId: "checkout-1",
  createdAt: "2026-08-03T00:00:00.000Z",
  currency: "VND",
  id: "order-1",
  items: [
    baseItem,
    {
      ...baseItem,
      customInputs: [],
      id: "item-2",
      listing: { ...baseItem.listing, title: "Thiết kế banner" },
      status: "IN_PROGRESS",
    },
  ],
  sellerId: "seller-1",
  totalAmount: 300_000,
};

const makeTimeline = (
  item: SellerOrderView["items"][number]
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

describe("StoreOrdersPanel", () => {
  beforeEach(() => {
    mocks.ordersQuery.data = [];
    mocks.ordersQuery.isError = false;
    mocks.ordersQuery.isPending = false;
    mocks.mutateAsync.mockResolvedValue(undefined);
    mocks.useMutation.mockReturnValue({
      isPending: false,
      mutateAsync: mocks.mutateAsync,
    });
    mocks.useQuery.mockImplementation((options: { queryKey: string[] }) =>
      options.queryKey[0] === "seller-orders"
        ? mocks.ordersQuery
        : {
            ...mocks.timelineQuery,
            data:
              order.items
                .map((item) =>
                  options.queryKey[1] === item.id ? makeTimeline(item) : null
                )
                .find(Boolean) ?? null,
          }
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders a seller empty state when there are no Orders", () => {
    render(<StoreOrdersPanel />);

    expect(
      screen.getByRole("heading", { name: "Đơn hàng" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Chưa có đơn hàng nào cần xử lý.")
    ).toBeInTheDocument();
  });

  it("renders fulfillment actions and the delivery evidence form per OrderItem", async () => {
    mocks.ordersQuery.data = [order];
    const user = userEvent.setup();

    render(<StoreOrdersPanel />);

    await user.click(screen.getByRole("button", { name: "Bàn giao" }));

    expect(screen.getByText("Gửi kết quả cho Buyer")).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText(
        "Mô tả kết quả, cách sử dụng hoặc bước tiếp theo..."
      ),
      "Đã hoàn thành công việc."
    );
    await user.type(
      screen.getByPlaceholderText("https://example.com/proof"),
      "https://example.com/proof"
    );
    await user.click(screen.getByRole("button", { name: "Gửi bàn giao" }));

    expect(mocks.mutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({
        deliveryNote: "Đã hoàn thành công việc.",
        files: [
          expect.objectContaining({
            contentType: "text/uri-list",
            storageKey: "https://example.com/proof",
          }),
        ],
        itemId: "item-2",
      })
    );
  });
});
