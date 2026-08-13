import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Seller } from "../types";
import { EnforcementDialog } from "./enforcement-dialog";

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useQuery: vi.fn(),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@avin/ui/components/dialog", () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <dialog open>{children}</dialog> : null,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@avin/ui/components/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    ...props
  }: {
    children: ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: "button" | "submit" | "reset";
  }) => (
    <button disabled={disabled} onClick={onClick} type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@avin/ui/components/checkbox", () => ({
  Checkbox: ({ checked, id }: { checked?: boolean; id?: string }) => (
    <input checked={checked} id={id} readOnly type="checkbox" />
  ),
}));

vi.mock("@avin/ui/components/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock("@avin/ui/components/label", () => ({
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock("@avin/ui/components/select", () => ({
  Select: ({ children, value }: { children: ReactNode; value?: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <div data-item-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children, id }: { children: ReactNode; id?: string }) => (
    <div id={id}>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
}));

vi.mock("@avin/ui/components/textarea", () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/lib/orpc", () => ({
  orpc: {
    sellerEnforcement: {
      admin: {
        apply: { mutationOptions: () => ({}) },
        lift: { mutationOptions: () => ({}) },
      },
    },
  },
}));

vi.mock("@/lib/query-client", () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

describe("EnforcementDialog", () => {
  const mockSeller: Seller = {
    activeListingsCount: 5,
    applicantName: "Nguyen Van B",
    averageRating: 4.5,
    completedOrdersCount: 20,
    email: "sellerb@avin.vn",
    enforcementHistory: [],
    enforcementStatus: "ACTIVE",
    id: "seller_123",
    joinedAt: "2026-01-01T00:00:00Z",
    phone: "0912345678",
    ratingCount: 10,
    storefrontName: "Shop Uy Tin",
    wallet: {
      availableBalanceVnd: 500_000,
      pendingEscrowBalanceVnd: 200_000,
    },
  };

  const onOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders suspension dialog with reason and expiration fields", () => {
    const html = renderToStaticMarkup(
      <EnforcementDialog
        onOpenChange={onOpenChange}
        open={true}
        seller={mockSeller}
        targetStatus="SUSPENDED"
      />
    );

    expect(html).toContain("Tạm dừng hoạt động gian hàng");
    expect(html).toContain("Thời hạn tạm dừng");
    expect(html).toContain(">Tạm dừng</button>");
  });

  it("renders ban dialog with 3 mandatory confirmation checkboxes", () => {
    const html = renderToStaticMarkup(
      <EnforcementDialog
        onOpenChange={onOpenChange}
        open={true}
        seller={mockSeller}
        targetStatus="BANNED"
      />
    );

    expect(html).toContain("Cấm vĩnh viễn gian hàng");
    expect(html).toContain("Xác nhận bắt buộc để cấm gian hàng");
    expect(html).toContain(
      "Xác nhận tự động hủy và hoàn tiền toàn bộ các sản phẩm trong đơn hàng chưa bàn giao."
    );
    expect(html).toContain(
      "Xác nhận đóng băng và tự động xử lý các khoản tiền tạm giữ tương ứng."
    );
    expect(html).toContain(
      "Xác nhận đóng băng các yêu cầu rút tiền đang chờ xử lý"
    );
    expect(html).toContain(">Cấm vĩnh viễn</button>");
  });

  it("renders lift dialog when target status is ACTIVE", () => {
    const html = renderToStaticMarkup(
      <EnforcementDialog
        onOpenChange={onOpenChange}
        open={true}
        seller={mockSeller}
        targetStatus="ACTIVE"
      />
    );

    expect(html).toContain("Khôi phục hoạt động gian hàng");
    expect(html).toContain(">Khôi phục</button>");
  });
});
