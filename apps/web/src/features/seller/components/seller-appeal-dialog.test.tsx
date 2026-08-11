import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SellerAppealDialog } from "./seller-appeal-dialog";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({
    isPending: false,
    mutateAsync: mocks.mutateAsync,
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

vi.mock("./seller-appeal-evidence-uploader", () => ({
  SellerAppealEvidenceUploader: () => <div data-testid="evidence-uploader" />,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/utils/orpc", () => ({
  orpc: {
    sellerEnforcement: {
      seller: {
        submitAppeal: {
          mutationOptions: () => ({}),
        },
      },
    },
  },
  queryClient: {
    invalidateQueries: vi.fn(),
  },
}));

describe("SellerAppealDialog", () => {
  const onOpenChange = vi.fn();

  beforeEach(() => {
    mocks.mutateAsync.mockResolvedValue({ id: "appeal_123" });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders dialog when open with action summary", () => {
    render(
      <SellerAppealDialog
        actionId="act_1"
        actionSummary={{
          newState: "SUSPENDED",
          reasonCode: "POLICY_VIOLATION",
          sellerReason: "Bàn giao chậm trễ nhiều đơn",
        }}
        onOpenChange={onOpenChange}
        open={true}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText("Gửi khiếu nại quyết định xử lý (Appeal)")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Lý do từ BQT: “Bàn giao chậm trễ nhiều đơn”")
    ).toBeInTheDocument();
    expect(screen.getByTestId("evidence-uploader")).toBeInTheDocument();
  });

  it("submits appeal with reason", async () => {
    render(
      <SellerAppealDialog
        actionId="act_1"
        actionSummary={{
          newState: "SUSPENDED",
          reasonCode: "POLICY_VIOLATION",
          sellerReason: "Bàn giao chậm trễ nhiều đơn",
        }}
        onOpenChange={onOpenChange}
        open={true}
      />
    );

    const textarea = screen.getByPlaceholderText(
      /Trình bày rõ ràng lý do bạn khiếu nại/iu
    );
    fireEvent.change(textarea, {
      target: { value: "Tôi đã bàn giao đầy đủ cho buyer qua hệ thống" },
    });

    const submitBtn = screen.getByRole("button", { name: "Gửi khiếu nại" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mocks.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          actionId: "act_1",
          evidence: [],
          sellerReason: "Tôi đã bàn giao đầy đủ cho buyer qua hệ thống",
        })
      );
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
