// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProviderApplicationForm } from "./provider-application-form";

const mockSaveDraft = vi.fn();
const mockSubmit = vi.fn();
const mockDepositIntent = {
  data: null as {
    amount: number;
    expiresAt: string;
    kind: string;
    paymentCode: string;
    qrUrl: string | null;
    status: string;
  } | null,
  isPending: false,
};

vi.mock("@better-upload/client", () => ({
  useUploadFile: () => ({
    isPending: false,
    progress: 0,
    reset: vi.fn(),
    uploadAsync: vi.fn(),
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../api/provider-api", () => ({
  useProviderApplicationActions: () => ({
    createDepositIntent: { isPending: false, mutateAsync: vi.fn() },
    saveDraft: { isPending: false, mutateAsync: mockSaveDraft },
    submit: { isPending: false, mutateAsync: mockSubmit },
  }),
  useProviderDepositIntent: () => mockDepositIntent,
  useProviderProfileRevisionActions: () => ({
    saveDraft: { isPending: false, mutateAsync: vi.fn() },
    start: { isPending: false, mutateAsync: vi.fn() },
    submit: { isPending: false, mutateAsync: vi.fn() },
  }),
}));

describe("ProviderApplicationForm", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockDepositIntent.data = null;
    mockDepositIntent.isPending = false;
  });

  it("renders the registration steps and identity fields", () => {
    render(<ProviderApplicationForm application={null} />);

    expect(
      screen.getByRole("tab", { name: "1. Thông tin & liên hệ" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "2. Quỹ đảm bảo & cam kết" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Đăng ký đối tác" })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Địa điểm (Tỉnh/Thành Phố) *")
    ).toBeInTheDocument();
  });

  it("updates live preview when user types their name", () => {
    render(<ProviderApplicationForm application={null} />);

    const nameInput = screen.getByLabelText(/Họ và tên/iu);
    fireEvent.change(nameInput, { target: { value: "Nguyễn Văn Bảo" } });

    expect(nameInput).toHaveValue("Nguyễn Văn Bảo");
  });

  it("pre-populates the default services draft template into the textarea", () => {
    render(<ProviderApplicationForm application={null} />);

    const servicesInput = screen.getByLabelText(
      /Dịch vụ cung cấp/iu
    ) as HTMLTextAreaElement;
    expect(servicesInput.value).toContain("Dịch vụ cung cấp của tôi");
  });

  it("fills the form with development-only sample data", () => {
    render(<ProviderApplicationForm application={null} />);

    const fillButton = screen.queryByRole("button", {
      name: "Điền dữ liệu mẫu",
    });

    if (!import.meta.env.DEV) {
      expect(fillButton).not.toBeInTheDocument();
      return;
    }

    expect(fillButton).toBeInTheDocument();
    if (!fillButton) {
      throw new Error("Development fill button should be rendered");
    }

    fireEvent.click(fillButton);

    expect(screen.getByLabelText(/Họ và tên/iu)).toHaveValue("Nguyễn Văn Dev");
    expect(screen.getByLabelText(/Căn cước công dân/iu)).toHaveValue(
      "079123456789"
    );
    expect(screen.getByLabelText("Địa điểm (Tỉnh/Thành Phố) *")).toHaveValue(
      "Quận 1, Thành phố Hồ Chí Minh"
    );
    expect(screen.getByLabelText(/Zalo/iu)).toHaveValue("0900000000");
    expect(screen.getByLabelText("Facebook")).toHaveValue(
      "https://www.facebook.com/vuduyhoanavin05"
    );

    fireEvent.click(
      screen.getByRole("tab", { name: "2. Quỹ đảm bảo & cam kết" })
    );

    expect(screen.getByLabelText("Tên chủ tài khoản")).toHaveValue(
      "NGUYEN VAN DEV"
    );
    expect(screen.getByLabelText("Số tài khoản")).toHaveValue("970412345678");
    expect(
      screen.getByRole("checkbox", { name: /đồng ý công khai/iu })
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /quy chế hoạt động đối tác/iu })
    ).toBeChecked();
  });

  it("links the policy commitment to the published partner policy", () => {
    render(<ProviderApplicationForm application={null} />);

    fireEvent.click(
      screen.getByRole("tab", { name: "2. Quỹ đảm bảo & cam kết" })
    );

    expect(
      screen.getByRole("link", {
        name: /Quy chế Hoạt động Đối tác Avin Check/iu,
      })
    ).toHaveAttribute("href", "/avin-check/partner-policy");
  });

  it("renders the avatar uploader with preview and file dropzone", () => {
    render(<ProviderApplicationForm application={null} />);

    expect(screen.getByText("Ảnh đại diện đối tác")).toBeInTheDocument();
    expect(screen.getByText("Xem trước")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Chọn ảnh đại diện đối tác")
    ).toBeInTheDocument();
  });

  it("shows only the payment panel when a pending application deposit exists", () => {
    mockDepositIntent.data = {
      amount: 1_000_000,
      expiresAt: "2026-08-25T12:00:00.000Z",
      kind: "APPLICATION",
      paymentCode: "AVIN-TEST-123",
      qrUrl: "https://example.com/qr.png",
      status: "PENDING",
    };

    render(<ProviderApplicationForm application={null} />);

    expect(
      screen.queryByRole("tab", { name: "2. Quỹ đảm bảo & cam kết" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Địa điểm (Tỉnh/Thành Phố) *")
    ).not.toBeInTheDocument();
    expect(
      screen.getByAltText("Mã QR chuyển khoản vào quỹ đảm bảo của Đối tác")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Chuyển khoản và chờ đối soát")
    ).toBeInTheDocument();
  });
});
