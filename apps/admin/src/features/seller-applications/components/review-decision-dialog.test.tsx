import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReviewDecisionDialog } from "./review-decision-dialog";

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

vi.mock("@avin/ui/components/label", () => ({
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock("@avin/ui/components/textarea", () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
}));

vi.mock("@avin/ui/components/spinner", () => ({
  Spinner: (props: React.ComponentProps<"svg">) => (
    <svg data-slot="spinner" data-testid="spinner" {...props} />
  ),
}));

describe("ReviewDecisionDialog", () => {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders approval dialog with confirm and cancel buttons", () => {
    const html = renderToStaticMarkup(
      <ReviewDecisionDialog
        decision="APPROVED"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
      />
    );

    expect(html).toContain("Phê duyệt hồ sơ đăng ký?");
    expect(html).toContain(
      "Seller có thể mở gian hàng và đăng bán sản phẩm sau khi phê duyệt."
    );
    expect(html).toContain(">Hủy</button>");
    expect(html).toContain(">Xác nhận</button>");
    expect(html).not.toContain('data-slot="spinner"');
  });

  it("renders spinner and disables buttons when isPending is true", () => {
    const html = renderToStaticMarkup(
      <ReviewDecisionDialog
        decision="APPROVED"
        isPending={true}
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
      />
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain('data-slot="spinner"');
    expect(html).toContain(">Hủy</button>");
    expect(html).toContain(">Xác nhận</button>");
  });

  it("renders changes requested dialog with reason field", () => {
    const html = renderToStaticMarkup(
      <ReviewDecisionDialog
        decision="CHANGES_REQUESTED"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
      />
    );

    expect(html).toContain("Yêu cầu chỉnh sửa thông tin");
    expect(html).toContain("Lý do (Bắt buộc)");
    expect(html).toContain("<textarea");
  });
});
